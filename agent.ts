import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { createHarness } from '@strands-agents/harness'
import { SessionManager } from '@strands-agents/sdk'
import { S3Storage } from '@strands-agents/sdk/storage'
import { AgentCoreMemoryStore } from 'bedrock-agentcore/memory/strands'
import { BedrockAgentCoreApp } from 'bedrock-agentcore/runtime'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createAwsMcp } from './support/aws.js'

process.chdir(dirname(fileURLToPath(import.meta.url)))
const env = process.env
const region = env.AWS_REGION!
const secrets = new SecretsManagerClient({ region })
const requestSchema = z.object({
  incident_id: z.string().guid(),
  prompt: z.string(),
  notify: z.boolean().default(true),
})
type Incident = z.infer<typeof requestSchema>

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
  const aws = createAwsMcp({ region, roleArn: env.INVESTIGATION_ROLE_ARN! })

  const storage = new S3Storage(env.SESSION_BUCKET!, { prefix: `sessions/${incidentId}`, region })

  const memory = new AgentCoreMemoryStore({
    memoryId: env.MEMORY_ID!, actorId: env.SERVICE_ID!, sessionId: incidentId,
    namespacePath: '/services/{actorId}/', name: 'incident_history',
    writable: true, extraction: true, region,
  })

  await using agent = await createHarness({
    model: env.MODEL_ID!,
    name: 'haunted-investigator',
    instructions: [
      `Investigate ${env.SERVICE_ID} in ${region}. Incident: ${incidentId}.`,
      `Lambda: ${env.APP_FUNCTION}. Log group: ${env.APP_LOG_GROUP}.`,
      `Application stack: ${env.APP_STACK}.`,
      `Host runbook directory: ${process.cwd()}/.agent/skills/checkout-investigation. Use read with absolute paths there.`,
      'Load checkout-investigation before working. Use AWS Toolkit to collect AWS evidence.',
      'Use AWS MCP for remote investigation scripts and analysis. Return Slack mrkdwn.',
    ].join(' '),
    builtinTools: ['read'],
    tools: [aws],
    memory: { stores: [memory] },
    session: new SessionManager({ sessionId: incidentId, storage }),
    storage,
  })

  const report = String(await agent.invoke(incident.prompt))

  if (incident.notify) await postReportToSlack(incidentId, report)
  console.log(JSON.stringify({ incident_id: incidentId, stage: 'completed' }))
  return { incident_id: incidentId, report }

}

const app = new BedrockAgentCoreApp({
  invocationHandler: {
    requestSchema,
    process: async (incident) => {
      const task = app.addAsyncTask('investigation', { incident_id: incident.incident_id })
      void investigate(incident).catch(console.error).finally(() => app.completeAsyncTask(task))
      return { incident_id: incident.incident_id, status: 'ACCEPTED' }
    },
  },
})

app.run()
