import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { NetworkRequest } from '../../../types/inspector';
import { cn } from '../../../shared/lib/utils';
import { Check } from 'lucide-react';

export const VALUE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#a855f7', // purple
  '#eab308', // yellow
];

function getValueColor(val: string, allVals: string[]): string {
  const idx = allVals.indexOf(val);
  if (idx === -1) return '#3b82f6';
  return VALUE_COLORS[idx % VALUE_COLORS.length];
}

const BLACKLIST = new Set([
  'keep-alive',
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/html',
  'text/plain',
  'text/javascript',
  'application/javascript',
  'no-cache',
  'no-store',
  'must-revalidate',
  'max-age=0',
  'postman-token',
  'content-type',
  'content-length',
  'connection',
  'accept-encoding',
  'accept-language',
  'sec-ch-ua',
  'user-agent',
  'x-requested-with',
  'undefined',
  'same-origin',
  'same-site',
  'cross-origin',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'upgrade-insecure-requests',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'strict-transport-security',
  'content-security-policy',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-max-age',
  'origin-agent-cluster',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'content-encoding',
  'transfer-encoding',
  'cache-control',
]);

const HEADER_BLACKLIST = new Set([
  // CORS & Security Headers
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-max-age',
  'access-control-expose-headers',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'origin-agent-cluster',
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',

  // Caching & CDNs
  'cache-control',
  'pragma',
  'expires',
  'etag',
  'x-cache',
  'x-cache-lookup',
  'via',
  'x-amz-cf-pop',
  'x-amz-cf-id',
  'x-amz-cf-cf-id',
  'x-cdn-provider',
  'server',
  'date',
  'last-modified',
  'age',

  // Generic Request Headers
  'accept',
  'accept-encoding',
  'accept-language',
  'connection',
  'content-length',
  'content-type',
  'content-encoding',
  'transfer-encoding',
  'host',
  'origin',
  'referer',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'user-agent',
  'x-requested-with',
  'x-client-locale',
  'x-client-platform',
  'x-client-timezone-offset',
  'x-app-version',
  'x-client-version',
]);

function extractValues(data: unknown, out = new Set<string>()): Set<string> {
  if (!data) return out;
  
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return out;
    
    // Try to parse as JSON first
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        extractValues(parsed, out);
        return out;
      } catch (e) {
        // Failed to parse, fall back to string processing
      }
    }
    
    // Extract any UUID/hash-like patterns (hex and hyphens)
    const uuids = trimmed.match(/[a-f0-9-]{8,}/gi);
    if (uuids) {
      uuids.forEach(id => {
        const cleaned = id.replace(/^-+|-+$/g, '');
        if (cleaned.length >= 8 && !BLACKLIST.has(cleaned.toLowerCase())) {
          out.add(cleaned);
        }
      });
    }

    // Check if it is a sentence (contains spaces/newlines)
    if (trimmed.includes(' ') || trimmed.includes('\n')) {
      // It's a sentence, don't split into words to avoid generic word matching
      if (trimmed.length >= 8 && trimmed.length < 100 && !BLACKLIST.has(trimmed.toLowerCase())) {
        out.add(trimmed);
      }
    } else {
      // It's a single word/token
      if (trimmed.length >= 8 && !BLACKLIST.has(trimmed.toLowerCase())) {
        out.add(trimmed);
      }
    }
    return out;
  }
  
  if (typeof data === 'number') {
    const s = String(data);
    if (s.length >= 8) {
      out.add(s);
    }
    return out;
  }
  
  if (Array.isArray(data)) {
    for (const item of data) {
      extractValues(item, out);
    }
    return out;
  }
  
  if (typeof data === 'object') {
    for (const v of Object.values(data as Record<string, unknown>)) {
      extractValues(v, out);
    }
  }
  
  return out;
}

