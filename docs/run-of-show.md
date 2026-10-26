# Run of show: Ghosts in the Logs: Build an AWS Incident Triage Agent with Strands Harness

**Implementation:** One TypeScript agent using Harness, managed AWS MCP, and the published AgentCore Code Interpreter integration. See `VALIDATION.md` for rehearsal results.


**Date:** October 28, 2026\
**Length:** 60 minutes\
**Main host:** Leads the technical explanation, code walkthrough, and demo.\
**Co-host:** Rafael Lopez opens the show, introduces segments, watches chat, and moderates Q&A.

**Show premise:** Something is haunting our checkout application. We’ll build an incident-triage agent with Strands Harness that responds to a CloudWatch alarm, investigates AWS logs and configuration, and posts its findings to the on-call engineer in Slack.

Each segment lists its estimated duration and the cumulative running time at the end of that segment. Rafael can bring in a relevant audience question during natural pauses. Protect the final Q&A and closing.

## At a glance

| Segment | Duration | Running time at end | Lead |
|---|---:|---:|---|
| Welcome and introductions | 4 min | 4 min | Rafael, then main host |
| The haunted application and architecture | 6 min | 10 min | Main host |
| Explain Strands and demonstrate the basic Harness | 10 min | 20 min | Main host |
| Build the incident-triage agent for our application | 10 min | 30 min | Main host, with Rafael’s questions |
| Deploy to AWS using IaC and explain permissions | 5 min | 35 min | Main host |
| Trigger the alarm and watch the investigation | 10 min | 45 min | Both |
| Follow up, recover, and retain the lesson | 3 min | 48 min | Both |
| Audience Q&A | 10 min | 58 min | Rafael moderates |
| Takeaways and sign-off | 2 min | 60 min | Main host, then Rafael |
| **Total** | **60 min** | | |

## 1. Welcome and introductions

**Duration:** 4 minutes — puts us **4 minutes into the show**.\
**Screen:** Both hosts on camera; show title.

**Rafael opens:**

- Welcome viewers and introduce the Halloween theme.
- Describe the show: building an agent that investigates a failing AWS application and reports to Slack.
- Introduce the main host and invite a brief self-introduction.
- Invite viewers to put questions in chat throughout the stream.

**Main host:**

- Briefly introduce yourself and your work with agents.
- Preview the sequence: understand the problem, look at the architecture, build the agent, deploy it, and trigger a real failure.

**Rafael’s bridge:**

> “You said our AWS account might be haunted. What’s going wrong, and what are we going to do about it?”

## 2. The haunted application and architecture

**Duration:** 6 minutes — puts us **10 minutes into the show**.\
**Screen:** Candy storefront and successful checkout → architecture diagram.

**Main host:**

- Set the scene: checkout requests start failing, an alarm fires, and the on-call engineer has to work out what changed.
- Open Midnight Candy Co., select a quantity, and place a successful demo order to establish what the customer experience should look like.
- Lean into the theme: “Our checkout is haunted. Let’s see if we can exorcise it with an automated investigation.”
- Explain the practical problem: the alarm identifies a symptom; someone still needs to connect logs, metrics, configuration, and previous incidents.
- Walk through the architecture at a high level:
  - Candy storefront → API Gateway → checkout Lambda and DynamoDB, with CloudWatch logs and metrics.
  - CloudWatch alarm → EventBridge → intake Lambda.
  - Strands Harness agent hosted in AgentCore Runtime, using a model through Amazon Bedrock.
  - AWS Toolkit and Code Interpreter for investigation and analysis.
  - Packaged runbooks, session storage, and AgentCore Memory.
  - Findings and an on-call mention posted directly to Slack.
- State the demo’s finish line: a useful investigation report and recommended recovery steps. The engineer performs the recovery.

Keep this to the flow and the purpose of each component. The application and monitoring are prepared before the show; briefly establish the healthy baseline here. From the diagram, move into the basic Harness demonstration.

**Rafael’s bridge:**

> “Well can you tell me a little bit more about the agent that you're going to be using to do the incident triage? What is Strands? What is Strands Harness? How does this work?”

## 3. Explain Strands and demonstrate the basic Harness

**Duration:** 10 minutes — puts us **20 minutes into the show**.\
**Screen:** Terminal, simple Harness example, exported code/configuration, and local session/memory files.

**Main host:**

