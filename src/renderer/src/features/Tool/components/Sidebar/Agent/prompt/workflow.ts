export const WORKFLOW = `# WORKFLOW

1. **WAIT** — Only call tools when the user **explicitly requests** an action. After receiving tool output → respond with text → wait for next instruction.
2. **BATCH** — Combine all independent tool calls into **one message**. Sequential only when B depends on A.
3. **LIST-BEFORE-DETAIL** — Unknown ID → must call \`list_https\` first. Never guess IDs.
4. **RESPOND** — After tool results: brief explanation, ask for next step.`;