function findJsonPath(obj: any, val: string, currentPath = ''): string | null {
  if (!obj) return null;
  
  if (typeof obj === 'string') {
    if (obj.includes(val)) {
      return currentPath;
    }
  } else if (typeof obj === 'number' || typeof obj === 'boolean') {
    if (String(obj).includes(val)) {
      return currentPath;
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const path = findJsonPath(obj[i], val, currentPath ? `${currentPath}[${i}]` : `[${i}]`);
      if (path) return path;
    }
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = findJsonPath(value, val, currentPath ? `${currentPath}.${key}` : key);
      if (path) return path;
    }
  }
  return null;
}

function getFieldInBody(bodyStr: string | undefined, val: string): string {
  if (!bodyStr) return 'body';
  try {
    const parsed = JSON.parse(bodyStr);
    const jsonPath = findJsonPath(parsed, val);
    if (jsonPath) return jsonPath;
  } catch (e) {
    // Plain text or invalid JSON
  }
  return 'body';
}

function findRequestField(req: NetworkRequest, val: string): string | null {
  if (req.requestBody && typeof req.requestBody === 'string' && req.requestBody.includes(val)) {
    return getFieldInBody(req.requestBody, val);
  }
  if (req.requestHeaders && typeof req.requestHeaders === 'object') {
    for (const [key, value] of Object.entries(req.requestHeaders)) {
      if (HEADER_BLACKLIST.has(key.toLowerCase())) continue;
      if (String(value).includes(val)) {
        if (key.toLowerCase() === 'cookie') {
          const cookies = String(value).split(';');
          for (const c of cookies) {
            const parts = c.trim().split('=');
            if (parts.length >= 2) {
              const cName = parts[0].trim();
              const cVal = parts.slice(1).join('=').trim();
              if (cVal.includes(val)) {
                return `cookie (${cName})`;
              }
            }
          }
        }
        return key;
      }
    }
  }
  if (req.path && req.path.includes(val)) {
    return 'path';
  }
  return null;
}

function findResponseField(req: NetworkRequest, val: string): string | null {
  if (req.responseBody && typeof req.responseBody === 'string' && req.responseBody.includes(val)) {
    return getFieldInBody(req.responseBody, val);
  }
  if (req.responseHeaders && typeof req.responseHeaders === 'object') {
    for (const [key, value] of Object.entries(req.responseHeaders)) {
      if (HEADER_BLACKLIST.has(key.toLowerCase())) continue;
      if (String(value).includes(val)) {
        if (key.toLowerCase() === 'set-cookie') {
          const parts = String(value).trim().split(';')[0].split('=');
          if (parts.length >= 2) {
            const cName = parts[0].trim();
            const cVal = parts.slice(1).join('=').trim();
            if (cVal.includes(val)) {
              return `set-cookie (${cName})`;
            }
          }
        }
        return key;
      }
    }
  }
  if (req.responseCookies && typeof req.responseCookies === 'object') {
    for (const [key, value] of Object.entries(req.responseCookies)) {
      if (String(value).includes(val)) return key;
    }
  }
  return null;
}

function categorizeValue(req: NetworkRequest, val: string): 'header req' | 'header res' | 'body req' | 'body res' {
  if (req.requestBody && typeof req.requestBody === 'string' && req.requestBody.includes(val)) {
    return 'body req';
  }
  if (req.responseBody && typeof req.responseBody === 'string' && req.responseBody.includes(val)) {
    return 'body res';
  }
  if (req.requestHeaders && typeof req.requestHeaders === 'object') {
    for (const [key, value] of Object.entries(req.requestHeaders)) {
      if (HEADER_BLACKLIST.has(key.toLowerCase())) continue;
      if (String(value).includes(val)) return 'header req';
    }
  }
  if (req.path && req.path.includes(val)) {
    return 'header req';
  }
  if (req.requestCookies && typeof req.requestCookies === 'object') {
    for (const value of Object.values(req.requestCookies)) {
      if (String(value).includes(val)) return 'header req';
    }
  }
  if (req.responseHeaders && typeof req.responseHeaders === 'object') {
    for (const [key, value] of Object.entries(req.responseHeaders)) {
      if (HEADER_BLACKLIST.has(key.toLowerCase())) continue;
      if (String(value).includes(val)) return 'header res';
    }
  }
  if (req.responseCookies && typeof req.responseCookies === 'object') {
    for (const value of Object.values(req.responseCookies)) {
      if (String(value).includes(val)) return 'header res';
    }
  }
  return 'header req';
}

