import { CORE } from './core';
import { NETWORK } from './network';

export { CORE } from './core';
export { NETWORK } from './network';

export const combinePrompts = (): string => {
  return [CORE, NETWORK].join('\n\n');
};

export const DEFAULT_RULE_PROMPT = combinePrompts();
