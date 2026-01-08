export interface ImportantMatchRule {
  key: string;
  value?: string;
}

export interface ImportantCriteria {
  headers: ImportantMatchRule[];
  cookies: ImportantMatchRule[];
  body: ImportantMatchRule[];
}

export const DEFAULT_IMPORTANT_CRITERIA: ImportantCriteria = {
  headers: [
    { key: 'Authorization' },
    { key: 'Token' },
    { key: 'Access-Token' },
    { key: 'X-Auth-Token' },
  ],
  cookies: [{ key: 'session_id' }, { key: 'token' }, { key: 'auth' }, { key: 'jwt' }],
  body: [
    { key: 'password' },
    { key: 'token' },
    { key: 'access_token' },
    { key: 'refresh_token' },
    { key: 'secret' },
    { key: 'key' },
  ],
};

export function getImportantMatches(data: unknown, rules: ImportantMatchRule[]): number {
  if (!data) return 0;
  let count = 0;

  const checkValues = (key: string, val: unknown) => {
    // Check if this pair matches any rule
    for (const rule of rules) {
      const keyMatch = key.toLowerCase().includes(rule.key.toLowerCase());
      if (keyMatch) {
        if (!rule.value) {
          // Key match only required
          count++;
        } else if (
          val &&
          typeof val === 'string' &&
          val.toLowerCase().includes(rule.value.toLowerCase())
        ) {
          // Value match also required and satisfied
          count++;
        }
      }
    }
  };

  const traverse = (current: unknown) => {
    if (current == null) return;

    if (Array.isArray(current)) {
      current.forEach((item) => {
        // Special handling for Header/Cookie objects {name, value}
        if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
          checkValues(item.name, item.value);
        } else {
          traverse(item);
        }
      });
    } else if (typeof current === 'object') {
      Object.entries(current).forEach(([k, v]) => {
        checkValues(k, v); // Check the key-value pair itself
        traverse(v); // Recurse
      });
    }
  };

  traverse(data);
  return count;
}
