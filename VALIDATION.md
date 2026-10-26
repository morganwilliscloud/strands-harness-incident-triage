# Validation

## October 26, 2026 — Extract infrastructure helpers

- Moved signing and MCP connection setup to `support/aws.ts`, and OpenTelemetry export/context propagation to `support/telemetry.ts`. `agent.ts` retains the investigation flow, tool selection, memory, sessions, Slack reporting, and Runtime entrypoint.
- The build now bundles local support modules into the single deployed JavaScript entrypoint while leaving installed packages external. Type checking and the Linux ARM64 deployment archive build passed.
- The bundled entrypoint started locally and returned HTTP 200 from `/ping`; it contains no unresolved relative support imports. This refactor was not deployed, and no new live investigation or trace export was performed.

## October 26, 2026 — Remove the Python setup

- Replaced `demo.py` with `demo.ts`, removed `requirements.txt`, converted the four inline Lambda handlers to Node.js 22, and replaced Python ZIP creation with the `zip` command. Setup and livestream commands now use npm.
- All eight rehearsal commands passed focused checks with mocked AWS clients, including fault/reset environment preservation, no-notification follow-ups, and memory namespaces. A real read-only `status` call through the TypeScript CLI returned the deployed alarm's `OK` state.
- Converted Lambda handlers passed local checks for checkout quantity validation/defaults and unhandled database errors, storefront HTML retrieval, 20 traffic invocations, and intake request/response handling and error propagation. AWS calls were mocked; these checks do not establish hosted Node.js Lambda behavior.
- Type checking, compilation, Linux ARM64 packaging, shell syntax checks, and all three CloudFormation templates passed. The npm dependency audit reported zero known vulnerabilities.
- This cleanup was not deployed. The existing live Lambda functions remain on the previous runtime until the next deployment. The Node.js handlers use Lambda's bundled AWS SDK v3; runtime-specific SDK availability still needs confirmation in a deployment rehearsal.
- Code Interpreter may still execute agent-generated Python. Removing the project's Python setup does not remove that sandbox capability.

## October 26, 2026 — Agent and Code Interpreter tracing

- Deployed OpenTelemetry export for native Strands agent/model/tool spans, plus CloudFormation trace delivery for Runtime and Code Interpreter and application-log delivery for Code Interpreter. Existing account-level Transaction Search and 100% trace indexing were left unchanged.
- Real hosted rehearsal `46db98ee-8d9d-4087-9f14-8c0ed153111c` produced trace `44afb4c603fc61b482396b8a40660f83`. Retrieved 21 spans from CloudWatch, including the agent root, model calls, skill/reference reads, AWS MCP, and all three Code Interpreter tools.
- AWS MCP executed `GetFunctionConfiguration` and returned the real table name. Its returned execution status and nested API-call status were both successful. Code Interpreter calculated a synthetic 20/20 error rate, wrote the fixture as JSON, and read/calculated it through a shell command. The synthetic result was explicitly distinguished from live application metrics.
- Verified all three `AgentCore.BuiltinTools.InvokeCodeInterpreter` spans had the same trace ID and their corresponding agent tool spans as parents. Agent tool attributes contained generated code/commands and returned results. Code Interpreter application logs contained invocation request payloads and correlation IDs.
- Runtime's platform invocation span is a separate trace root, correlated by Runtime session ID. This does not claim full HTTP auto-instrumentation or visibility into the managed AWS MCP service's internal execution.
- The first instrumented rehearsal exposed a Strands SDK 1.22.0 issue: MCP tracing inserts `_meta` into tool arguments, rejected by AWS MCP. Setting the published `disableMcpInstrumentation` option corrected the request without suppressing the agent's MCP tool spans; the subsequent real call above passed.
- That first rehearsal also exposed two lazily created interpreter sessions when first tool calls ran concurrently. The unused rehearsal session was stopped. The agent now explicitly starts one session before invocation instead of relying on lazy initialization.
- Final Runtime version 8 passed a parallel-tool rehearsal for `c330305c-5a95-4883-a7ae-7b907054608c`: Python returned `42`, the shell returned `halloween`, exactly one named interpreter session was created, and it was `TERMINATED` after invocation. The agent exported trace `e34f39f675c85c5de5355ee7f2a734c4`.
- The full Node ADOT package was evaluated and removed after its transitive dependency audit reported advisories. The deployed narrower OpenTelemetry dependency set passed the production npm audit with zero known vulnerabilities and no overrides. The SigV4 OTLP transport is application code using official serializers and AWS signing components.
- Type checking, compilation, Linux ARM64 packaging, and CloudFormation linting with Python 3.12 passed. The machine's global Python 3.14 lint launcher failed on a Pydantic compatibility issue; the Python 3.12 tool completed successfully.
- These tracing rehearsals used `notify=false`. They did not send additional Slack messages or introduce an application fault. The earlier real alarm-to-Slack result below remains the notification verification.

