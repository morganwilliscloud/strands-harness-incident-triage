set -eu

profile="${1:?Usage: bash scripts/deploy.sh PROFILE REGION MODEL_ID SLACK_SECRET_NAME [PREFIX]}"
region="${2:?Specify the AWS region}"
model_id="${3:?Specify the Bedrock model or inference profile ID}"
slack_secret="${4:?Specify the Slack configuration secret name or ARN}"
name_prefix="${5:-haunted}"
aws_cli=(aws --profile "$profile" --region "$region")
cd "$(dirname "$0")/.."
slack_secret_arn=$("${aws_cli[@]}" secretsmanager describe-secret --secret-id "$slack_secret" \
  --query ARN --output text)

bash scripts/deploy-app.sh "$profile" "$region" "$name_prefix"

artifact_bucket=$("${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-app" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucket'].OutputValue | [0]" --output text)

bash scripts/package.sh
archive_path=$(cat .build/archive-path)
artifact_key="agents/$(basename "$archive_path")"
"${aws_cli[@]}" s3 cp "$archive_path" "s3://$artifact_bucket/$artifact_key"

"${aws_cli[@]}" cloudformation deploy \
  --stack-name "$name_prefix-agents" \
  --template-file templates/agents.yaml \
  --capabilities CAPABILITY_IAM \
  --disable-rollback \
  --parameter-overrides \
    "ApplicationStack=$name_prefix-app" \
    "NamePrefix=$name_prefix" \
    "ArtifactKey=$artifact_key" \
    "ModelId=$model_id" \
    "SlackSecretArn=$slack_secret_arn" \
  --no-fail-on-empty-changeset

intake_arn=$("${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-agents" \
  --query "Stacks[0].Outputs[?OutputKey=='IntakeArn'].OutputValue | [0]" --output text)
"${aws_cli[@]}" cloudformation deploy \
  --stack-name "$name_prefix-monitoring" \
  --template-file templates/monitoring.yaml \
  --parameter-overrides "ApplicationStack=$name_prefix-app" "IntakeArn=$intake_arn" \
  --no-fail-on-empty-changeset

"${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-agents" --query 'Stacks[0].Outputs'
"${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-app" \
  --query "Stacks[0].Outputs[?OutputKey=='StorefrontUrl'].OutputValue | [0]" --output text
