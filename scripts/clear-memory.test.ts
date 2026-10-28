import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import { BedrockAgentCoreClient } from '@aws-sdk/client-bedrock-agentcore'
import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import { S3Client } from '@aws-sdk/client-s3'
import { clearMemory } from './clear-memory.js'

function fixture(t: TestContext, options: {
  missingOutput?: boolean; deleteError?: string; s3Error?: boolean; neverEmpty?: boolean
} = {}) {
  const clients = {
    cloudformation: new CloudFormationClient({ region: 'us-east-1' }),
    memory: new BedrockAgentCoreClient({ region: 'us-east-1' }),
    s3: new S3Client({ region: 'us-east-1' }),
  }
  const calls: { name: string; input: any }[] = []
  let scan = 0
  const handle = async (command: any) => {
    const name = command.constructor.name
    const input = structuredClone(command.input)
    calls.push({ name, input })
    if (name === 'DescribeStacksCommand') return { Stacks: [{ Outputs: Object.entries({
      MemoryId: 'memory-test', ServiceId: 'test_checkout',
      ...(options.missingOutput ? {} : { SessionBucket: 'test-sessions' }),
    }).map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue })) }] }
    if (name === 'ListSessionsCommand') {
      if (!input.nextToken) scan++
      if (scan > 1) return {}
      return input.nextToken ? { sessionSummaries: [{ sessionId: 'session-2' }] }
        : { sessionSummaries: [{ sessionId: 'session-1' }], nextToken: 'next-session' }
    }
    if (name === 'ListEventsCommand') return input.nextToken
      ? { events: [{ eventId: `${input.sessionId}-event-2` }] }
      : { events: [{ eventId: `${input.sessionId}-event-1` }], nextToken: 'next-event' }
    if (name === 'ListMemoryRecordsCommand') {
      if (scan > 2 && !options.neverEmpty) return {}
      const record = { memoryRecordId: 'record-1', namespaces: ['/services/test_checkout/episodes/'] }
      return input.nextToken ? { memoryRecordSummaries: [record] }
        : { memoryRecordSummaries: [record], nextToken: 'next-record' }
    }
    if (name === 'ListObjectsV2Command') {
      assert.equal(input.Prefix, 'sessions/')
      if (scan > 1) return {}
      return input.ContinuationToken
        ? { Contents: [{ Key: 'sessions/last' }] }
        : { Contents: Array.from({ length: 1000 }, (_, i) => ({ Key: `sessions/${i}` })), NextContinuationToken: 'next-object' }
    }
    if (name === 'DeleteMemoryRecordCommand' && options.deleteError) {
      throw Object.assign(new Error(options.deleteError), { name: options.deleteError })
    }
    if (name === 'DeleteObjectsCommand' && options.s3Error) return { Errors: [{ Code: 'AccessDenied' }] }
    if (name === 'RetrieveMemoryRecordsCommand' && (scan === 2 || options.neverEmpty)) {
      return { memoryRecordSummaries: [{ memoryRecordId: 'record-1' }] }
    }
    return {}
  }
  for (const client of Object.values(clients)) t.mock.method(client, 'send', handle)
  return { clients, calls }
}

test('clears paginated events, deduplicated records and batched session objects; waits for index propagation', async t => {
  const { clients, calls } = fixture(t)
  await clearMemory(clients, 'test-agents', { pollMs: 0, timeoutMs: 1000 })
  assert.equal(calls.filter(c => c.name === 'DeleteEventCommand').length, 4)
  const records = calls.filter(c => c.name === 'DeleteMemoryRecordCommand')
  assert.equal(records.length, 1)
  assert.equal(records[0].input.namespace, '/services/test_checkout/episodes/')
  assert.deepEqual(calls.filter(c => c.name === 'DeleteObjectsCommand').map(c => c.input.Delete.Objects.length), [1000, 1])
  const lastDeleteEvent = calls.map(c => c.name).lastIndexOf('DeleteEventCommand')
  assert.ok(lastDeleteEvent < calls.findIndex(c => c.name === 'DeleteMemoryRecordCommand'))
  assert.equal(calls.filter(c => c.name === 'RetrieveMemoryRecordsCommand').length, 4)
})

test('missing stack outputs fail before deletion', async t => {
  const { clients, calls } = fixture(t, { missingOutput: true })
  await assert.rejects(clearMemory(clients, 'test-agents'))
  assert.equal(calls.length, 1)
})

test('already deleted memory records are tolerated', async t => {
  const { clients } = fixture(t, { deleteError: 'ResourceNotFoundException' })
  await clearMemory(clients, 'test-agents', { pollMs: 0, timeoutMs: 1000 })
})

test('permission errors are surfaced', async t => {
  const { clients } = fixture(t, { deleteError: 'AccessDeniedException' })
  await assert.rejects(clearMemory(clients, 'test-agents'), /AccessDeniedException/)
})

test('partial S3 deletion errors fail the command', async t => {
  const { clients } = fixture(t, { s3Error: true })
  await assert.rejects(clearMemory(clients, 'test-agents'), /S3 deletion failed/)
})

test('remaining data causes a timeout instead of a success message', async t => {
  const { clients } = fixture(t, { neverEmpty: true })
  await assert.rejects(clearMemory(clients, 'test-agents', { pollMs: 0, timeoutMs: 0 }), /Memory is not empty/)
})
