import { IDENTITY } from './identity';
import { WORKFLOW } from './workflow';
import { CONSTRAINTS } from './constraints';
import { TOOLS_REFERENCE } from './tools-reference';

export { IDENTITY } from './identity';
export { WORKFLOW } from './workflow';
export { CONSTRAINTS } from './constraints';
export { TOOLS_REFERENCE } from './tools-reference';
export { HISTORY_CONTEXT_REMINDER } from './history-context';
export { AFTER_PAUSE_REMINDER } from './after-pause';

export const DEFAULT_RULE_PROMPT = [IDENTITY, WORKFLOW, CONSTRAINTS, TOOLS_REFERENCE].join('\n\n---\n\n');
