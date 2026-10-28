# Trick or Trace: demo commands

Copy one block at a time. Run commands from the repository root in the same terminal so the variables carry through. The storefront and incident agent run in AWS; this terminal controls the demo.

## 1. Prepare your terminal

Requires Node.js 22+, npm, AWS CLI, and AWS credentials for the account containing the demo stacks. For a fresh checkout:

```bash
git clone https://github.com/morganwilliscloud/strands-harness-incident-triage.git
cd strands-harness-incident-triage
```

For an existing checkout, open its directory and run `git pull`. Then:

```bash
export AWS_REGION=us-east-1
export DEMO_PREFIX=haunted
export SLACK_SECRET=haunted-oncall/slack

aws sts get-caller-identity
npm ci --ignore-scripts
npm run check
```

Check the account ID before continuing. Change the region and prefix above if your colleague deployed elsewhere. These are ordinary terminal variables, not a `.env` file. Commands use your current/default AWS credentials. If you use a named profile, run `export AWS_PROFILE=your-profile` before the commands above.

**Already deployed? Continue to section 2.** For a colleague's first deployment, complete [First-time AWS setup](#first-time-aws-setup) at the end of this guide, then return here.

## 2. Find the storefront and verify Runtime V2

```bash
STORE_URL=$(aws cloudformation describe-stacks \
  --stack-name "$DEMO_PREFIX-app" \
  --query 'Stacks[0].Outputs[?OutputKey==`StorefrontUrl`].OutputValue | [0]' \
  --output text)

RUNTIME_ARN=$(aws cloudformation describe-stacks \
  --stack-name "$DEMO_PREFIX-agents" \
  --query 'Stacks[0].Outputs[?OutputKey==`RuntimeArn`].OutputValue | [0]' \
  --output text)

RUNTIME_ID="${RUNTIME_ARN##*/}"
printf 'Open this storefront in your browser:\n%s\n' "$STORE_URL"

aws bedrock-agentcore-control get-agent-runtime \
  --agent-runtime-id "$RUNTIME_ID" \
  --query '{id:agentRuntimeId,platform:platformVersion,status:status,revision:agentRuntimeVersion}'

aws bedrock-agentcore-control list-agent-runtime-endpoints \
  --agent-runtime-id "$RUNTIME_ID" \
  --query 'runtimeEndpoints[*].{endpoint:name,status:status,liveRevision:liveVersion}'
```

Expect platform `V2`, runtime status `READY`, and a `READY` default endpoint serving the current revision. Open the printed storefront URL and your Slack report channel. The page is stored in S3 and served through API Gateway/Lambda; no local frontend server is needed.

## 3. Introduce Strands harness

Show [the basic agent](../examples/basic/agent.ts), then:

```bash
npm run basic
```

This creates and reads a Halloween checklist. Show the tool activity in the terminal, then the generated `examples/basic/checklist.md` and `.agent/sessions` directory in your editor. These default shell/file tools run on your computer.

Next, show [the incident agent](../agent.ts), its [runbook](../.agent/skills/checkout-investigation/SKILL.md), and [the deployment template](../templates/agents.yaml). The incident agent sends generated investigation scripts to the managed AWS MCP server for remote execution.

## 4. Establish healthy checkout

```bash
npm run demo -- --prefix "$DEMO_PREFIX" reset
npm run demo -- --prefix "$DEMO_PREFIX" start-traffic
npm run demo -- --prefix "$DEMO_PREFIX" status
```

Place an order in the browser and show the success message. Wait for the alarm to report `OK` before injecting the fault. Repeat the `status` command as needed.

`start-traffic` sends one immediate burst of 20 concurrent calls to the real checkout Lambda, prints request/error counts, and stops. It disables any previously enabled minute schedule. These calls bypass the browser/API Gateway and produce real application logs and metrics. Healthy checkout should return `{"requests":20,"errors":0}`.

## 5. Haunt checkout

```bash
npm run demo -- --prefix "$DEMO_PREFIX" haunt
```

`haunt` waits for the configuration update, then automatically sends the 20-request burst. Expect `{"requests":20,"errors":20}` when the fault is active. Click checkout in the storefront to show the visible failure.

`haunt` changes the checkout Lambda's `TABLE_NAME` to a nonexistent table. It then sends the traffic automatically. No separate `start-traffic` command is needed to trigger the demo. Use `start-traffic` only when you want an additional batch, such as checking healthy checkout after `reset`.

```bash
npm run demo -- --prefix "$DEMO_PREFIX" status
```

The demo alarm evaluates one one-minute period above 20% errors, with at least five requests. A failed burst satisfies the request minimum, although other traffic in that minute also contributes to the error rate. Metric publication and evaluation add delay; it is not an instant trigger. The transition into `ALARM` routes the incident to the agent. Running `haunt` again while the alarm is already `ALARM` does not create a new transition.

