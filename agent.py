import asyncio
import json
import os
from functools import partial
from pathlib import Path

import boto3
from bedrock_agentcore.memory.integrations.strands.memorystore import AgentCoreMemoryStore
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from mcp_proxy_for_aws.client import aws_iam_streamablehttp_client
from slack_sdk import WebClient
from strands.session import SnapshotSessionManager
from strands.storage import S3Storage
from strands.tools.mcp import MCPClient
from strands_harness import create_harness
from strands_tools.code_interpreter import AgentCoreCodeInterpreter

app = BedrockAgentCoreApp()
root = Path(__file__).resolve().parent
region = os.environ["AWS_REGION"]
tasks = set()
os.environ["PATH"] = f"{root / 'bin'}:{os.environ['PATH']}"
os.environ["PYTHONPATH"] = f"{root}:{os.environ.get('PYTHONPATH', '')}"
os.chdir(root)


def post_report_to_slack(incident_id, report):
    slack = json.loads(boto3.client("secretsmanager").get_secret_value(
        SecretId=os.environ["SLACK_SECRET_ARN"]
    )["SecretString"])
    WebClient(token=slack["bot_token"]).chat_postMessage(
        channel=slack["channel_id"],
        text=f"👻 <@{slack['oncall_user_id']}> Incident `{incident_id}`\n\n{report}",
        unfurl_links=False,
        unfurl_media=False,
    )


@app.async_task
async def run(payload):
    incident_id = payload["incident_id"]
    print(json.dumps({"incident_id": incident_id, "stage": "investigating"}), flush=True)
    aws = MCPClient(
        partial(
            aws_iam_streamablehttp_client,
            endpoint=f"https://aws-mcp.{region}.api.aws/mcp",
            aws_region=region,
            aws_service="aws-mcp",
            metadata={"AWS_REGION": region},
        ),
        application_name="aws_toolkit",
    )
    interpreter = AgentCoreCodeInterpreter(region=region, session_name=incident_id, persist_sessions=False)
    memory = AgentCoreMemoryStore(
        memory_id=os.environ["MEMORY_ID"],
        actor_id=os.environ["SERVICE_ID"],
        session_id=incident_id,
        namespace_path="/services/{actorId}/",
        name="incident_history",
        writable=True,
        extraction=True,
        region_name=region,
    )
    storage = S3Storage(os.environ["SESSION_BUCKET"], prefix=f"sessions/{incident_id}", region_name=region)

    async with create_harness(
        model=os.environ["MODEL_ID"],
        instructions=(
            f"Investigate {os.environ['SERVICE_ID']} incidents in {region}. Incident: {incident_id}. "
            f"Lambda: {os.environ['APP_FUNCTION']}. Log group: {os.environ['APP_LOG_GROUP']}. "
            f"Expected DynamoDB table: {os.environ['APP_TABLE']}. Stack: {os.environ['APP_STACK']}. "
            "Load checkout-investigation before working. Use AWS Toolkit, shell, AWS CLI, and Python "
            "to gather evidence. Use Code Interpreter for analysis. Return the report as Slack mrkdwn."
        ),
        tools=[aws, interpreter.code_interpreter],
        memory={"stores": [memory]},
        session=SnapshotSessionManager(incident_id, storage=storage),
        storage=storage,
    ) as agent:
        report = str(await agent.invoke_async(payload["prompt"]))

    if payload.get("notify", True):
        post_report_to_slack(incident_id, report)

    print(json.dumps({"incident_id": incident_id, "stage": "completed"}), flush=True)
    return {"incident_id": incident_id, "report": report}


@app.entrypoint
async def invoke(payload):
    if payload.get("background"):
        task = asyncio.create_task(run(payload))
        tasks.add(task)
        task.add_done_callback(tasks.discard)
        await asyncio.sleep(0)
        return {"incident_id": payload["incident_id"], "status": "ACCEPTED"}
    return await run(payload)


if __name__ == "__main__":
    app.run()
