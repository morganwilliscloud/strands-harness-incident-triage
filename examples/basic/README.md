# Start with harness

From the repository root, after `npm ci` and configuring AWS credentials with Bedrock model access:

```bash
AWS_REGION=us-east-1 npm run basic
```

Optionally set `AWS_PROFILE` to use a named profile. No `.env` file is needed.

The npm command starts in this folder, so the checklist and local harness files are separate from the incident agent's runbook. This is a working directory, not a sandbox: the default shell and file tools run locally.

Open `agent.ts` before running it. It imports harness, chooses the Bedrock model, and submits a task. Default console output shows the model's text and tool activity. The agent chooses how to carry out the task; the exact tool sequence may vary.

You can supply another task:

```bash
AWS_REGION=us-east-1 npm run basic -- "Read checklist.md and add a costume contest."
```

Each run starts a new conversation by default. The second command reads the existing checklist; it does not resume the first conversation.

## Explain what harness supplies

- **Strands:** the model/tool loop underneath the agent.
- **harness:** that agent with built-in tools, context management, local sessions, local long-term memory, and skill discovery configured for you.
- **Tools:** no custom tools are defined here. File and shell tools are among the defaults.
- **Context:** large tool results can be offloaded and retrieved; context can be compacted as the conversation grows. This short task need not trigger either behavior.
- **Sessions:** inspect `.agent/sessions` after the run to see the saved conversation state. Resuming a conversation requires selecting its session ID.
- **Memory:** `.agent/memory` is the default location for extracted reusable facts across conversations. A saved session does not prove a memory was extracted; this short checklist task may not produce one.
- **Skills:** harness discovers `.agent/skills` when present. This example has no custom skill.
- **Cleanup:** `await using` shuts down harness at scope exit, including flushing pending persistence work.

Then open the repository's main `agent.ts`: the same `createHarness` call now has incident instructions, a restricted tool selection, AWS MCP, Code Interpreter, S3 sessions, and AgentCore Memory.
