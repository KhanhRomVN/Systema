import { CORE } from './core';
import { TOOLS } from './tools';
import { RULES } from './rules';
import { STRUCTURES } from './structures';

// Export individual modules
export { CORE } from './core';
export { TOOLS } from './tools';
export { RULES } from './rules';
export { STRUCTURES } from './structures';

export const combinePrompts = (appName: string = 'VSCode'): string => {
  const APP_CONTEXT = `CURRENT TARGET APP: ${appName}`;
  return [CORE, APP_CONTEXT, STRUCTURES, TOOLS, RULES].join('\n\n');
};

export const DEFAULT_RULE_PROMPT = combinePrompts();