function canonicalKey(req: NetworkRequest): string {
  const normPath = req.path.replace(/\/[a-f0-9-]{8,}(\/|$)/g, '/:id$1').replace(/\/\d+(\/|$)/g, '/:n$1');
  return `${req.method}|${req.host}|${normPath}`;
}

const NODE_W = 260;

function estimateNodeHeight(node: Node): number {
  const matches = (node.data?.matches as { field: string; value: string }[]) || [];
  if (matches.length === 0) return 60;

  const categories = new Set<string>();
  const req = node.data?.request as NetworkRequest;
  matches.forEach((m) => {
    if (req) {
      categories.add(categorizeValue(req, m.value));
    }
  });

  const groupCount = categories.size;
  const itemCount = matches.length;

  return 45 + 20 + itemCount * 18 + groupCount * 18;
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 120 });

  nodes.forEach((n) => {
    const height = estimateNodeHeight(n);
    g.setNode(n.id, { width: NODE_W, height });
  });

  edges.forEach((e) => {
    const targetNode = nodes.find((n) => n.id === e.target);
    const sameHost = targetNode?.data?.sameHost ?? false;
    g.setEdge(e.source, e.target, { weight: sameHost ? 3 : 1 });
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const height = estimateNodeHeight(n);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - height / 2 } };
  });
}

function methodColor(method: string) {
  if (method === 'GET') return 'text-primary';
  if (method === 'POST') return 'text-success';
  if (method === 'PUT') return 'text-warning';
  if (method === 'DELETE') return 'text-error';
  return 'text-text-primary';
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-success';
  if (status >= 300 && status < 400) return 'text-warning';
  if (status >= 400) return 'text-error';
  return 'text-text-secondary';
}

