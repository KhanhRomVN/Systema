import { CORE } from './core';
import { TOOLS } from './tools';
import { RULES } from './rules';

// Export individual modules
export { CORE } from './core';
export { TOOLS } from './tools';
export { RULES } from './rules';

export const combinePrompts = (): string => {
  return [CORE, TOOLS, RULES].join('\n\n');
};

export const DEFAULT_RULE_PROMPT = combinePrompts();
