# Sources and design decisions

Reviewed October 26, 2026.

## Visual reference

The user supplied the Strands Labs wiki. Its navigation links to the **Strands Agents visual style guide**, which was read in the user's signed-in browser. The guide identifies the public website source as the canonical visual system. No screenshots or text from the internal wiki are included in the broadcast images.

Public source repository: `strands-agents/harness-sdk`; `main` resolved to `5a478da4fab993076b84635eb6dd724e4409c60f` during production.

- Frog: `site/src/assets/nav/frog-hop.svg`
- Wordmark: `site/src/assets/nav/wordmark.svg`
- Tokens: `site/src/styles/fonts.css`
- Font families: JetBrains Mono and Space Grotesk, from the Google Fonts repository. Their OFL license files accompany the font assets.

The suite uses black, Strands green `#00cc60`, white, pink `#ff70eb`, dark-theme blue `#6a8bff`, yellow `#f6bc00`, and red `#f7414c`. Orange `#ff922e` is an added seasonal accent. The original frog path is recolored through `currentColor`, not redrawn. Pixel hats, ghosts, and pumpkins are original demo illustrations. Service symbols are custom explanatory icons, not official AWS service logos.

## Harness concept visual

Added October 28, 2026, between the agent loop and the Strands defaults graphic.

- LangChain, **The Anatomy of an Agent Harness**, Vivek Trivedy, March 10, 2026: https://blog.langchain.com/the-anatomy-of-an-agent-harness/ . Explicitly uses “Agent = Model + Harness” and describes the harness as code, configuration and execution logic around the model. Supports tools, loops, state, prompts, skills, context management and hooks. This is a useful design framing, not a universal formal definition.
- Anthropic, **Effective harnesses for long-running agents**, November 26, 2025: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents . Supports the need for tools, context compaction, persistent progress and session continuity; also explains why compaction alone does not guarantee effective long-running work.
- Strands, **Strands harness**, accessed October 28, 2026: https://strandsagents.com/docs/user-guide/harness/ . Describes the assembled, customizable harness, built on the Strands harness SDK, including defaults for tools, context, sessions, memory, hooks and prompts.

The graphic groups common responsibilities into six boxes. Hooks and controls are extension points for checks, approvals and logging, not a claim of automatic policy enforcement. Keep this conceptual explanation separate from the following graphic's version-specific Strands defaults.

## Demo implementation references

The diagrams were checked against this repository:

- `agent.ts`: tool selection, memory and sessions, asynchronous invocation, interpreter lifecycle, and application-controlled Slack posting.
- `support/aws.ts`: STS temporary credentials and SigV4 signing for managed AWS MCP.
- `templates/agents.yaml`: Runtime and interpreter boundaries, IAM policies, memory strategy, and S3 sessions.
- `templates/monitoring.yaml`: CloudWatch alarm and EventBridge-to-Lambda routing.
- `observability.cjs` and `docs/observability.md`: ADOT setup and verified hosted traces.
- Installed harness `0.3.1` and Strands SDK `1.22.0`: default tools, context handling, local session and memory storage, progressive skill loading, and console printing.

## Deliberate distinctions

- The intake Lambda dispatches; AgentCore Runtime runs the agent.
- `ACCEPTED` acknowledges a request; it does not certify investigation or Slack completion.
- The model selects tools; the SDK executes them.
- harness's local defaults are configurable. Host shell/file access is not automatically isolated.
- S3 snapshots and AgentCore lessons are this demo's chosen integrations. AgentCore Memory also supports short-term event storage.
- Session storage descriptions verified October 28, 2026 against the TypeScript SessionManager documentation: https://strandsagents.com/docs/api/typescript/SessionManager/ . Snapshots save and restore conversation state across invocations; this demo does not demonstrate a follow-up that restores one.
- Storage and context references: https://strandsagents.com/docs/user-guide/sdk/storage/ and https://strandsagents.com/docs/user-guide/harness/configure/context-and-caching/ . LocalFileStorage and S3Storage are interchangeable storage backends. Shared storage can also hold offloaded tool results for retrieval during an invocation; this is separate from restoring a session snapshot.
- AWS MCP executes generated investigation scripts remotely through `aws___run_script`; the agent host shell is disabled.
- The agent assumes the investigation role before signing AWS MCP requests. AWS MCP runs remotely, outside the agent container.
- The investigation role is restricted, but some metric/query-result reads require wildcard resource scope.
- Slack contains the report text and on-call mention. Tickets, a report URL, and automatic remediation are outside the current demo.
- The observability sequence and report are illustrations. They are labeled accordingly and do not impersonate actual trace screenshots.