## 6. Watch the investigation and Slack report

In a second terminal at the repo root, set the same AWS region/profile and paste the runtime ID printed in section 2:

```bash
export AWS_REGION=us-east-1
RUNTIME_ID='PASTE_RUNTIME_ID_HERE'

aws logs tail "/aws/bedrock-agentcore/runtimes/$RUNTIME_ID-DEFAULT" \
  --since 10m --follow
```

Use AgentCore observability in the same account/region to show tool inputs, outputs, code, and timing; see [the observability guide](observability.md). Use Slack to show the report and engineer mention. Runtime logs include `investigating`, `slack_posted`, and `completed` markers for successful alarm-triggered reports.

`ACCEPTED` means the asynchronous request was dispatched. Wait for the report and completion. `Ctrl+C` stops the log viewer only; it does not stop the investigation. The burst has already finished. With no subsequent traffic, the alarm can return to `OK` because missing data is treated as nonbreaching, even if checkout is still broken. Verify recovery with an actual successful checkout.

## 7. Fix checkout and verify recovery

Back in the first terminal:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" reset
```

Click checkout again and show a successful order. Send a healthy burst, then check the alarm:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" start-traffic
npm run demo -- --prefix "$DEMO_PREFIX" status
```

Repeat the `status` command until the alarm is `OK`. There is no recurring traffic to stop; this cleanup command also disables a schedule left on by an older deployment:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" stop-traffic
```

The engineer performs the reset; the agent only investigates and recommends.

## 8. Follow up and record the lesson

Copy the incident UUID from the Slack report or runtime logs. Use the UUID alone, without the `incident-` session prefix. Wait for the original investigation to finish.

```bash
INCIDENT_ID='PASTE_INCIDENT_UUID_HERE'

npm run demo -- --prefix "$DEMO_PREFIX" ask "$INCIDENT_ID" \
  "What evidence supports the suspected configuration error?"
```

This returns `ACCEPTED`. Wait for completion in logs/observability before sending the next request to the same incident.

After you have verified checkout success and the alarm's return to `OK`:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" resolve "$INCIDENT_ID" \
  "I restored TABLE_NAME to the expected table, checkout succeeded, and the alarm returned to OK."
```

After that request completes, search for the lesson:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" memories \
  "checkout ResourceNotFoundException table name"
```

`ask` and `resolve` do not send Slack notifications. Memory extraction is asynchronous, so the search may initially return no records. Rehearse and verify a lesson before relying on a recall demonstration.

To demonstrate a second incident, repeat sections 4–7 after the alarm is `OK`. Inspect the actual memory/tool results before claiming the agent recalled the earlier lesson.

## Finish or stop the demo early

```bash
npm run demo -- --prefix "$DEMO_PREFIX" reset
npm run demo -- --prefix "$DEMO_PREFIX" stop-traffic
```

This restores configuration and disables any legacy scheduled traffic. It does not delete the deployment, cancel a burst already running, or cancel an investigation. For verified recovery, follow section 7.

## First-time AWS setup

Do this before the stream. Use the terminal settings from section 1. The deployment also needs the `zip` command and permissions to provision the resources in the three templates.

Create/install a Slack app with `chat:write`, invite the bot into the report channel, then:

```bash
bash scripts/setup-slack.sh "$AWS_REGION" "$SLACK_SECRET"
```

The script prompts for `bot_token`, `channel_id`, and `oncall_user_id`. If that secret already exists and you intend to replace its values, add `update` as the last argument. It hides the token and writes directly to Secrets Manager.

The existing deployment helper requires an AWS profile name as its first argument. Choose a configured profile, using `default` if that is the profile you use:

```bash
DEPLOY_PROFILE="${AWS_PROFILE:-default}"
DEMO_MODEL='bedrock/us.anthropic.claude-sonnet-5-5'

aws sts get-caller-identity --profile "$DEPLOY_PROFILE"
bash scripts/deploy.sh "$DEPLOY_PROFILE" "$AWS_REGION" \
  "$DEMO_MODEL" "$SLACK_SECRET" "$DEMO_PREFIX"
```

The deployment provisions the application, agent, and monitoring stacks and uploads the storefront and agent artifact. Deploy the updated application and monitoring templates before using the one-burst CLI; it requires the `TrafficFunction` stack output and the one-period demo alarm. Both agent examples currently hardcode the model above; changing the helper's model argument alone does not change either agent's model. Confirm that model is available to the demo account before rehearsal.

Use the same AWS identity for subsequent commands, for example `export AWS_PROFILE="$DEPLOY_PROFILE"`. Follow the [observability prerequisites](observability.md), then return to section 2. Keep first-time provisioning out of the live demo's short deployment segment.
