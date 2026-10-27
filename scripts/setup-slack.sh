#!/usr/bin/env bash
set +x
set -euo pipefail

region="${1:-us-east-1}"
secret_name="${2:-haunted-oncall/slack}"
action="${3:-create}"

case "$action" in
  create) operation=(create-secret --name "$secret_name") ;;
  update) operation=(put-secret-value --secret-id "$secret_name") ;;
  *) printf 'Usage: bash scripts/setup-slack.sh [REGION] [SECRET_NAME] [create|update]\n' >&2; exit 1 ;;
esac

read -r -s -p 'Slack bot token (xoxb-…): ' slack_bot_token
printf '\n'
read -r -p 'Slack channel ID: ' slack_channel_id
read -r -p 'On-call Slack member ID: ' slack_oncall_id

if [[ -z "$slack_bot_token" || -z "$slack_channel_id" || -z "$slack_oncall_id" ]]; then
  printf 'All three values are required.\n' >&2
  exit 1
fi

printf '%s\n' "$slack_bot_token" "$slack_channel_id" "$slack_oncall_id" |
  node -e '
    const [bot_token, channel_id, oncall_user_id] = require("node:fs").readFileSync(0, "utf8").trimEnd().split("\n")
    process.stdout.write(JSON.stringify({ bot_token, channel_id, oncall_user_id }))
  ' |
  aws secretsmanager "${operation[@]}" \
    --region "$region" \
    --secret-string file:///dev/stdin \
    --query ARN --output text --no-cli-pager
