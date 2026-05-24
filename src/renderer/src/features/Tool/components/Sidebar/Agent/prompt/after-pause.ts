/**
 * Appended to the first user message after a generation was paused/stopped.
 * Instructs the AI to review context before resuming.
 */
export const AFTER_PAUSE_REMINDER = `

---
**Note:** The previous generation was interrupted. Review the current state of any relevant context before continuing to ensure your understanding is accurate.`;
