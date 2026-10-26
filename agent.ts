import { Sha256 } from '@aws-crypto/sha256-js'
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { fromNodeProviderChain, fromTemporaryCredentials } from '@aws-sdk/credential-providers'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { context, propagation } from '@opentelemetry/api'
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer'
import { envDetector, resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { HttpRequest } from '@smithy/protocol-http'
import { SignatureV4 } from '@smithy/signature-v4'
import { createHarness } from '@strands-agents/harness'
import { BeforeToolCallEvent, McpClient, SessionManager } from '@strands-agents/sdk'
import { S3Storage } from '@strands-agents/sdk/storage'
import { CodeInterpreterTools } from 'bedrock-agentcore/experimental/code-interpreter/strands'
import { AgentCoreMemoryStore } from 'bedrock-agentcore/memory/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

process.chdir(dirname(fileURLToPath(import.meta.url)))
const env = process.env
const region = env.AWS_REGION!
const secrets = new SecretsManagerClient({ region })
const http = new NodeHttpHandler()
const requestSchema = z.object({
  incident_id: z.string().guid(),
  prompt: z.string(),
  background: z.boolean().default(false),
  notify: z.boolean().default(true),
})
type Incident = z.infer<typeof requestSchema>

const investigationSigner = new SignatureV4({
  service: 'aws-mcp', region, sha256: Sha256,
  credentials: fromTemporaryCredentials({
    clientConfig: { region },
    params: { RoleArn: env.INVESTIGATION_ROLE_ARN!, RoleSessionName: 'haunted-investigation' },
  }),
})

async function signedAwsFetch(signer: SignatureV4, input: string | URL | Request, init?: RequestInit) {
  const request = new Request(input, init)
  const url = new URL(request.url)
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : new Uint8Array(await request.arrayBuffer())
  const signed = await signer.sign(new HttpRequest({
    protocol: url.protocol, hostname: url.hostname, path: url.pathname,
    method: request.method, headers: { ...Object.fromEntries(request.headers), host: url.host }, body,
  }))
  return fetch(request.url, { method: request.method, headers: signed.headers, body, signal: request.signal })
}

const traceSigner = new SignatureV4({
  service: 'xray', region, sha256: Sha256, credentials: fromNodeProviderChain(),
})
const telemetry = new NodeTracerProvider({
  resource: resourceFromAttributes({
    ...envDetector.detect().attributes,
    'service.name': env.OTEL_SERVICE_NAME!,
    'deployment.environment.name': 'haunted-demo',
  }),
  spanProcessors: [new BatchSpanProcessor({
    export: (spans, done) => {
      void signedAwsFetch(traceSigner, `https://xray.${region}.amazonaws.com/v1/traces`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-protobuf' },
        body: Buffer.from(ProtobufTraceSerializer.serializeRequest(spans)!),
      }).then(async response => {
        if (!response.ok) throw new Error(`Trace export: ${response.status} ${await response.text()}`)
        for (const span of spans.filter(span => span.name === 'invoke_agent haunted-investigator')) {
          console.log(JSON.stringify({
            incident_id: span.attributes['incident.id'], stage: 'trace_exported', trace_id: span.spanContext().traceId,
          }))
        }
        done({ code: 0 })
      }).catch(error => { console.error(error); done({ code: 1, error }) })
    },
    shutdown: async () => {},
  })],
})
telemetry.register()

async function postReportToSlack(incidentId: string, report: string) {
  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: env.SLACK_SECRET_ARN! }))
  const slack = JSON.parse(secret.SecretString!)
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${slack.bot_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: slack.channel_id,
      text: `👻 <@${slack.oncall_user_id}> Incident \`${incidentId}\`\n\n${report}`,
      unfurl_links: false, unfurl_media: false,
    }),
  })
  const result = await response.json() as { ok: boolean; error?: string; ts?: string }
  if (!result.ok) throw new Error(`Slack: ${result.error}`)
  console.log(JSON.stringify({ incident_id: incidentId, stage: 'slack_posted', ts: result.ts }))
}

async function investigate(incident: Incident) {
  const incidentId = incident.incident_id
  console.log(JSON.stringify({ incident_id: incidentId, stage: 'investigating' }))
  const aws = new McpClient({
    disableMcpInstrumentation: true,
    transport: new StreamableHTTPClientTransport(new URL(`https://aws-mcp.${region}.api.aws/mcp`), {
      fetch: (input, init) => signedAwsFetch(investigationSigner, input, init),
    }),
  })
  const interpreter = new CodeInterpreterTools({
    region, identifier: env.CODE_INTERPRETER_ID!,
    clientConfig: {
      requestHandler: {
        handle: (request: HttpRequest, options?: Parameters<NodeHttpHandler['handle']>[1]) => {
          propagation.inject(context.active(), request.headers)
          return http.handle(request, options)
        },
      },
    },
  })
  const storage = new S3Storage(env.SESSION_BUCKET!, { prefix: `sessions/${incidentId}`, region })
  const memory = new AgentCoreMemoryStore({
    memoryId: env.MEMORY_ID!, actorId: env.SERVICE_ID!, sessionId: incidentId,
    namespacePath: '/services/{actorId}/', name: 'incident_history',
    writable: true, extraction: true, region,
  })
  try {
    await interpreter.startSession(incidentId)
    await using agent = await createHarness({
      model: env.MODEL_ID!,
      name: 'haunted-investigator',
      traceAttributes: { 'session.id': incidentId, 'incident.id': incidentId },
      instructions: [
        `Investigate ${env.SERVICE_ID} in ${region}. Incident: ${incidentId}.`,
        `Lambda: ${env.APP_FUNCTION}. Log group: ${env.APP_LOG_GROUP}.`,
        `Expected DynamoDB table: ${env.APP_TABLE}. Stack: ${env.APP_STACK}.`,
        `Host runbook directory: ${process.cwd()}/.agent/skills/checkout-investigation. Use read with absolute paths there; Code Interpreter has a separate filesystem.`,
        'Load checkout-investigation before working. Use AWS Toolkit to collect AWS evidence.',
        'Run generated analysis code and shell commands in Code Interpreter. Return Slack mrkdwn.',
      ].join(' '),
      builtinTools: ['read'],
      tools: [aws, ...interpreter.tools],
      memory: { stores: [memory] },
      session: new SessionManager({ sessionId: incidentId, storage }),
      storage,
    })
    agent.addHook(BeforeToolCallEvent, ({ toolUse }) => {
      console.log(JSON.stringify({
        incident_id: incidentId, stage: 'tool', tool: toolUse.name,
      }))
    })
    const report = String(await agent.invoke(incident.prompt))
    if (incident.notify) await postReportToSlack(incidentId, report)
    console.log(JSON.stringify({ incident_id: incidentId, stage: 'completed' }))
    return { incident_id: incidentId, report }
  } finally {
    await interpreter.stopSession()
    await telemetry.forceFlush()
  }
}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async (incident) => {
      if (incident.background) {
        const task = app.addAsyncTask('investigation', { incident_id: incident.incident_id })
        void investigate(incident).catch(console.error).finally(() => app.completeAsyncTask(task))
        return { incident_id: incident.incident_id, status: 'ACCEPTED' }
      }
      return investigate(incident)
    },
  },
})

app.run()
