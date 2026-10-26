set -eu

profile="${1:?Usage: bash scripts/deploy-app.sh PROFILE REGION [PREFIX]}"
region="${2:?Specify the AWS region}"
name_prefix="${3:-haunted}"
aws_cli=(aws --profile "$profile" --region "$region")
cd "$(dirname "$0")/.."

"${aws_cli[@]}" cloudformation deploy \
  --stack-name "$name_prefix-app" \
  --template-file templates/application.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

artifact_bucket=$("${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-app" \
  --query "Stacks[0].Outputs[?OutputKey=='ArtifactBucket'].OutputValue | [0]" --output text)
"${aws_cli[@]}" s3 cp storefront/index.html "s3://$artifact_bucket/storefront/index.html" --content-type 'text/html; charset=utf-8'

"${aws_cli[@]}" cloudformation deploy \
  --stack-name "$name_prefix-monitoring" \
  --template-file templates/monitoring.yaml \
  --parameter-overrides "ApplicationStack=$name_prefix-app" \
  --no-fail-on-empty-changeset

"${aws_cli[@]}" cloudformation describe-stacks --stack-name "$name_prefix-app" \
  --query "Stacks[0].Outputs[?OutputKey=='StorefrontUrl'].OutputValue | [0]" --output text