- Explain Strands and the agent loop: a model reasons about the task, uses tools, evaluates results, and continues.
- Introduce Strands Harness and show a simple starting example.
- Run a small task from the command line so viewers can see the basic Harness working.
- Export the basic Harness and open the resulting code/configuration.
- Use that example to explain what comes by default:
  - **Built-in tools:** shell and file operations, plus the other available Harness tools. Explain that the model chooses tools as it works.
  - **Context management:** handling large results, retrieving offloaded details, and compacting context as needed.
  - **Local sessions:** conversation state persisted to files so a session can be resumed.
  - **Long-term memory:** retaining and recalling useful information across sessions, with local file storage as the starting point.
  - **Skills:** a way to supply procedures that load when relevant.
- Show the local files that make session persistence and memory concrete. Distinguish continuing a conversation from recalling experience in a new one.
- Explain that these defaults give us a working starting point, and we can configure or replace the pieces for our application.

Demonstrate the simple run and export; explain the defaults without trying to force every context-management or memory behavior to occur during this short example.

**Rafael’s bridge:**

> “How do we build on this for our specific application? I assume we’d have incident-triage runbooks we want it to follow, and we might want to use our own memory provider. How do we plug those in?”

## 4. Build the incident-triage agent for our application

**Duration:** 10 minutes — puts us **30 minutes into the show**.\
**Screen:** `agent.ts`, with the packaged runbook opened alongside it.

**Make the Harness specific to the application.**

- Build out the actual incident-triage agent, connecting it back to the basic example.
- Add the task-specific instructions, application details, and Bedrock model configuration.
- Show `builtinTools: ["read"]`: keep runbook reading, disable host shell and general web tools, and use the AWS Toolkit for AWS queries.
- Connect Agent Toolkit for AWS through its official MCP integration for documentation, AWS skills, and AWS operations.
- Show `CodeInterpreterTools` from the AgentCore TypeScript SDK: code execution, shell commands, and file operations in a separate interpreter session.
- Briefly explain how to add an integration through `tools`, or explicitly select/disable built-ins when needed.

**Rafael’s question:**

> “It can run commands, but how does it know our team’s investigation process?”

**Add the service’s runbook.**

- Open `.agent/skills/checkout-investigation/SKILL.md`.
- Show how packaging it in the default location makes it available for discovery and loading.
- Show the procedure: gather evidence, test explanations, preserve uncertainty, and return a useful report.
- Connect this back to the default context management already covered: the investigation can accumulate logs and tool results without us writing a custom context pipeline.

**Rafael’s question:**

> “What if it’s seen this problem before? And can the engineer come back and ask a follow-up?”

**Replace local persistence with the providers for this deployment.**

- Show the S3 session configuration: preserve what we have already done in this incident across hosted invocations.
- Connect AgentCore Memory as the long-term memory provider: retain useful experience across incidents.
- Explain why the incident session changes while the service identity stays stable.
- Describe the learning loop: investigate, receive a confirmed outcome, retain the lesson, and retrieve it during a future incident.
- Emphasize that a recalled fix still needs support from current evidence.

**Optional Rafael follow-up:**

> “So the runbook is the procedure we teach it, and memory is the experience it builds up?”

**Finish the path from invocation to report.**

- Walk through the Runtime entrypoint and background invocation.
- Follow the returned report into `postReportToSlack`.
- Show the JSON secret containing `bot_token`, `channel_id`, and `oncall_user_id`. The agent retrieves it when posting; deployment supplies only the secret ARN.

Keep the screen on the actual agent and runbook. Build on the defaults explained in the previous segment rather than explaining them again.

**Rafael’s bridge:**

> “We’ve given it some powerful tools. How do we deploy it without giving it permission to change anything it wants in the account?”

## 5. Deploy to AWS using IaC and explain permissions

**Duration:** 5 minutes — puts us **35 minutes into the show**.\
**Screen:** Agent deployment template, deployment output, and IAM policy.

**Main host:**

- Walk through the agent’s infrastructure-as-code template and deploy the prepared package as an update to the rehearsed stack. Pre-provision AgentCore Memory before the show; its initial provisioning can exceed this segment.
- Explain that the package contains the agent, compiled JavaScript, locked Node.js dependencies, and the runbook.
- While deployment runs, show the dedicated investigation role’s allowed actions and resource scope.
- Distinguish application investigation permissions from the permissions needed for the agent’s own model, memory, sessions, and Slack secret.
- Show that Toolkit assumes the investigation role, while Code Interpreter uses SANDBOX networking and has no AWS resource permissions.
- Confirm the alarm route is connected to the deployed agent.

**Rafael’s bridge:**

> “All right, the agent is ready. Let’s haunt the checkout and see what it finds.”

## 6. Trigger the alarm and watch the investigation

