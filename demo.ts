import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand, RetrieveMemoryRecordsCommand } from '@aws-sdk/client-bedrock-agentcore'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch'
import { DisableRuleCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { GetFunctionConfigurationCommand, InvokeCommand, LambdaClient, UpdateFunctionConfigurationCommand, waitUntilFunctionUpdatedV2 } from '@aws-sdk/client-lambda'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { parseArgs } from 'node:util'
import { z } from 'zod'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    profile: { type: 'string' },
    region: { type: 'string' },
    prefix: { type: 'string', default: 'haunted' },
    help: { type: 'boolean', short: 'h' },
  },
})
if (values.help || positionals.length === 0) {
  console.log(`npm run demo -- [--profile PROFILE] [--region REGION] [--prefix haunted] COMMAND

start-traffic   Send one immediate burst of 20 concurrent checkout requests
stop-traffic
haunt          Apply the checkout fault, then send the 20-request burst
reset
status
ask INCIDENT_UUID "Question"
resolve INCIDENT_UUID "Confirmed resolution"
memories "Search query"

ask and resolve return ACCEPTED; follow their results in AgentCore observability.
Wait for completion before sending another request to the same incident session.`)
  process.exit(0)
}
const command = z.enum(['start-traffic', 'stop-traffic', 'haunt', 'reset', 'status', 'ask', 'resolve', 'memories']).parse(positionals[0])
const args = positionals.slice(1)
if (command === 'ask' || command === 'resolve') z.tuple([z.string().guid(), z.string().min(1)]).parse(args)
else if (command === 'memories') z.tuple([z.string().min(1)]).parse(args)
else z.tuple([]).parse(args)

const config = { region: values.region, credentials: fromNodeProviderChain({ profile: values.profile }) }
const cloudformation = new CloudFormationClient(config)
async function outputs(stack: string) {
  const result = await cloudformation.send(new DescribeStacksCommand({ StackName: `${values.prefix}-${stack}` }))
  return Object.fromEntries(result.Stacks![0].Outputs!.map(output => [output.OutputKey!, output.OutputValue!]))
}
const application = await outputs('app')

async function sendTraffic() {
  const events = new EventBridgeClient(config)
  await events.send(new DisableRuleCommand({ Name: application.TrafficRule }))
  const client = new LambdaClient(config)
  const response = await client.send(new InvokeCommand({
    FunctionName: application.TrafficFunction, Payload: Buffer.from('{}'),
  }))
  if (response.FunctionError) throw new Error(new TextDecoder().decode(response.Payload))
  console.log(new TextDecoder().decode(response.Payload))
}

if (command === 'start-traffic' || command === 'stop-traffic') {
  if (command === 'start-traffic') {
    await sendTraffic()
  } else {
    const events = new EventBridgeClient(config)
    await events.send(new DisableRuleCommand({ Name: application.TrafficRule }))
    console.log(command)
  }
} else if (command === 'haunt' || command === 'reset') {
  const client = new LambdaClient(config)
  const input = { FunctionName: application.FunctionName }
  const current = await client.send(new GetFunctionConfigurationCommand(input))
  const variables = { ...current.Environment?.Variables, TABLE_NAME: application.TableName + (command === 'haunt' ? '-missing' : '') }
  await client.send(new UpdateFunctionConfigurationCommand({ ...input, Environment: { Variables: variables } }))
  await waitUntilFunctionUpdatedV2({ client, maxWaitTime: 120 }, input)
  console.log(JSON.stringify({ function: application.FunctionName, table: variables.TABLE_NAME }, null, 2))
  if (command === 'haunt') await sendTraffic()
} else if (command === 'status') {
  const monitoring = await outputs('monitoring')
  const result = await new CloudWatchClient(config).send(new DescribeAlarmsCommand({ AlarmNames: [monitoring.AlarmName] }))
  const alarm = result.MetricAlarms![0]
  console.log(JSON.stringify({ alarm: alarm.AlarmName, state: alarm.StateValue, reason: alarm.StateReason, changed: alarm.StateUpdatedTimestamp }, null, 2))
} else {
  const agents = await outputs('agents')
  const client = new BedrockAgentCoreClient({
    ...config, maxAttempts: 1,
    requestHandler: new NodeHttpHandler({ requestTimeout: 900_000 }),
  })
  if (command === 'memories') {
    for (const [category, namespace] of [
      ['episodes', `/services/${agents.ServiceId}/episodes/`],
      ['service_memory', `/services/${agents.ServiceId}/`],
    ]) {
      const result = await client.send(new RetrieveMemoryRecordsCommand({
        memoryId: agents.MemoryId, namespace,
        searchCriteria: { searchQuery: args[0], topK: 5 },
      }))
      console.log(JSON.stringify({ category, records: result.memoryRecordSummaries }, null, 2))
    }
  } else {
    const [incidentId, text] = args
    const result = await client.send(new InvokeAgentRuntimeCommand({
      agentRuntimeArn: agents.RuntimeArn,
      runtimeSessionId: `incident-${incidentId}`,
      contentType: 'application/json',
      payload: Buffer.from(JSON.stringify({
        incident_id: incidentId,
        prompt: command === 'resolve'
          ? `The engineer reports this confirmed resolution: ${text}. Record the action and verification as a lesson for future incidents.`
          : text,
        notify: false,
      })),
    }))
    console.log(await result.response!.transformToString())
  }
}
