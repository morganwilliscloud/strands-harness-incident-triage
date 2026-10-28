# Trick or Trace: demo commands

For a first deployment, follow the [root README](../README.md) in order: Slack, Secrets Manager, tracing, CloudFormation deployment, storefront discovery, positive test, haunt, and investigation. This page is a compact reference after setup.

Run from the repository root. Set your own profile and the same region/prefix used for deployment:

```bash
export AWS_PROFILE=default
export AWS_REGION=us-east-1
export DEMO_PREFIX=haunted
```

## Healthy checkout

```bash
npm run demo -- --prefix "$DEMO_PREFIX" reset
npm run demo -- --prefix "$DEMO_PREFIX" start-traffic
npm run demo -- --prefix "$DEMO_PREFIX" status
```

Expect 20 requests, zero errors, and a successful browser order. Wait for alarm state `OK`.

## Haunt and observe

```bash
npm run demo -- --prefix "$DEMO_PREFIX" haunt
npm run demo -- --prefix "$DEMO_PREFIX" status
```

`haunt` waits for the fault update and automatically sends one 20-request burst. Expect 20 errors. Wait for the alarm to enter `ALARM`, then inspect [traces and logs](observability.md) and the Slack report. The alarm transition, not every failing request, dispatches an investigation.

## Recover

Wait for the investigation to finish:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" reset
npm run demo -- --prefix "$DEMO_PREFIX" start-traffic
npm run demo -- --prefix "$DEMO_PREFIX" status
npm run demo -- --prefix "$DEMO_PREFIX" stop-traffic
```

Verify successful browser checkout and zero errors. Missing data can return the alarm to `OK` without fixing the app, so alarm state alone is insufficient. `start-traffic` is a single burst; `stop-traffic` also disables a schedule left enabled by an older deployment. These commands do not delete resources or stop an already-running investigation.

## Optional CLI session and memory experiments

These are advanced CLI operations, not a Slack follow-up interface or part of the main walkthrough. They return `ACCEPTED` immediately and do not print a synchronous answer or send a Slack notification. Inspect their results in observability and wait for completion before sending another request to the same session.

Copy your own incident UUID from Slack or logs, without the `incident-` prefix:

```bash
INCIDENT_ID='REPLACE_WITH_YOUR_INCIDENT_UUID'
npm run demo -- --prefix "$DEMO_PREFIX" ask "$INCIDENT_ID" \
  "What evidence supports the suspected configuration error?"
```

Only after you actually restore the configuration and verify recovery, record the confirmed resolution:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" resolve "$INCIDENT_ID" \
  "I restored TABLE_NAME to the expected table, checkout succeeded, and the alarm returned to OK."
```

Wait for completion, then search for learned information:

```bash
npm run demo -- --prefix "$DEMO_PREFIX" memories \
  "checkout ResourceNotFoundException table name"
```

AgentCore memory extraction is asynchronous. A completed invocation or flushed event does not guarantee a searchable lesson exists yet. Inspect actual retrieved results before claiming cross-incident recall.

## Clear memory before a fresh test

This **deletes** the sample's learned AgentCore records, their source conversation events, and saved objects under `sessions/` in the S3 session bucket. Wait for every active investigation and CLI request to finish first.

```bash
npm run clear-memory -- --prefix "$DEMO_PREFIX"
```

Resources are discovered from your agents stack. The caller needs CloudFormation stack reads, AgentCore list/retrieve/delete operations, and S3 list/delete operations. It checks listings and retrieval for up to five minutes and fails if data remains. Pending extraction can create records later; wait for it to finish before retrying.

This does not reset checkout, invoke traffic, or delete logs or Slack reports. After clearing, run the healthy-checkout steps and wait for `OK` before another haunt. See [cleanup](../README.md#cleanup) to delete the deployment itself.
