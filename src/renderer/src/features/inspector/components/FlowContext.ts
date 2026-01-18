import { createContext } from 'react';

export const FlowLayoutContext = createContext<{
  direction: 'vertical' | 'horizontal';
}>({ direction: 'vertical' });
