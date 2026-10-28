# Validation

## October 28, 2026 — Capture unsampled incoming investigations

- The real alarm incident `26367b9b-d0c4-49dc-d28d-87c5ce4a5e8a` completed and posted to Slack, but its trace contained only four Runtime/Code Interpreter service spans. The incoming Runtime span had `aws.trace.flag.sampled=false`. Reproduced the installed ADOT default sampler dropping child spans under an unsampled parent.
- Added `OTEL_TRACES_SAMPLER=always_on` to the agent CloudFormation template and deployed the environment-only change through CloudFormation. Runtime revision 12 and its DEFAULT endpoint are READY; the stack is UPDATE_COMPLETE. The existing agent artifact and pending Lambda migrations were preserved.
- Invoked a fresh session with both X-Ray and W3C incoming sampling flags explicitly set to zero and `notify=false`. Incident `3fda5602-4542-4063-a24b-0043b9bb84e4`, trace `6ae157bcce27cfa3b08b9376c469c8b9`, produced 50 linked spans, including the successful agent invocation, four agent loop cycles, model calls, AWS MCP, and Code Interpreter. The Runtime service span retained its unsampled flag while ADOT exported the application spans.
- AWS MCP successfully read the actual checkout configuration. Code Interpreter compared the observed `TABLE_NAME` with the expected table and returned `match: False`. Tool arguments/results and agent input/output are captured. This was a read-only verification, sent no Slack message, and did not reset the application fault.
- CloudFormation template validation passed. No custom exporter, manual agent span, or new telemetry dependency was introduced.

## October 27, 2026 — One-command haunt

- `haunt` now updates checkout configuration, waits for the Lambda update to finish, and sends one concurrent 20-request burst through the existing deployed generator. The shared traffic helper disables the legacy schedule before invocation. `start-traffic` remains available for extra/healthy bursts; `reset` does not send traffic.
- Type checking and demo-guide shell syntax passed. Mocked checks verified traffic waits for configuration readiness, exactly one burst is sent, existing environment variables are retained, failed updates/waits prevent traffic, generator errors surface, and `reset` / `stop-traffic` send no requests.
- Updated the README, command guide, and run of show to use `haunt` alone for the failure trigger. This is a local CLI change; no infrastructure redeployment was required, and no live fault or Slack notification was triggered during these checks.

## October 27, 2026 — Immediate 20-request burst

- Changed `start-traffic` to disable the legacy minute schedule, invoke the traffic generator once, and print request/error counts. `stop-traffic` disables the schedule without sending requests. The generator starts 20 checkout invocations concurrently with `Promise.all` and returns their error count.
- Added the `TrafficFunction` application-stack output. Shortened the demo alarm to one 60-second evaluation period and one breaching datapoint; the >20% error threshold and minimum five requests remain unchanged. A burst does not eliminate CloudWatch publication/evaluation delay. Missing data remains nonbreaching, so alarm recovery alone does not prove checkout was fixed.
- Type checking passed. Mocked checks verified all 20 invocations start before any completes, healthy and failed-batch counts, disabling the schedule before the one-shot invocation, stopping without invocation, and propagation of generator failures. Demo guide shell blocks passed syntax checks.
- Applied reviewed CloudFormation change sets to `haunted-app` and `haunted-monitoring`; both reached `UPDATE_COMPLETE`. The deployed traffic Lambda is now Node.js 22. Other pending Lambda migrations were left unchanged.
- Ran the actual `npm run demo -- --region us-east-1 start-traffic` command against healthy checkout: `{"requests":20,"errors":0}`. Confirmed the traffic schedule stayed `DISABLED`, the alarm uses one 60-second period / one datapoint, and alarm state was `OK`. No fault was injected for this verification; it was not another alarm-to-Slack rehearsal.
- Updated the README, demo command guide, and run of show to send a burst after `haunt` and another healthy burst after `reset`.

## October 27, 2026 — Runtime V2

- Verified the deployed `haunted_investigator-TQ1U0Z6CxF` was platform V1, revision 10. The repository template omitted `PlatformVersion`.
- Set `PlatformVersion: V2` in `templates/agents.yaml`. Applied the same one-property change to the live stack through a reviewed CloudFormation change set, retaining its existing artifact and parameters. Pending Node.js intake changes remain undeployed.
- CloudFormation finished `UPDATE_COMPLETE`. `GetAgentRuntime` reports platform `V2`, revision `11`, status `READY`; the `DEFAULT` endpoint is `READY` with live version `11`.
- Hosted smoke request `c423866d-de3e-48b3-8e90-a16d6071096c` returned `ACCEPTED`; CloudWatch subsequently recorded `investigating` and `completed`. It used `notify=false` and did not trigger an alarm or send Slack messages. This validates hosted execution after the platform change, not another full alarm-to-Slack rehearsal.
- AWS CloudFormation template validation passed. The global cfn-lint launcher failed on its existing Python 3.14/Pydantic incompatibility before it could inspect the template.

## October 26, 2026 — Livestream visual kit

- Created nine 1920×1080 PNG graphics with editable SVG sources, six transparent seasonal overlays, a contact sheet, and presenter notes. The style guide was read through the signed-in browser; the original public frog and wordmark assets and canonical fonts are included with provenance.
- Checked the architecture and explanation against the current agent, signing helper, IAM templates, and installed harness defaults. Graphics distinguish S3 session snapshots from AgentCore lessons, Runtime from Code Interpreter, and Runtime credentials from the assumed investigation identity.
- Rendered and visually reviewed the set, corrected the frog/text overlap in the loop graphic, and checked all 209 text elements against canvas bounds. Verified every main PNG is 1920×1080 and every overlay has transparency.
- Added visual cues to the run of show. The visual generator and dependencies are separate from the deployed agent; no AWS deployment or application code changed.

