# Validation

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

The entries below describe earlier revisions.

## October 26, 2026 — Live setup and vended-tool correction

- Real AWS app and monitoring stacks deployed in us-east-1. A real checkout POST returned an order ID; CloudWatch recorded checkout traffic.
- Slack auth.test and chat.postMessage both returned ok=true for a clearly labeled setup-test message. This was not an agent investigation report.
- Bedrock Converse and a basic Harness invocation returned real model responses. AWS Toolkit authenticated discovery returned its tools in us-east-1.
- Agent deployment failed because the reflection memory namespace must be the same as or a parent of the episode namespace. The template is corrected locally; the failed stack finished rollback. No hosted investigator or end-to-end incident-to-Slack run succeeded.
- Deployment and traffic are stopped. The legacy tools dependency, Code Interpreter import, and Pillow override have been removed. AgentCore Code Interpreter remains pending a supported vended adapter; AWS Toolkit execution is a different integration.
- The local environment was synchronized from the remaining dependency graph: 98 compatible packages, with no legacy tools distribution or import namespace. Agent and SDK-vended Python tool imports passed, four focused Slack/configuration checks passed, all templates passed linting, and deployment scripts passed syntax checks. These are local checks, not hosted execution.
- Seven legacy local build artifacts and the single uploaded agent archive were removed. They must not be reused for deployment.
- Earlier validation below records historical code and must not be read as validation of the current source.


## October 26, 2026 — Secrets Manager configuration

- Four focused local checks passed: the Slack function reads the JSON secret and picks up changed destinations on the next report; a secret retrieval failure prevents posting; demo commands select an explicit AWS profile/region and discover stack outputs; the full deployment scripts resolve only secret metadata and pass the ARN without reading the token or requiring a `.env` file.
- The Slack checks executed the actual function extracted from `agent.py` with mocked AWS and Slack clients. The demo command used mocked SDK clients, and deployment used stub AWS/packaging commands. No cloud deployment or real Slack delivery was performed.
- All three CloudFormation templates passed `cfn-lint` using Python 3.12. All deployment/packaging scripts passed `bash -n`.
- Slack settings now require a JSON secret containing `bot_token`, `channel_id`, and `oncall_user_id`. The template injects only its ARN, and the deployment script never retrieves the secret value.
- The previous full Harness integration suite was not rerun. The existing deployment archive predates this change; `scripts/deploy.sh` builds a fresh archive before deployment.

## October 21, 2026 — Previous local validation

This record applies to the one-agent implementation using the pinned Harness 0.2.0 defaults, with the candy storefront added on October 21. Dependencies and agent code were not changed for the storefront revision.

## Passed locally

- Seven local tests pass, covering direct Slack reporting, official integration tools, same-session follow-ups without extra notifications, failure propagation, background-task tracking, and the application IAM action allowlist.
- The integration test runs the real Harness factory with a scripted model, omitting `builtin_tools`, `skills`, and `context_manager`. Harness discovers the skill from `.agent/skills`, writes a Python file with its built-in tool, executes that file through its built-in shell, and runs the installed AWS CLI. It also recalls a supplied memory record, flushes events through the native AgentCore Memory adapter, and resumes a snapshot. AWS memory calls are mocked and snapshot storage is in memory for this test.
- All three CloudFormation templates passed `cfn-lint` again on October 21 after adding storefront hosting. The updated deployment script passes `bash -n`.
- Ten additional local backend checks pass: browser quantity persists in the order, scheduled traffic still works without a request body, invalid quantities do not write orders, the storefront reads its HTML object, and database failures remain unhandled Lambda errors for the alarm.
- Browser checks exercised quantity selection, successful ordering, HTTP 502 failure with the selected quantity retained, and successful retry after simulated recovery. Desktop and mobile layouts were visually inspected; the mobile page had no horizontal overflow.
- The preview server executed the actual checkout handler extracted from the application template with a mocked DynamoDB table. It returned a simulated API Gateway 502 when that handler raised a database error. A visible preview banner identifies AWS and Slack as disconnected. This does not verify API Gateway integration or cloud behavior.
- The source ZIP includes `storefront/index.html` and the updated application template/deployment script. The agent archive is unchanged.
- `agent.py` is 101 lines, contains no custom tool definitions, and has no comments, docstrings, or try/except blocks. Slack delivery is extracted into the ordinary `post_report_to_slack` function.
- The Linux ARM64 archive builds with AWS CLI and the official MCP proxy library. It measures approximately 91.3 MiB zipped and 324.6 MiB unzipped, below AgentCore's documented 250 MB zipped and 750 MB unzipped limits.
- All 31 native shared libraries identify as AArch64 ELF. The packaged `aws` launcher is executable and uses a portable Python shebang. The archive includes the current agent and single skill/reference.
- On October 14, public AWS MCP Server discovery returned eight tools, including `aws___run_script`, documentation search/read, and skill retrieval. That discovery was unauthenticated; session cleanup returned HTTP 401. Authenticated runtime execution remains untested.

## Live rehearsal still needed

No AWS resources were deployed and no Slack messages were sent during this revision. The AWS profile/Region/model and Slack settings still need configuration.

Validate the runtime role's intended reads and denied application mutations, authenticated Toolkit execution, AWS CLI operation inside the hosted Runtime, Code Interpreter, S3 session resumption, a real alarm-to-Slack run, and actual AgentCore episode extraction/recall.

The local scripted model does not establish investigation quality or server-side memory extraction. Static IAM/template checks do not establish live enforcement. The ARM64 package was inspected but not executed on Linux; the local Docker daemon was unavailable.

This version deliberately has no incident database or deduplication workflow. Delivery retries can repeat work or Slack messages.

## Sources checked

- [AWS MCP tools](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/understanding-mcp-server-tools.html)
- [AWS MCP uses downstream IAM permissions](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/security_iam_service-with-iam.html)
- [Official proxy library integration](https://github.com/aws/mcp-proxy-for-aws#programmatic-access)
- [AgentCore Python packaging limits](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy-python.html)
