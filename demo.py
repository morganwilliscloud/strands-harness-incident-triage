import argparse
import json
import os

import boto3
from botocore.config import Config

parser = argparse.ArgumentParser()
commands = parser.add_subparsers(dest="command", required=True)
commands.add_parser("start-traffic")
commands.add_parser("stop-traffic")
commands.add_parser("haunt")
commands.add_parser("reset")
commands.add_parser("status")
for name in ("ask", "resolve"):
    command = commands.add_parser(name)
    command.add_argument("incident_id")
    command.add_argument("text")
memories = commands.add_parser("memories")
memories.add_argument("query")
args = parser.parse_args()

cloudformation = boto3.client("cloudformation")
application = {
    item["OutputKey"]: item["OutputValue"]
    for item in cloudformation.describe_stacks(StackName=os.environ["APPLICATION_STACK"])["Stacks"][0]["Outputs"]
}

if args.command in ("start-traffic", "stop-traffic"):
    events = boto3.client("events")
    if args.command == "start-traffic":
        events.enable_rule(Name=application["TrafficRule"])
    else:
        events.disable_rule(Name=application["TrafficRule"])
    print(args.command)

elif args.command in ("haunt", "reset"):
    client = boto3.client("lambda")
    variables = client.get_function_configuration(FunctionName=application["FunctionName"])["Environment"]["Variables"]
    variables["TABLE_NAME"] = application["TableName"] + ("-missing" if args.command == "haunt" else "")
    client.update_function_configuration(FunctionName=application["FunctionName"], Environment={"Variables": variables})
    client.get_waiter("function_updated_v2").wait(FunctionName=application["FunctionName"])
    print(json.dumps({"function": application["FunctionName"], "table": variables["TABLE_NAME"]}, indent=2))

elif args.command == "status":
    monitoring = {
        item["OutputKey"]: item["OutputValue"]
        for item in cloudformation.describe_stacks(StackName=os.environ["MONITORING_STACK"])["Stacks"][0]["Outputs"]
    }
    alarm = boto3.client("cloudwatch").describe_alarms(AlarmNames=[monitoring["AlarmName"]])["MetricAlarms"][0]
    print(json.dumps({
        "alarm": alarm["AlarmName"],
        "state": alarm["StateValue"],
        "reason": alarm["StateReason"],
        "changed": alarm["StateUpdatedTimestamp"],
    }, default=str, indent=2))

else:
    agents = {
        item["OutputKey"]: item["OutputValue"]
        for item in cloudformation.describe_stacks(StackName=os.environ["AGENT_STACK"])["Stacks"][0]["Outputs"]
    }
    if args.command == "memories":
        client = boto3.client("bedrock-agentcore")
        for category in ("episodes", "reflections"):
            response = client.retrieve_memory_records(
                memoryId=agents["MemoryId"],
                namespace=f"/services/{agents['ServiceId']}/{category}/",
                searchCriteria={"searchQuery": args.query, "topK": 5},
            )
            print(json.dumps({"category": category, "records": response["memoryRecordSummaries"]}, default=str, indent=2))
    else:
        client = boto3.client("bedrock-agentcore", config=Config(read_timeout=900, retries={"total_max_attempts": 1}))
        payload = {
            "incident_id": args.incident_id,
            "prompt": (
                f"The engineer reports this confirmed resolution: {args.text}. "
                "Record the action and verification as a lesson for future incidents."
            ) if args.command == "resolve" else args.text,
            "notify": False,
        }
        response = client.invoke_agent_runtime(
            agentRuntimeArn=agents["RuntimeArn"],
            runtimeSessionId=f"incident-{args.incident_id}",
            payload=json.dumps(payload).encode(),
        )
        print(response["response"].read().decode())
