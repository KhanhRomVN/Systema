import { NetworkRequest } from '../types';

export interface VariableUsage {
  requestId: string;
  location: 'header' | 'body' | 'cookie' | 'url';
  key?: string;
  timestamp: number;
}

export interface TrackedVariable {
  value: string;
  sourceRequestId: string;
  sourceTimestamp: number;
  usages: VariableUsage[];
}

/**
 * Heuristic to check if a string looks like a potential variable/token
 */
function isPotentialVariable(val: string): boolean {
  if (!val || val.length < 8 || val.length > 500) return false;

  // Ignore common noise
  if (val.includes(' ') || val.includes('\n') || val.includes('\t')) return false;

  // Must have some complexity (mix of numbers/letters or special chars)
  const hasLetters = /[a-zA-Z]/.test(val);
  const hasNumbers = /[0-9]/.test(val);
  const hasSpecial = /[-._~+/=]/.test(val);

  // At least 2 of 3 types or long enough
  return Number(hasLetters) + Number(hasNumbers) + Number(hasSpecial) >= 2;
}

/**
 * Extracts potential variables from a string or object
 */
function extractPotentialValues(data: any, results: Set<string>) {
  if (!data) return;

  if (typeof data === 'string') {
    if (isPotentialVariable(data)) {
      results.add(data);
    }
    // Also try to find patterns inside the string (e.g. JSON inside string)
    // For now keep it simple
    return;
  }

  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      data.forEach((item) => extractPotentialValues(item, results));
    } else {
      Object.values(data).forEach((val) => extractPotentialValues(val, results));
    }
  }
}

export function findVariableRelationships(requests: NetworkRequest[]): TrackedVariable[] {
  const sorted = [...requests].sort((a, b) => a.timestamp - b.timestamp);
  const variables = new Map<string, TrackedVariable>();

  // Map of value -> Set of Request IDs that provided this value in Response
  const valueSources = new Map<string, { id: string; timestamp: number }>();

  for (const req of sorted) {
    // 1. Scan for USAGES of known values in this request
    const checkUsage = (val: string, location: VariableUsage['location'], key?: string) => {
      if (!val || typeof val !== 'string') return;

      // We check against all discovered sources SO FAR
      for (const [discoveredValue, source] of valueSources.entries()) {
        if (val.includes(discoveredValue)) {
          let variable = variables.get(discoveredValue);
          if (!variable) {
            variable = {
              value: discoveredValue,
              sourceRequestId: source.id,
              sourceTimestamp: source.timestamp,
              usages: [],
            };
            variables.set(discoveredValue, variable);
          }

          // Avoid duplicate usage in same request/location
          const alreadyTracked = variable.usages.some(
            (u) => u.requestId === req.id && u.location === location && u.key === key,
          );
          if (!alreadyTracked) {
            variable.usages.push({
              requestId: req.id,
              location,
              key,
              timestamp: req.timestamp,
            });
          }
        }
      }
    };

    // Check URL
    checkUsage(req.url, 'url');

    // Check Headers
    Object.entries(req.requestHeaders || {}).forEach(([k, v]) => checkUsage(v, 'header', k));

    // Check Cookies
    Object.entries(req.requestCookies || {}).forEach(([k, v]) => checkUsage(v, 'cookie', k));

    // Check Body
    if (req.requestBody) {
      checkUsage(req.requestBody, 'body');
    }

    // 2. Scan for NEW potential values in this request's RESPONSE
    const newValues = new Set<string>();

    // Check response headers (e.g. Set-Cookie, Authorization)
    Object.entries(req.responseHeaders || {}).forEach(([k, v]) =>
      extractPotentialValues(v, newValues),
    );

    // Check response body
    if (req.responseBody) {
      // Try to parse as JSON first for better extraction
      try {
        const parsed = JSON.parse(req.responseBody);
        extractPotentialValues(parsed, newValues);
      } catch {
        // Fallback to regex or heuristic extraction from raw string
        // Search for things that look like tokens: JWT, UUID, etc.
        const jwtRegex = /ey[A-Za-z0-9-_]+\.ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g;
        const uuidRegex =
          /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

        const jwts = req.responseBody.match(jwtRegex) || [];
        const uuids = req.responseBody.match(uuidRegex) || [];

        jwts.forEach((v) => newValues.add(v));
        uuids.forEach((v) => newValues.add(v));
      }
    }

    // Register new discovered values as potential sources
    newValues.forEach((val) => {
      if (!valueSources.has(val) && isPotentialVariable(val)) {
        valueSources.set(val, { id: req.id, timestamp: req.timestamp });
      }
    });
  }

  // Filter out variables that have no usages (not interesting for tracking)
  return Array.from(variables.values())
    .filter((v) => v.usages.length > 0)
    .sort((a, b) => b.value.length - a.value.length);
}
