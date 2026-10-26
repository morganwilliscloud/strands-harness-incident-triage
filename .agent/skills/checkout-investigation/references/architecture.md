# Haunted checkout

API Gateway invokes a Python Lambda for each checkout. The Lambda writes an order to DynamoDB. A scheduled traffic generator also invokes the Lambda directly.

The function uses a TABLE_NAME environment variable. The agent's instructions identify the expected table and application stack. Compare the deployed configuration with that information; do not assume they differ.

Successful requests log checkout.completed with an order ID. Requests log checkout.started before writing. An unrelated checkout.promotion warning can appear during successful requests.

The CloudWatch alarm measures Lambda Errors divided by Invocations. Generated traffic is included in these counts. They do not represent unique customers.

The AWS Toolkit uses a dedicated role allowing specific investigation APIs. It cannot retrieve the Slack secret, change the sample Lambda, or write orders. The runtime handles model, memory, sessions, and Slack separately. Code Interpreter has a separate execution role with no AWS resource permissions and SANDBOX networking. Host shell and general web tools are disabled.

Recovery is performed by the engineer. A falling alarm alone does not prove a proposed fix was applied.