function RequestNode({ data, selected }: { data: any; selected?: boolean }) {
  const req: NetworkRequest = data.request;
  const isRoot: boolean = data.isRoot;
  const matches: { field: string; value: string; hasIncoming?: boolean; hasOutgoing?: boolean }[] = data.matches || [];
  const activeMatches = data.activeMatches || {};
  const onToggleMatch = data.onToggleMatch;
  const focusedValue = data.focusedValue;
  const onFocusValue = data.onFocusValue;
  const rootValsArray = data.rootValsArray || [];

  const getValueColor = (val: string): string => {
    const idx = rootValsArray.indexOf(val);
    if (idx === -1) return '#3b82f6';
    return VALUE_COLORS[idx % VALUE_COLORS.length];
  };

  const groupedMatches = useMemo(() => {
    const groups: Record<'header req' | 'header res' | 'body req' | 'body res', { field: string; value: string }[]> = {
      'header req': [],
      'header res': [],
      'body req': [],
      'body res': [],
    };
    
    matches.forEach((m) => {
      const cat = categorizeValue(req, m.value);
      groups[cat].push(m);
    });
    
    return groups;
  }, [matches, req]);

  const hasFocusedValue = useMemo(() => {
    if (!focusedValue) return false;
    return matches.some((m) => m.value === focusedValue);
  }, [matches, focusedValue]);

  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-xs bg-background shadow-sm w-[260px] transition-all duration-300',
        (isRoot || selected) ? 'border-primary shadow-sm shadow-primary/20' : 'border-divider',
        focusedValue && !hasFocusedValue && !isRoot && 'opacity-25 grayscale pointer-events-none',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('font-bold shrink-0', methodColor(req.method))}>{req.method}</span>
        <span className={cn('shrink-0', statusColor(req.status))}>{req.status || '…'}</span>
        <span className="text-text-secondary truncate">{req.host}</span>
      </div>
      <div className="text-text-primary truncate mt-0.5">{req.path}</div>
      {matches.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 border-t border-divider/40 pt-2">
          {(Object.entries(groupedMatches) as [keyof typeof groupedMatches, typeof matches][]).map(([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-1">
                <div className="text-[9px] uppercase font-bold text-text-secondary opacity-60 tracking-wider">
                  {category}
                </div>
                <div className="flex flex-col gap-1">
                  {items.map(({ field, value, hasIncoming, hasOutgoing }) => {
                    const isChecked = activeMatches[value] !== false;
                    const isFocused = focusedValue === value;
                    const isDimmed = focusedValue ? focusedValue !== value : false;
                    const dotColor = isDimmed ? 'rgb(var(--border))' : getValueColor(value);

                    return (
                      <div
                        key={`${field}-${value}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onFocusValue) {
                            onFocusValue(isFocused ? null : value);
                          }
                        }}
                        onContextMenu={(e) => {
                          if (data.onAttributeContextMenu) {
                            e.preventDefault();
                            e.stopPropagation();
                            data.onAttributeContextMenu(e, field, value);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1.5 min-w-0 relative group py-0.5 px-1 -mx-1 rounded border border-transparent transition-all cursor-pointer select-none',
                          isFocused
                            ? 'bg-primary/20 border-primary/40 text-text-primary shadow-sm shadow-primary/10'
                            : 'hover:bg-zinc-800/85 hover:border-divider/25 text-text-secondary hover:text-text-primary',
                        )}
                      >
                        {isRoot && onToggleMatch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleMatch(value);
                            }}
                            className={cn(
                              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none shrink-0',
                              isChecked
                                ? 'bg-primary border-primary text-text-primary shadow-sm shadow-primary/20'
                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 text-transparent',
                            )}
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                          </button>
                        )}
                        <span
                          className="font-mono text-[10px] truncate flex-1 pr-2"
                          title={`${field}: ${value}`}
                        >
                          <span className="opacity-75">{field}: </span>
                          <span className={cn(isFocused ? 'text-primary font-bold' : 'text-text-primary')}>{value}</span>
                        </span>

                        {isRoot ? (
                          <Handle
                            type="source"
                            position={Position.Right}
                            id={value}
                            style={{
                              right: -13,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              backgroundColor: isDimmed ? 'rgb(var(--border))' : 'var(--background)',
                              border: `2px solid ${dotColor}`,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              opacity: isDimmed ? 0.3 : 1,
                            }}
                          />
                        ) : (
                          <>
                            {hasIncoming && (
                              <Handle
                                type="target"
                                position={Position.Left}
                                id={value}
                                style={{
                                  left: -13,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  backgroundColor: isDimmed ? 'rgb(var(--border))' : 'var(--background)',
                                  border: `2px solid ${dotColor}`,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  opacity: isDimmed ? 0.3 : 1,
                                }}
                              />
                            )}
                            {hasOutgoing && (
                              <Handle
                                type="source"
                                position={Position.Right}
                                id={value}
                                style={{
                                  right: -13,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  backgroundColor: isDimmed ? 'rgb(var(--border))' : 'var(--background)',
                                  border: `2px solid ${dotColor}`,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  opacity: isDimmed ? 0.3 : 1,
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const tracePanelNodeTypes = { request: RequestNode };

interface TracePanelProps {
  request: NetworkRequest;
  requests: NetworkRequest[];
  onSelectRequest?: (id: string) => void;
  onSetCompare1?: (req: NetworkRequest) => void;
  onSetCompare2?: (req: NetworkRequest) => void;
}

function TracePanelInner({ request, requests, onSelectRequest, onSetCompare1, onSetCompare2 }: TracePanelProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeMatches, setActiveMatches] = useState<Record<string, boolean>>({});
  const [focusedValue, setFocusedValue] = useState<string | null>(null);

  const getRequestAllValues = (req: NetworkRequest): Set<string> => {
    const out = new Set<string>();
    
    if (req.path) {
      const uuids = req.path.match(/[a-f0-9-]{8,}/gi);
      if (uuids) {
        uuids.forEach(id => out.add(id));
      }
      extractValues(req.path, out);
    }
    
    const extractHeaders = (headers: unknown) => {
      if (!headers || typeof headers !== 'object') return;
      for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
        if (HEADER_BLACKLIST.has(key.toLowerCase())) continue;
        extractValues(value, out);
      }
    };
    
    extractHeaders(req.requestHeaders);
    extractHeaders(req.responseHeaders);
    extractValues(req.requestBody, out);
    extractValues(req.responseBody, out);
    extractValues(req.responseCookies, out);
    
    const filtered = new Set<string>();
    for (const val of out) {
      if (val && val.length >= 8 && !BLACKLIST.has(val.toLowerCase())) {
        filtered.add(val);
      }
    }
    return filtered;
  };

  const rootVals = useMemo(() => {
    return getRequestAllValues(request);
  }, [request]);

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    rootVals.forEach((val) => {
      initial[val] = true;
    });
    setActiveMatches(initial);
    setFocusedValue(null);
  }, [rootVals]);

  const onToggleMatch = (val: string) => {
    setActiveMatches((prev) => ({
      ...prev,
      [val]: !prev[val],
    }));
  };

  const { rawNodes, rawEdges } = useMemo(() => {
    const rootKey = canonicalKey(request);
    
    const enabledRootVals = new Set<string>();
    rootVals.forEach((val) => {
      if (activeMatches[val] !== false) {
        enabledRootVals.add(val);
      }
    });

    if (rootVals.size === 0) {
      return { rawNodes: [], rawEdges: [] };
    }

    const discoveredList: string[] = [];
    const discoveredSet = new Set<string>();
    const registerVal = (val: string) => {
      if (!discoveredSet.has(val)) {
        discoveredSet.add(val);
        discoveredList.push(val);
      }
    };
    rootVals.forEach(val => registerVal(val));

    const candidateRequests = requests.filter((r) => r.host === request.host);
    candidateRequests.sort((a, b) => a.timestamp - b.timestamp);

    const canonicalMap = new Map<string, NetworkRequest>();
    candidateRequests.forEach((r) => {
      const key = canonicalKey(r);
      if (!canonicalMap.has(key)) {
        canonicalMap.set(key, r);
      } else {
        if (r.id === request.id) {
          canonicalMap.set(key, r);
        }
      }
    });
    
    const uniqueCandidates = Array.from(canonicalMap.values());
    uniqueCandidates.sort((a, b) => a.timestamp - b.timestamp);

    const activeValueSources = new Map<string, { reqKey: string; timestamp: number }>();
    enabledRootVals.forEach((val) => {
      activeValueSources.set(val, { reqKey: rootKey, timestamp: request.timestamp });
    });

    const inTrace = new Set<string>([rootKey]);
    const rEdges: Edge[] = [];
    let edgeIdx = 0;
    const nodeMatches = new Map<string, Set<string>>();
    nodeMatches.set(rootKey, new Set<string>());

    uniqueCandidates.forEach((r) => {
      if (r.id === request.id) return;
      
      const rKey = canonicalKey(r);
      const rVals = getRequestAllValues(r);
      
      const matchedVals = new Set<string>();
      rVals.forEach((val) => {
        if (activeValueSources.has(val)) {
          matchedVals.add(val);
        }
      });
      
      if (matchedVals.size > 0) {
        inTrace.add(rKey);
        nodeMatches.set(rKey, new Set<string>());
        
        matchedVals.forEach((val) => {
          registerVal(val);
          nodeMatches.get(rKey)?.add(val);
          
          const sourceInfo = activeValueSources.get(val)!;
          rEdges.push({
            id: `e-${edgeIdx++}`,
            source: sourceInfo.reqKey,
            target: rKey,
            sourceHandle: val,
            targetHandle: val,
            style: {},
            data: { val },
          } as any);
        });
        
        rVals.forEach((val) => {
          registerVal(val);
          activeValueSources.set(val, { reqKey: rKey, timestamp: r.timestamp });
        });
      }
    });

    const uniqueMatched = uniqueCandidates.filter((r) => inTrace.has(canonicalKey(r)));

    rEdges.forEach((edge: any) => {
      const val = edge.data.val;
      const isFocusedEdge = focusedValue ? val === focusedValue : true;
      const edgeColor = getValueColor(val, discoveredList);
      edge.style = {
        stroke: isFocusedEdge ? edgeColor : 'rgb(var(--border))',
        strokeWidth: isFocusedEdge ? 1.8 : 1,
        opacity: isFocusedEdge ? 1 : 0.08,
      };
    });

    const nodeIncoming = new Map<string, Set<string>>();
    const nodeOutgoing = new Map<string, Set<string>>();
    
    uniqueMatched.forEach((r) => {
      const k = canonicalKey(r);
      nodeIncoming.set(k, new Set<string>());
      nodeOutgoing.set(k, new Set<string>());
    });

    rEdges.forEach((edge) => {
      const val = (edge as any).data.val;
      nodeOutgoing.get(edge.source)?.add(val);
      nodeIncoming.get(edge.target)?.add(val);
    });

    const rNodes: Node[] = uniqueMatched.map((req) => {
      const key = canonicalKey(req);
      const isRootNode = req.id === request.id;
      
      const incoming = nodeIncoming.get(key) || new Set<string>();
      const outgoing = nodeOutgoing.get(key) || new Set<string>();
      const displayVals = new Set([...incoming, ...outgoing]);
      
      let matchedItems: { field: string; value: string; hasIncoming?: boolean; hasOutgoing?: boolean }[] = [];
      if (isRootNode) {
        matchedItems = Array.from(rootVals).map((val) => ({
          field: findRequestField(req, val) || findResponseField(req, val) || 'matched',
          value: val,
          hasIncoming: false,
          hasOutgoing: outgoing.has(val),
        }));
      } else {
        matchedItems = Array.from(displayVals).map((val) => ({
          field: findRequestField(req, val) || findResponseField(req, val) || 'matched',
          value: val,
          hasIncoming: incoming.has(val),
          hasOutgoing: outgoing.has(val),
        }));
      }

      return {
        id: key,
        type: 'request',
        position: { x: 0, y: 0 },
        data: {
          request: req,
          isRoot: isRootNode,
          sameHost: true,
          matches: matchedItems,
          activeMatches,
          onToggleMatch,
          focusedValue,
          onFocusValue: (val: string | null) => setFocusedValue(val),
          onSetCompare1,
          onSetCompare2,
          rootValsArray: discoveredList,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    return { rawNodes: rNodes, rawEdges: rEdges };
  }, [request, requests, rootVals, activeMatches, focusedValue]);

  useEffect(() => {
    const existingIds = new Set(nodes.map((n) => n.id));
    const newNodeIds = new Set(rawNodes.map((n) => n.id));

    const hasNewNodes = rawNodes.some((n) => !existingIds.has(n.id));
    const hasRemovedNodes = nodes.some((n) => !newNodeIds.has(n.id));

    if (hasNewNodes || hasRemovedNodes) {
      const existingPositions = new Map(nodes.map((n) => [n.id, n.position]));
      const layouted = applyDagreLayout(rawNodes, rawEdges);

      const merged = layouted.map((n) => ({
        ...n,
        position: existingPositions.get(n.id) ?? n.position,
      }));

      setNodes(merged);
      setEdges(rawEdges);
    } else {
      setNodes((prev) =>
        prev.map((n) => {
          const updated = rawNodes.find((r) => r.id === n.id);
          return updated ? {
            ...n,
            data: updated.data
          } : n;
        }),
      );
      setEdges(rawEdges);
    }
  }, [rawNodes, rawEdges]);

  if (rawNodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary text-xs">
        No trace values found in this request
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={tracePanelNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      onNodeClick={(_, node) => {
        const req = (node.data as any).request as NetworkRequest;
        onSelectRequest?.(req.id);
      }}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="rgb(var(--border))" />
      <Controls showInteractive={false} />
      <MiniMap
        position="bottom-right"
        style={{
          background: 'rgb(var(--background))',
          border: '1px solid rgb(var(--border))',
        }}
        nodeColor={() => 'rgb(var(--primary))'}
      />
    </ReactFlow>
  );
}

export function TracePanel(props: TracePanelProps) {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full">
        <TracePanelInner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
export type { TracePanelProps };
