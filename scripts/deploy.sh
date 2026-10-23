set -eu

bash scripts/deploy-app.sh

artifact_bucket=$(aws cloudformation describe-stacks --stack-name "$APPLICATION_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucket'].OutputValue | [0]" --output text)

bash scripts/package.sh
archive_path=$(cat .build/archive-path)
artifact_key="agents/$(basename "$archive_path")"
aws s3 cp "$archive_path" "s3://$artifact_bucket/$artifact_key"

aws cloudformation deploy \
  --stack-name "$AGENT_STACK" \
  --template-file templates/agents.yaml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    "ApplicationStack=$APPLICATION_STACK" \
    "NamePrefix=$NAME_PREFIX" \
    "ArtifactKey=$artifact_key" \
    "ModelId=$MODEL_ID" \
    "SlackSecretArn=$SLACK_SECRET_ARN" \
    "SlackChannelId=$SLACK_CHANNEL_ID" \
    "SlackOncallUserId=$SLACK_ONCALL_USER_ID" \
  --no-fail-on-empty-changeset

intake_arn=$(aws cloudformation describe-stacks --stack-name "$AGENT_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='IntakeArn'].OutputValue | [0]" --output text)
aws cloudformation deploy \
  --stack-name "$MONITORING_STACK" \
  --template-file templates/monitoring.yaml \
  --parameter-overrides "ApplicationStack=$APPLICATION_STACK" "IntakeArn=$intake_arn" \
  --no-fail-on-empty-changeset

aws cloudformation describe-stacks --stack-name "$AGENT_STACK" --query 'Stacks[0].Outputs'
aws cloudformation describe-stacks --stack-name "$APPLICATION_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='StorefrontUrl'].OutputValue | [0]" --output text
