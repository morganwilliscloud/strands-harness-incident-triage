# Ghosts in the Logs: visual cues

Use the PNGs as full-screen 16:9 sources in your livestream software. Each diagram carries one main explanation; pause on it as long as needed.

## 01-title: Ghosts in the logs

Opening or holding graphic. Establish the outcome: detect, investigate, report. The wizard is a seasonal treatment of the original frog, not a new product logo.

## 02-architecture: Overall architecture

Read the top row left to right, then follow the event into Runtime. Intake Lambda only dispatches. Bidirectional tool connectors carry requests and results. Bedrock provides the model; S3 stores incident snapshots; AgentCore Memory stores lessons. Report text and mention are posted directly to Slack by application code. The current demo does not post a ticket or report URL. Not every deployed support resource is drawn.

## 03-strands-loop: The Strands agent loop

The model chooses a tool; Strands executes it and feeds back the result. The loop can continue through several tools or finish with an answer. This is a conceptual loop, not a separate deployment architecture. Reasoning does not require displaying private model reasoning.

## 04-harness-defaults: What harness gives you

Use while the basic TypeScript example is visible. Defaults verified against harness 0.3.1 and SDK 1.22.0. Local file tools and shell are not automatically isolated. Sessions default to .agent/sessions; file memory defaults to .agent/memory; .agent/skills is discovered if present. Short demos may not exercise compaction or produce useful memories. Default web search is provider-dependent, so it is not represented as universally enabled.

## 05-runtime-memory: harness on Runtime with sessions and memory

Runtime hosts the process; it is not the durable memory store. Our current TypeScript integration uses SessionManager and S3Storage for snapshots, and AgentCoreMemoryStore for lessons. This is a demo integration choice, not a claim that AgentCore lacks short-term memory. Extraction is asynchronous. A confirmed engineer outcome is stronger evidence for a future lesson than the agent’s initial hypothesis.

## 06-runtime-interpreter: Runtime and Code Interpreter boundaries

CodeInterpreterTools is the published AgentCore TypeScript integration. The Runtime process starts one interpreter session and closes it in finally. It sends selected code/data via service APIs and receives results. The interpreter role has no app-resource policies in this template. SANDBOX networking is not an absolute air gap. The Runtime itself has PUBLIC networking. Generated code running on the host would have a different access boundary; this demo disables the host shell.

## 07-mcp-iam: AWS MCP and the investigation role

Read the numbered chain carefully: application code uses the Runtime role to assume the investigation role through STS; support/aws.ts signs AWS MCP requests with the temporary credentials. Managed AWS MCP executes the requested AWS operations under the investigation identity. IAM bounds those operations. Do not label AWS MCP as our Code Interpreter instance or draw it as running in the agent container. Some CloudWatch metrics and Logs Insights result permissions require Resource:* and have a broader read scope than the named sample resources. IAM does not make untrusted logs safe instructions or block every possible data-exfiltration route.

## 08-skills-context-memory: Skills, working context, and long-term memory

Use the runbook at .agent/skills/checkout-investigation as the concrete skill. A skill is authored procedure, session state records the current incident, and extracted memory carries earlier experience. Context management governs what stays in the model’s current window. Treat prompt-injection text in logs as untrusted evidence; this diagram states the intended workflow, not a guaranteed security property of a prompt.

## 09-observability: Inspect the investigation in observability

Illustrative sequence, not a screenshot or a guarantee of tool ordering. Use actual AgentCore traces to inspect model/tool spans, AWS MCP nested API results, Code Interpreter code/results, and Slack HTTP reporting. ACCEPTED only acknowledges dispatch; it does not mean investigation or Slack delivery succeeded. Native ADOT supplies traces. No custom BeforeToolCall logging hook is required. Application code posts Slack after the final agent answer.
