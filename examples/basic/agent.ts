import { createHarness } from '@strands-agents/harness'

await using agent = await createHarness({
  model: process.env.MODEL_ID || 'bedrock/us.anthropic.claude-sonnet-5-5',
})

await agent.invoke(
  process.argv.slice(2).join(' ') ||
  'Create a short Halloween party checklist in checklist.md, then read it back and summarize it.',
)
