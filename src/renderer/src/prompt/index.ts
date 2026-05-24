import { CORE } from './core';
import { RULES } from './rules';
import { NETWORK } from './network';

export { CORE } from './core';
export { RULES } from './rules';
export { NETWORK } from './network';

export const combinePrompts = (): string => {
  return [CORE, RULES, NETWORK].join('\n\n');
};

export const DEFAULT_RULE_PROMPT = combinePrompts();
