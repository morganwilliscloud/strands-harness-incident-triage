# Inspect your Trick or Trace investigation

Use your own deployment's outputs and incident IDs. The examples below contain no saved runtime identifiers or rehearsal trace IDs.

## Enable tracing before the first incident

1. Select the same AWS account and region used for deployment.
2. Open **CloudWatch → Application Signals → Transaction Search** and choose **Enable**. Complete the console's X-Ray/CloudWatch permissions setup. AgentCore observability may also show an enablement banner.
3. Choose a span indexing percentage. For a short, low-volume demo, 100% makes every exported investigation available for trace search; it increases indexed telemetry and charges. This is an account-level setting, not part of the sample's CloudFormation stacks.
4. Deploy the current agent template, which creates Runtime trace delivery and enables AWS ADOT instrumentation in the agent process.

Follow the [official Transaction Search setup](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html) if your console labels differ. Missing permissions or account-level setup must be resolved before the complete trace view works. Enabling indexing later cannot recreate agent spans that were never exported.

## Discover your runtime and log groups

In a new terminal, set your configured profile, region, and prefix as in the root README:

```bash
export AWS_PROFILE=default
export AWS_REGION=us-east-1
export DEMO_PREFIX=haunted

RUNTIME_ARN=$(aws cloudformation describe-stacks \
  --stack-name "$DEMO_PREFIX-agents" \
  --query 'Stacks[0].Outputs[?OutputKey==`RuntimeArn`].OutputValue | [0]' \
  --output text)
RUNTIME_ID="${RUNTIME_ARN##*/}"
RUNTIME_LOG_GROUP="/aws/bedrock-agentcore/runtimes/${RUNTIME_ID}-DEFAULT"

APP_LOG_GROUP=$(aws cloudformation describe-stacks \
  --stack-name "$DEMO_PREFIX-app" \
  --query 'Stacks[0].Outputs[?OutputKey==`LogGroup`].OutputValue | [0]' \
  --output text)

INTAKE_ARN=$(aws cloudformation describe-stacks \
  --stack-name "$DEMO_PREFIX-agents" \
  --query 'Stacks[0].Outputs[?OutputKey==`IntakeArn`].OutputValue | [0]' \
  --output text)
INTAKE_FUNCTION="${INTAKE_ARN##*:}"

printf 'Runtime logs: %s\nApplication logs: %s\nIntake logs: /aws/lambda/%s\n' \
  "$RUNTIME_LOG_GROUP" "$APP_LOG_GROUP" "$INTAKE_FUNCTION"
```

These values also appear in **CloudFormation → your stack → Outputs**. A runtime log group may not appear until its first invocation.

## Open an investigation

In **Amazon Bedrock AgentCore → Observability**, select your region and a time range covering the incident, such as **Last 30 minutes**. Select `${DEMO_PREFIX}_investigator` and open the session `incident-<incident UUID>`. Obtain the UUID from the Slack report or the `incident_id` field in runtime logs. Allow a few minutes for searchable ingestion.

| Span | What to inspect |
|---|---|
| `AgentCore.Runtime.Invoke` | Hosted request and session context. |
| `invoke_agent haunted-investigator` | Agent input/output, status, and duration. The agent span name is fixed in source. |
| `chat` | Model messages and inference details. |
| `execute_tool aws___run_script` | Generated script, returned evidence, execution status, and nested AWS `api_calls`. |

Tool arguments/results appear in `gen_ai.tool.call.arguments` and `gen_ai.tool.call.result`. A returned envelope with `isError: false` does not prove every operation in the script succeeded. Read the execution result and individual API outcomes.

The client connects to a remote AWS MCP server over signed Streamable HTTP. These spans show what the agent sent and received; they do not reveal AWS MCP's internal managed sandbox trace. The current sample does not create an AgentCore Code Interpreter session.

## Query a trace directly

In **CloudWatch → Logs Insights**, select the `aws/spans` log group. Replace `INCIDENT_UUID` with your own incident UUID and select the correct time range:

```text
fields @timestamp, name, traceId, spanId, parentSpanId
| filter @message like /INCIDENT_UUID/
| sort @timestamp asc
```

Copy a trace ID from the result. To include service spans that do not carry the incident/session label:

```text
fields @timestamp, name, spanId, parentSpanId, @message
| filter traceId = "TRACE_ID"
| sort @timestamp asc
```

## Read logs and diagnose dispatch failures

```bash
aws logs tail "$RUNTIME_LOG_GROUP" --since 15m --follow
```

Expect `investigating`, then `slack_posted` and `completed` for a successful alarm-triggered report. Press **Ctrl+C** to stop viewing. `ACCEPTED` acknowledges asynchronous dispatch; it does not establish successful investigation or Slack delivery. CLI-only `ask`/`resolve` requests suppress Slack, so they do not produce `slack_posted`.

To inspect checkout and intake errors:

```bash
aws logs tail "$APP_LOG_GROUP" --since 15m
aws logs tail "/aws/lambda/$INTAKE_FUNCTION" --since 15m

aws cloudformation describe-stacks --stack-name "$DEMO_PREFIX-agents" \
  --query 'Stacks[0].Outputs[?OutputKey==`FailureQueueUrl`].OutputValue | [0]' \
  --output text
```

The failure queue records exhausted asynchronous intake dispatch failures. Investigation failures after Runtime has returned `ACCEPTED` are visible in Runtime logs; intake retry settings do not rerun those investigations automatically.

## If only service spans appear

- Verify the deployment's runtime revision and the `DEFAULT` endpoint's live revision.
- Confirm Transaction Search is enabled, the time range includes the event, and indexing is configured for the detail you want.
- Confirm the Runtime environment contains `OTEL_TRACES_SAMPLER=always_on`. For this low-volume demo it records child agent/model/tool spans even if an incoming request is marked unsampled. A parent-based sampler can otherwise leave only service-level spans visible.
- Confirm `NODE_OPTIONS` preloads `observability.cjs`, `AGENT_OBSERVABILITY_ENABLED=true`, and the stack's trace-delivery resources succeeded.
- Check startup errors in Runtime logs. Search the entire trace by `traceId` if service spans lack the incident label.

## How the sample exports traces

`observability.cjs` loads AWS ADOT before the agent imports its dependencies, then sets `OTEL_TRACES_EXPORTER=none` for harness. ADOT reads the original `otlp` value while initializing its exporter; the subsequent change prevents harness from registering a duplicate provider. It does not shut down ADOT.

The template enables HTTP, AWS SDK, and Undici instrumentation, X-Ray/W3C context propagation, GenAI input/output attributes, and Runtime trace delivery. The agent uses Strands' native agent/model/tool spans. There is no custom exporter or hand-written agent span.

The `disableMcpInstrumentation: true` option in the MCP client prevents the pinned SDK from injecting `_meta` into AWS MCP tool arguments. The agent's own MCP tool spans remain available.

Logs and traces can contain prompts, generated scripts, retrieved data, and reports. Grant access accordingly. The Slack token is read by the application's posting function and is not supplied as a model/tool argument.

## References

- [CloudWatch Transaction Search setup](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Enable-TransactionSearch.html)
- [AgentCore observability configuration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
- [AWS ADOT JavaScript GenAI configuration](https://github.com/aws-observability/aws-otel-js-instrumentation#generative-ai)
- [Validation history](../VALIDATION.md)
