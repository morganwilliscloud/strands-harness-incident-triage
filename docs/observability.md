# See what the investigator did

Open [AgentCore observability](https://console.aws.amazon.com/bedrock-agentcore/observability?region=us-east-1) in the demo account, select us-east-1, and set the time range to include your invocation. The agent service is `haunted_investigator`; the agent span is `invoke_agent haunted-investigator`.

CloudWatch Transaction Search provides the trace waterfall. Agent spans include `session.id` and `incident.id`, both set to the incident UUID. Runtime logs print a `trace_exported` record with the trace ID after the agent span is accepted by the exporter. Allow a few minutes for searchable ingestion.

## What to open

| Span | What it shows |
|---|---|
| `invoke_agent haunted-investigator` | Agent input/output and duration |
| `chat` | Model messages and inference details |
| `execute_tool aws___run_script` | Requested AWS script and returned evidence, including API-call outcomes |
| `execute_tool executeCode` | Generated Python and returned output |
| `execute_tool executeCommand` | Shell command executed in Code Interpreter and its output |
| `execute_tool fileOperations` | File operation and result |
| `AgentCore.BuiltinTools.InvokeCodeInterpreter` | Linked Code Interpreter service operation, request ID, session ID, and status |

Tool spans expose `gen_ai.tool.call.arguments` and `gen_ai.tool.call.result`. Tool success alone does not prove every nested AWS operation succeeded: inspect the returned MCP execution status and `api_calls`.

For a direct lookup, select the `aws/spans` log group in CloudWatch Logs Insights:

```text
fields @timestamp, name, traceId, spanId, parentSpanId
| filter @message like /INCIDENT_UUID/
| sort @timestamp asc
```

Copy a `traceId`, then query the entire trace. Interpreter service spans have the same trace ID but do not carry the incident attribute:

```text
fields @timestamp, name, spanId, parentSpanId, @message
| filter traceId = "TRACE_ID"
| sort @timestamp asc
```

Code Interpreter application logs are in `/aws/vendedlogs/bedrock-agentcore/haunted/code-interpreter` with 14-day retention. They include request payloads and identifiers for correlation. The code's returned stdout/results are also captured in the agent tool span. Runtime console logs are in `/aws/bedrock-agentcore/runtimes/haunted_investigator-TQ1U0Z6CxF-DEFAULT` for this deployment.

## Verified rehearsal to explore

Set the time range to October 26, 2026, 18:31–18:34 UTC (2:31–2:34 p.m. Eastern). Trace `44afb4c603fc61b482396b8a40660f83`, incident `46db98ee-8d9d-4087-9f14-8c0ed153111c`, contains a real AWS MCP configuration read and all three interpreter tools. The error-rate calculation uses a clearly labeled synthetic fixture. It is not an actual outage.

## How it is configured

`agent.ts` calls `setupTelemetry()` from `support/telemetry.ts`, which registers an OpenTelemetry provider. The same module exports the traced Code Interpreter request handler; signing is shared through `support/aws.ts`. Strands supplies the agent/model/tool spans. A small application exporter serializes OTLP protobuf and signs requests to the regional X-Ray OTLP endpoint using the Runtime role. `xray:PutTraceSegments` is the only extra Runtime permission. This transport is application code using official SDK components, not an ADOT auto-instrumentation package.

`OTEL_TRACES_EXPORTER=none` prevents Harness from installing its default unsigned exporter. It does not disable the explicitly registered provider. `OTEL_SEMCONV_STABILITY_OPT_IN` selects GenAI span attributes so code and results can be inspected. The Code Interpreter SDK request handler propagates the active W3C trace context to the service.

The agent stack configures Runtime and Code Interpreter trace delivery, plus Code Interpreter application-log delivery. CloudWatch Transaction Search and its sampling settings are account-level prerequisites. They were already enabled in this demo account and were not changed by this stack.

Strands SDK 1.22.0's MCP instrumentation places `_meta` inside tool arguments, causing AWS MCP schema validation errors. The supported `disableMcpInstrumentation` option disables that injection. Agent-side MCP tool spans remain enabled; this does not expose AWS MCP's internal sandbox trace.

## Boundaries

This captures agent and tool execution, not an operating-system audit of every instruction inside the interpreter. Runtime platform invocation spans and interpreter session start/cleanup can have separate roots; the verified link is from the agent's execution tool span to Code Interpreter's service operation. The application starts one interpreter session explicitly before invoking the agent, avoiding a race when the SDK lazily starts sessions for concurrent first tool calls.

Inputs, generated code, retrieved evidence, and outputs are telemetry data. People with access to these logs/traces can read them. The Slack token stays in the application posting function rather than in model/tool arguments.

The full Node ADOT package was evaluated but not retained because its dependency graph reported security advisories. The narrower deployed dependency set passed the production npm audit without overrides. This is a point-in-time check, not a permanent security guarantee.

Official references:

- [AgentCore observability configuration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
- [Code Interpreter observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter-observability.html)
- [AgentCore telemetry](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-telemetry.html)
