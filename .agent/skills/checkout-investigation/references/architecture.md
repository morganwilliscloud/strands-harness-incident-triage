# Haunted checkout

API Gateway invokes a Python Lambda for each checkout. The Lambda writes an order to DynamoDB. A scheduled traffic generator also invokes the Lambda directly.

The function uses a TABLE_NAME environment variable. The agent's instructions identify the expected table and application stack. Compare the deployed configuration with that information; do not assume they differ.

Successful requests log checkout.completed with an order ID. Requests log checkout.started before writing. An unrelated checkout.promotion warning can appear during successful requests.

The CloudWatch alarm measures Lambda Errors divided by Invocations. Generated traffic is included in these counts. They do not represent unique customers.

The agent's role allows specific investigation APIs plus its own memory, session, logging, model, and Slack-secret operations. It has no permission to update the sample Lambda or write orders. IAM governs AWS API requests, not local shell execution.

Recovery is performed by the engineer. A falling alarm alone does not prove a proposed fix was applied.