**Duration:** 10 minutes — puts us **45 minutes into the show**.\
**Screen:** Candy storefront → fault command → failed checkout → CloudWatch → Runtime activity → Slack.

**Main host:**

- Introduce the configuration failure.
- Run `demo.py haunt`, return to the storefront, and place another order. Show “Something’s haunting checkout” and the retry button.
- Connect the customer-visible failure to the checkout Lambda’s errors, then show the alarm changing state. Keep background shoppers running: the alarm needs at least five invocations per minute and more than 20% errors for two consecutive periods; a single failed click does not trigger it alone.
- Follow the investigation as it runs: skill loading, memory recall, commands, queries, documentation, and analysis.
- Explain the evidence as it appears. Let the observed tool activity guide the commentary.
- Open the Slack report and assess it together: cause, evidence, impact, uncertainty, and proposed recovery.

**Rafael:**

- Keep the audience oriented as the screen changes.
- Bring in one or two relevant chat questions during alarm evaluation or tool execution.
- Use short prompts when helpful:

> “What is that command checking?”
>
> “What makes this evidence point to the cause?”
>
> “Did it find anything useful from the previous incident?”

**Rafael’s bridge:**

> “We have the report. Can the engineer ask a follow-up—and how does the agent learn whether the recommended fix actually worked?”

## 7. Follow up, recover, and retain the lesson

**Duration:** 3 minutes — puts us **48 minutes into the show**.\
**Screen:** Same-session follow-up, recovery evidence, and memory.

**Main host:**

- Ask a follow-up using the same incident ID to demonstrate session continuity.
- Restore the correct application configuration and inspect recovery.
- Click **Try checkout again** in the storefront and show the successful order confirmation.
- Once recovery is verified, show how the engineer’s confirmed action and outcome are added to the incident conversation.
- Show a previously extracted lesson from rehearsal and connect it to recall during today’s investigation.
- Explain that memory extraction is asynchronous; the latest resolution need not become searchable during this segment.

Use the earlier rehearsal incident for the cross-incident memory demonstration. There is no need to fit a second alarm cycle into the hour.

**Rafael’s bridge:**

> “Let’s take some questions from everyone watching.”

## 8. Audience Q&A

**Duration:** 10 minutes — puts us **58 minutes into the show**.\
**Screen:** Both hosts; return to the diagram or code when useful.

Rafael groups related questions and prioritizes the ones that help viewers adapt the example.

**Backup questions if chat is quiet:**

- “How would I adapt this to a different AWS application?”
- “What would you add before using this with a real on-call team?”
- “How do you decide what belongs in a skill versus long-term memory?”
- “When would you allow remediation, and what additional controls would you want?”

## 9. Takeaways and sign-off

**Duration:** 2 minutes — puts us **60 minutes into the show**.\
**Screen:** Repository/resources and both hosts.

**Main host:**

- Recap the flow: an alarm starts an investigation and the engineer receives an evidence-backed Slack report.
- Reinforce the three reusable ideas: start with Harness defaults, scope AWS permissions, and combine runbooks with experience from previous incidents.
- Point viewers to the sample and documentation.

**Rafael:**

- Thank the main host and the audience.
- Remind viewers where to find the resources.
- Close with a light Halloween sign-off.

## Presenter preparation and timing notes

- Have the candy storefront, architecture diagram, code, three templates, CloudWatch views, and Slack channel ready to switch between.
- Store Slack settings in Secrets Manager. Use the deployment script's profile/region arguments and `demo.py --profile PROFILE --region REGION` for the live commands; no `.env` file is required.
- Rehearse the basic Harness CLI run and export. Have the resulting code/configuration and representative local session/memory files ready to show.
- Deploy the sample application and monitoring before the show and start healthy traffic early enough to establish a baseline. Make those templates available with the sample; the on-air build focuses on the agent.
- Confirm the deployment uploaded `storefront/index.html`, open the application stack's `StorefrontUrl`, and rehearse successful checkout → `haunt` → visible failure → `reset` → successful retry.
- Rehearse a real alarm → investigation → Slack delivery before the broadcast, including the actual Slack token, channel, and on-call mention.
- Prepare the dependency package and rehearse deployment beforehand. Keep a working deployed copy available if provisioning exceeds the segment, and identify it as the prepared deployment when using it.
- Complete and verify an earlier incident’s memory extraction before the show. Keep a captured investigation and Slack report available as an explicitly labeled rehearsal fallback.
- Rafael owns the clock and chat. Use waiting time for relevant questions; trim code detail or the follow-up demonstration if needed. Keep the Slack result, dedicated Q&A, and closing.
- After the show, stop traffic and clean up the demo resources.