## October 26, 2026 — Basic TypeScript harness example

- Added `examples/basic/agent.ts` and `npm run basic`, using the existing pinned dependencies and the incident agent's Bedrock model. All harness tools, context, session, memory, and printing settings remain at their defaults.
- Type checking passed. A real local run against Bedrock successfully used `write`, `shell`, and `read` to create and read back `examples/basic/checklist.md`, then printed a summary.
- Session `28fbc5dd` persisted a snapshot and context artifacts under the example's `.agent/sessions`. Two extracted memory files appeared under `.agent/memory`; their creation does not validate the quality of inferred preferences or demonstrate later recall. Generated files are ignored by Git.
- Updated segment 3 of the run of show without changing its 10-minute allocation. This is a local teaching example; no AWS infrastructure or hosted agent was changed.

## October 26, 2026 — One asynchronous invocation path

- Removed the `background` request field and conditional branch. Every invocation registers an AgentCore asynchronous task, returns `ACCEPTED`, and completes the task after investigation and cleanup. The intake template no longer sends the flag.
- Updated CLI help and README: `ask` and `resolve` now acknowledge immediately, with results in observability. Wait for completion before following up in the same incident session.
- Type checking, compilation, ARM64 packaging, template linting, and the existing mocked Lambda/CLI checks passed. Deployed Runtime version 10 using the live stack template and a new agent artifact; pending Node.js Lambda migrations remain undeployed. The older deployed intake's extra `background` field is ignored by the request schema.
- Hosted request `221830d1-d773-4d2c-bd7b-c0d10de2d0f0` omitted the flag and returned `ACCEPTED`. Runtime logs subsequently recorded `executeCode` and `completed`; trace `6adfb64d0b87a9cf237ed6fd75868664` includes the successful `print(6 * 7)` call and result `42`. The interpreter session is `TERMINATED`. This bounded test used `notify=false`; it did not exercise Slack or the alarm-to-Lambda path.

## October 26, 2026 — Standard AWS ADOT observability

- Replaced the custom exporter and manual Code Interpreter trace handler with AWS ADOT Node auto-instrumentation 0.13.0. Removed `support/telemetry.ts`, direct OpenTelemetry setup dependencies, custom `traceAttributes`, and manual trace flushing from the agent.
- `NODE_OPTIONS` preloads the two-line `observability.cjs`: register ADOT using its configured exporter, then prevent harness 0.3.1 from installing a second provider. A first local attempt without the second line reproduced duplicate provider/context/propagator registration; the final startup completed without those errors. No custom exporter implementation remains.
- Deployed Runtime version 9 using the live stack template with only the Runtime environment and agent artifact updated. The pending Node.js Lambda migration was not deployed. Existing Runtime/interpreter trace deliveries and IAM permissions remain in place.
- Hosted rehearsal `965b947c-248e-4bb6-95e2-e2347582fe4b` produced trace `6adfb1d55150b65f646de9062b42a91e`. Retrieved 54 spans linking `AgentCore.Runtime.Invoke`, incoming HTTP, the Strands agent/model/tools, AWS SDK calls, and Code Interpreter service operations. ADOT automatically attached `session.id=incident-965b947c-248e-4bb6-95e2-e2347582fe4b` to agent spans.
- AWS MCP's `GetFunctionConfiguration` returned the actual checkout table name, with successful script and API-call status. All three interpreter tools succeeded: generated Python calculated the synthetic 20/20 error rate, file operations wrote the fixture, and a shell command read it back. Tool arguments and results are present in the spans. No manual trace headers were required for Code Interpreter correlation.
- Transport negotiation and initial snapshot lookup produced HTTP 400/405 and S3 404 spans. The requested operation and tool results succeeded; this does not mean every low-level request had a successful status.
- Background-mode rehearsal `f26bc38c-c904-4abd-aee7-065dd6303adc` returned `ACCEPTED`, then completed Code Interpreter execution with result `42`. Its 36-span trace, `6adfb21a1824d15843e3870407af7489`, links the completed background agent and interpreter operation to the original Runtime request. Both rehearsal interpreter sessions are `TERMINATED`.
- Type checking, compilation, CloudFormation linting, and Linux ARM64 packaging passed. The uploaded archive includes `observability.cjs` and the locked ADOT dependencies. Tests used `notify=false`, sent no Slack messages, and introduced no application fault; the alarm remains `OK`.
- Production npm audit reports 12 dependency entries (8 moderate, 4 high). The underlying advisories concern database instrumentation exposing `db.user` and malformed-header denial of service in the Jaeger propagator. This deployment enables only HTTP/AWS SDK/Undici instrumentation and baggage/X-Ray/W3C trace propagators. The affected packages are still installed; no dependency overrides, patches, or clean-audit claim are made.

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

- Agent implementation moved to one `agent.ts`, using published harness 0.3.1, Strands SDK 1.22.0, and AgentCore SDK 0.4.6. Code Interpreter uses the SDK's experimental Strands integration. No legacy Strands tools package is installed or deployed.
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