## October 26, 2026 — TypeScript migration

- Agent implementation moved to one `agent.ts`, using published Harness 0.3.1, Strands SDK 1.22.0, and AgentCore SDK 0.4.6. Code Interpreter uses the SDK's experimental Strands integration. No legacy Strands tools package is installed or deployed.
- Type checking and compilation passed. The local Runtime server returned a healthy `/ping` response.
- A signed AWS MCP call from TypeScript executed `GetFunctionConfiguration` against the real sample Lambda. The result returned its actual table name and a successful `api_calls` entry. Merely listing MCP tools was not treated as an execution test.
- A TypeScript stdio MCP client launched the published CloudWatch MCP server and retrieved the real alarm's state history with explicit UTC bounds. This verified interoperability, but CloudWatch MCP is excluded from the application and deployment at the user's request.
- CloudWatch MCP's summary of this metric-math alarm showed blank metric fields and a default 300-second period rather than the real constituent metric periods of 60 seconds. That server summary is not a faithful replacement for the raw alarm configuration.
- All three AgentCore Code Interpreter tools ran against a newly provisioned SANDBOX interpreter: Python returned 42; a file operation wrote an evidence JSON file; a shell command read it with Python and calculated a 100% example error rate. The Python check could not see `/var/task/agent.js`. These tool tests used locally authenticated SDK clients and real remote execution, not hosted agent execution.
- Production dependency audit initially found two high-severity advisories. Updating the MCP client to 2.4.0 and Zod to 4.6.7 resolved them; npm subsequently reported zero known vulnerabilities. No dependency constraint overrides were used.
- The Node.js deployment archive contains compiled JavaScript, the packaged skill, locked dependencies, and the Linux ARM64 Monty binary. It is approximately 50 MiB zipped and 142 MiB uncompressed, with no Python agent.
- Managed `NODE_22` Runtime deployed successfully. Its entrypoint is `agent.js`; the service launches Node. Both invocation sites now send `contentType="application/json"` so the Runtime accepts the payload.
- A real hosted invocation used AWS MCP with the assumed investigation role to read the checkout configuration, then Code Interpreter `executeCommand` ran Python and returned 42.
- A second hosted invocation resumed the same incident from S3 and recalled `CANDY-742`, the observed table name, and 42 without additional tool calls. S3 contains the snapshot/context objects, and AgentCore Memory contains both conversation events. These rehearsal requests did not notify Slack.
- The deployed investigation role's IAM simulation allowed the sample Lambda configuration read and denied its configuration update and access to the Slack secret. The allowed read also succeeded through hosted MCP; the denied operations were simulated, not attempted.
- The first real alarm reached Intake and Runtime but failed strict UUID validation. EventBridge ID `e0f65a4c-3769-4720-6022-dd53fb520a67` reproduced the failure locally. The schema now uses GUID-format validation, which accepts that ID without allowing arbitrary path strings.
- A fresh real alarm at 17:12:07Z invoked the background investigator for `de070400-f94c-1aaa-0971-9b183fda6097`. The agent queried configuration, table metadata, logs, and metrics through AWS MCP, calculated rates with Code Interpreter, identified the incorrect `TABLE_NAME`, and proposed recovery. Slack accepted its report at 17:13:45Z, about 98 seconds after the alarm; `chat.getPermalink` also returned `ok=true`. This was an actual investigation notification, not the earlier setup test.
- During that investigation, IAM denied `GetFunction`, `DescribeAlarms`, and `LookupEvents`. The agent continued with permitted APIs and disclosed the missing evidence. No extra permissions were granted to make the test pass.
- The runbook's reference read initially failed because `read` requires absolute paths. The final revision supplies the host runbook directory in the agent instructions. A hosted check on that revision successfully read `/var/task/.agent/skills/checkout-investigation/references/architecture.md`, without AWS or interpreter tool calls.
- The real investigation's S3 snapshot and AgentCore conversation event are persisted. Both Code Interpreter sessions used by hosted tests show `TERMINATED`, confirming cleanup.
- Checkout was restored to the expected table and a real checkout POST returned HTTP 200. The alarm returned to OK at 17:16:07Z, and synthetic traffic was stopped. The failed schema-test event was captured and removed from the intake failure queue.
- The resolution follow-up resumed the original incident, independently rechecked the restored configuration and zero-error minute, and persisted a second AgentCore conversation event. No additional Slack notification was sent.
- Searchable long-term incident memory remains unverified: direct retrieval and a fresh hosted session's `search_memory` returned no records after the resolution. Conversation-event storage is verified; it is not proof of completed extraction. The runbook now explains automatic submission and does not ask the engineer to manually store a lesson.

AgentCore's [episodic memory documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/episodic-memory-strategy.html) describes record generation after episode completion is detected. Seed and verify the lesson before the livestream rather than depending on extraction during the Q&A segment.

Validation of the removed Python implementation remains in Git history.
