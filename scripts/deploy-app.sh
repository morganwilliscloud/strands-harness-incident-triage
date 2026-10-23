set -eu

aws cloudformation deploy \
  --stack-name "$APPLICATION_STACK" \
  --template-file templates/application.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

artifact_bucket=$(aws cloudformation describe-stacks --stack-name "$APPLICATION_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucket'].OutputValue | [0]" --output text)
aws s3 cp storefront/index.html "s3://$artifact_bucket/storefront/index.html" --content-type 'text/html; charset=utf-8'

aws cloudformation deploy \
  --stack-name "$MONITORING_STACK" \
  --template-file templates/monitoring.yaml \
  --parameter-overrides "ApplicationStack=$APPLICATION_STACK" \
  --no-fail-on-empty-changeset

aws cloudformation describe-stacks --stack-name "$APPLICATION_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='StorefrontUrl'].OutputValue | [0]" --output text
