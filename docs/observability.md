# See what the investigator did

Open [AgentCore observability](https://console.aws.amazon.com/bedrock-agentcore/observability?region=us-east-1) in the demo account, select us-east-1, and set the time range to include your invocation. The agent service is `haunted_investigator`; the agent span is `invoke_agent haunted-investigator`.

CloudWatch Transaction Search provides the trace waterfall. AWS ADOT propagates the Runtime session context and adds `session.id` automatically. In this demo its value is `incident-<incident UUID>`. The agent does not set custom trace attributes. Allow a few minutes for searchable ingestion.

## What to open

| Span | What it shows |
|---|---|
| `AgentCore.Runtime.Invoke` | The hosted invocation |
| `invoke_agent haunted-investigator` | Agent input/output and duration |
| `chat` | Model messages and inference details |
| `execute_tool aws___run_script` | Requested AWS script and returned evidence, including API-call outcomes |

Tool spans expose `gen_ai.tool.call.arguments` and `gen_ai.tool.call.result`. Tool success alone does not prove every nested AWS operation succeeded: inspect the returned MCP execution status and `api_calls`.

For a direct lookup, select the `aws/spans` log group in CloudWatch Logs Insights:

```text
fields @timestamp, name, traceId, spanId, parentSpanId
| filter @message like /INCIDENT_UUID/
| sort @timestamp asc
```

Copy a `traceId`, then query the entire trace, including service spans that may not carry the incident/session label:

```text
fields @timestamp, name, spanId, parentSpanId, @message
| filter traceId = "TRACE_ID"
| sort @timestamp asc
```

Runtime console logs are in `/aws/bedrock-agentcore/runtimes/haunted_investigator-TQ1U0Z6CxF-DEFAULT` for this deployment. AWS MCP scripts and results appear in the agent tool spans; this does not expose the managed MCP service's internal execution trace.

## Current deployment verification

Runtime revision 14 uses AWS MCP without Code Interpreter. Trace `6ae164e75a60d44851d4331d0e5a1e3d`, incident `cdbb77c8-4eb5-4713-a28e-f775c7e25075`, at approximately October 28, 2026, 02:59 UTC (October 27, 10:59 p.m. Eastern), contains the read-only deployment check. The AWS MCP result records a successful `GetMetricData` call with no datapoints in the requested window. This check did not send Slack or reset memory.

## Verified rehearsals before Code Interpreter removal

These historical traces retain interpreter session/service spans from earlier versions. The current agent exposes only AWS MCP and the host runbook reader; it creates no Code Interpreter session.

For the full alarm-triggered investigation with cleared memory and no fault-specific runbook hints, open trace `6ae15f265bcb2165302cc67717f3c7d1`, incident `77f6f10d-fa76-29e2-0859-50f97a67e3f1`, on October 28, 2026, 02:34–02:36 UTC (October 27, 10:34–10:36 p.m. Eastern). It contains 73 linked spans and seven agent loop cycles. The memory search returned no records. Four AWS MCP calls discovered the bad table configuration from live evidence, and the report was posted to Slack. One script failed on timestamp parsing and was corrected in the next call. The agent chose not to execute Code Interpreter tools; its session-start/stop spans do not mean analysis code ran there.

The sampling-fix rehearsal is trace `6ae157bcce27cfa3b08b9376c469c8b9`, incident `3fda5602-4542-4063-a24b-0043b9bb84e4`, on October 28, 2026, 02:06–02:08 UTC (October 27, 10:06–10:08 p.m. Eastern). It contains 50 linked spans, four agent loop cycles, a real AWS MCP configuration read, and Code Interpreter comparing the actual and expected table names. Its incoming trace was deliberately marked unsampled to verify that the demo still captures agent details. This read-only rehearsal did not send Slack or repair the fault.

Set the time range to October 26, 2026, 20:02–20:04 UTC (4:02–4:04 p.m. Eastern). Trace `6adfb1d55150b65f646de9062b42a91e`, incident `965b947c-248e-4bb6-95e2-e2347582fe4b`, contains a real AWS MCP configuration read and all three interpreter tools. The error-rate calculation uses a clearly labeled synthetic fixture. It is not an actual outage.

This trace links the Runtime service span, incoming HTTP request, Strands agent/tool spans, AWS SDK calls, and Code Interpreter service operations. Transport negotiation and first-use session loading also produced HTTP 400/405 and S3 404 spans; the actual MCP operation and all requested tools succeeded. Inspect the operation and returned result rather than treating every red transport span as an investigation failure.

## How it is configured

The deployment installs `@aws/aws-distro-opentelemetry-node-autoinstrumentation@0.13.0`. `NODE_OPTIONS` preloads `observability.cjs` before the agent imports its dependencies. `AGENT_OBSERVABILITY_ENABLED=true` selects AWS's agent-observability defaults, including its SigV4-authenticated OTLP exporter. Strands supplies the agent/model/tool spans; ADOT instruments HTTP and AWS SDK calls and propagates their trace context.

The startup file has two lines: load ADOT, then set `OTEL_TRACES_EXPORTER=none` for harness. ADOT reads the initial `otlp` setting and configures its exporter before that change. The second line prevents harness 0.3.1 from trying to register a second provider. It does not shut down ADOT. There is no custom exporter, trace provider, request handler, or manual flush in the agent.

The template enables only `http`, `aws-sdk`, and `undici` instrumentation and selects `baggage,xray,tracecontext` propagators. `OTEL_SEMCONV_STABILITY_OPT_IN` retains GenAI input/output attributes for the walkthrough. Additional ADOT log/metric exporters are disabled; Runtime console logs and AWS service metrics use their existing platform deliveries.

`OTEL_TRACES_SAMPLER=always_on` records every investigation for this low-volume demo, including invocations whose incoming trace is marked unsampled. ADOT's default parent-based sampler honors that incoming decision, which can leave Runtime service spans visible while omitting the agent/model/tool spans. CloudWatch Transaction Search's indexing percentage cannot recover spans the application never exported. Sampling every invocation increases telemetry volume; choose an appropriate sampling policy for production.

The stack configures Runtime trace delivery. The Runtime role retains `xray:PutTraceSegments`. CloudWatch Transaction Search and its sampling settings are account-level prerequisites; they were already enabled in this account and were not changed.

Strands SDK 1.22.0's MCP instrumentation places `_meta` inside tool arguments, causing AWS MCP schema validation errors. The supported `disableMcpInstrumentation` option disables that injection. Agent-side MCP tool spans remain enabled; this does not expose AWS MCP's internal sandbox trace.

## Boundaries and dependency status

This captures agent and tool execution. Inspect the returned AWS MCP script status and API-call outcomes; a successful tool span alone does not establish that the script succeeded.

Inputs, generated code, retrieved evidence, and outputs are telemetry data. People with access to these logs/traces can read them. The Slack token stays in the application posting function rather than in model/tool arguments.

On October 26, 2026, npm audit reported 12 dependency entries (8 moderate, 4 high) for the installed ADOT dependency graph. The underlying advisories concern database instrumentation exposing `db.user` and malformed-header denial of service in the Jaeger propagator. Database instrumentation and the Jaeger propagator are not selected in this configuration. The affected packages remain installed, so this is not a clean audit or a claim that the dependencies are patched. No dependency overrides or forced upgrades were applied.

Official references:

- [AWS ADOT JavaScript agent-observability configuration](https://github.com/aws-observability/aws-otel-js-instrumentation#generative-ai)
- [AgentCore observability configuration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
