import {
  BedrockAgentCoreClient, DeleteEventCommand, DeleteMemoryRecordCommand,
  paginateListEvents, paginateListMemoryRecords, paginateListSessions, paginateRetrieveMemoryRecords,
} from '@aws-sdk/client-bedrock-agentcore'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { DeleteObjectsCommand, paginateListObjectsV2, S3Client } from '@aws-sdk/client-s3'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { setTimeout } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { z } from 'zod'

export async function clearMemory(
  clients: { cloudformation: CloudFormationClient; memory: BedrockAgentCoreClient; s3: S3Client },
  stackName: string,
  { pollMs = 10_000, timeoutMs = 300_000 } = {},
) {
  const { cloudformation, memory, s3 } = clients
  const stack = await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
  const { MemoryId: memoryId, ServiceId: actorId, SessionBucket: Bucket } = z.object({
    MemoryId: z.string().min(1), ServiceId: z.string().min(1), SessionBucket: z.string().min(1),
  }).parse(Object.fromEntries((stack.Stacks?.[0]?.Outputs ?? []).map(o => [o.OutputKey, o.OutputValue])))
  const namespace = `/services/${actorId}/`
  console.log(JSON.stringify({ stack: stackName, memoryId, actorId, bucket: Bucket, prefix: 'sessions/' }))

  async function inventory() {
    const events: { sessionId: string; eventId: string }[] = []
    for await (const page of paginateListSessions({ client: memory }, { memoryId, actorId })) {
      for (const session of page.sessionSummaries ?? []) {
        for await (const page of paginateListEvents({ client: memory }, { memoryId, actorId, sessionId: session.sessionId! })) {
          for (const event of page.events ?? []) events.push({ sessionId: session.sessionId!, eventId: event.eventId! })
        }
      }
    }
    const records = new Map<string, string>()
    for await (const page of paginateListMemoryRecords({ client: memory }, { memoryId, namespace })) {
      for (const record of page.memoryRecordSummaries ?? []) {
        const exactNamespace = record.namespaces?.find(n => n.startsWith(namespace))
        if (!record.memoryRecordId || !exactNamespace) throw new Error('Memory record is missing its ID or service namespace')
        records.set(record.memoryRecordId, exactNamespace)
      }
    }
    const objects: { Key: string }[] = []
    for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket, Prefix: 'sessions/' })) {
      for (const object of page.Contents ?? []) if (object.Key) objects.push({ Key: object.Key })
    }
    return { events, records, objects }
  }

  const before = await inventory()
  for (const event of before.events) {
    try {
      await memory.send(new DeleteEventCommand({ memoryId, actorId, ...event }))
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'ResourceNotFoundException') throw error
    }
  }
  for (const [memoryRecordId, namespace] of before.records) {
    try {
      await memory.send(new DeleteMemoryRecordCommand({ memoryId, memoryRecordId, namespace }))
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'ResourceNotFoundException') throw error
    }
  }
  for (let i = 0; i < before.objects.length; i += 1000) {
    const result = await s3.send(new DeleteObjectsCommand({
      Bucket, Delete: { Objects: before.objects.slice(i, i + 1000), Quiet: true },
    }))
    if (result.Errors?.length) throw new Error(`S3 deletion failed: ${JSON.stringify(result.Errors)}`)
  }
  console.log(JSON.stringify({
    deletionRequested: { events: before.events.length, records: before.records.size, sessionObjects: before.objects.length },
  }))

  const deadline = Date.now() + timeoutMs
  while (true) {
    const remaining = await inventory()
    let retrievalMatches = 0
    for (const searchNamespace of [namespace, `${namespace}episodes/`]) {
      for await (const page of paginateRetrieveMemoryRecords({ client: memory }, {
        memoryId, namespace: searchNamespace,
        searchCriteria: { searchQuery: 'Previous incidents, investigations, resolutions and lessons learned', topK: 10 },
      })) retrievalMatches += page.memoryRecordSummaries?.length ?? 0
    }
    const counts = {
      events: remaining.events.length, records: remaining.records.size,
      sessionObjects: remaining.objects.length, retrievalMatches,
    }
    console.log(JSON.stringify({ remaining: counts }))
    if (Object.values(counts).every(n => n === 0)) {
      console.log('Memory is empty. Start the next test with a new incident.')
      return
    }
    if (Date.now() >= deadline) throw new Error('Memory is not empty after waiting five minutes. Check for active investigations or pending extraction, then rerun.')
    await setTimeout(Math.min(pollMs, Math.max(0, deadline - Date.now())))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      profile: { type: 'string' }, region: { type: 'string' },
      prefix: { type: 'string', default: 'haunted' }, help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    console.log(`npm run clear-memory -- [--profile PROFILE] [--region REGION] [--prefix haunted]

Deletes this demo's AgentCore lessons, source events, and S3 sessions.
Wait for investigations to finish first. Uses your normal AWS credentials.
Waits up to five minutes for listings and retrieval to become empty.
Does not reset the application, send traffic, or trigger an investigation.`)
  } else {
    const config = { region: values.region, credentials: fromNodeProviderChain({ profile: values.profile }) }
    await clearMemory({
      cloudformation: new CloudFormationClient(config),
      memory: new BedrockAgentCoreClient(config),
      s3: new S3Client(config),
    }, `${values.prefix}-agents`)
  }
}
