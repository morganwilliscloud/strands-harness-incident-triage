# Haunted checkout

API Gateway invokes a Lambda for each checkout. The Lambda writes an order to DynamoDB. A demo traffic generator also invokes the Lambda directly.

The application CloudFormation stack describes its deployed resources.

Successful requests log checkout.completed with an order ID. Requests log checkout.started before writing.

The CloudWatch alarm measures Lambda Errors divided by Invocations. Generated traffic is included in these counts. They do not represent unique customers.

The AWS Toolkit uses a dedicated role allowing specific investigation APIs. It cannot retrieve the Slack secret, change the sample Lambda, or write orders. The runtime handles model, memory, sessions, and Slack separately. AWS MCP executes investigation scripts remotely under the investigation identity. Host shell and general web tools are disabled.

Recovery is performed by the engineer. A falling alarm alone does not prove a proposed fix was applied.
