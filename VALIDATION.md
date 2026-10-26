# Validation

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
