import { NetworkRequest } from '../types';

export function calculateSimilarity(req1: NetworkRequest, req2: NetworkRequest): number {
  if (req1.id === req2.id) return 100;

  let score = 0;

  // Method (10%)
  if (req1.method === req2.method) {
    score += 10;
  }

  // Host (30%)
  if (req1.host === req2.host) {
    score += 30;
  }

  // Type (10%)
  if (req1.type === req2.type) {
    score += 10;
  }

  // Path (50%)
  const path1 = req1.path.split('/').filter(Boolean);
  const path2 = req2.path.split('/').filter(Boolean);

  if (path1.length === 0 && path2.length === 0) {
    score += 50;
  } else {
    const maxLen = Math.max(path1.length, path2.length);
    let pathMatches = 0;
    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i] === path2[i]) {
        pathMatches++;
      } else {
        break; // Assume prefix match is more important
      }
    }
    score += (pathMatches / maxLen) * 50;
  }

  return Math.round(score);
}
