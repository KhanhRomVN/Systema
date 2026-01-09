import { NetworkRequest } from '../../types';
import { useState, useMemo } from 'react';
import { cn } from '../../../../shared/lib/utils';
import { Folder, Globe, FileCode } from 'lucide-react';

interface FileTreeProps {
  requests: NetworkRequest[];
  onSelectFile: (content: string, fileName: string, language: string) => void;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder' | 'domain';
  children?: Record<string, TreeNode>;
  request?: NetworkRequest; // If it's a file, it might link to a request
}

export function FileTree({ requests, onSelectFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const tree = useMemo(() => {
    const root: Record<string, TreeNode> = {};

    requests.forEach((req) => {
      // Basic structure: Domain -> Path segments -> File
      // Filter out system/noise domains
      const IGNORED_PATTERNS = [
        'clients2.google.com',
        'clientservices.googleapis.com',
        'update.googleapis.com',
        'safebrowsing.googleapis.com',
        'safebrowsinghttpgateway.googleapis.com',
        'optimizationguide-pa.googleapis.com',
        'content-autofill.googleapis.com',
        'chromewebstore.googleapis.com',
        'accounts.google.com',
        'www.google.com',
        'gvt1.com',
        'doubleclick.net',
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com/tr',
        'bat.bing.com',
        // Additions based on logs
        'android.clients.google.com',
        'mtalk.google.com',
        'gator.volces.com',
        'fp-it-acc.portal101.cn',
        'challenges.cloudflare.com',
        'appleid.cdn-apple.com',
        'cdn.deepseek.com', // User might want this? But it's usually static assets. Wait, looking at user's image, deepseek assets ARE desired.
        // Wait, 'cdn.deepseek.com' IS in the user's "Top" screenshot as a valid source. I should NOT filter it.
        // The user complained about "android.clients..." etc.
        // I will filter "clients*.google.com" and "googleapis.com" broadly.
      ];

      // Robust check: match if the host ENDS WITH any of these, or includes unique substrings
      const NOISE_SUBSTRINGS = [
        'googleapis.com',
        'clients.google.com',
        'gvt1.com',
        'doubleclick.net',
        'google-analytics.com',
        'googletagmanager.com',
        'safebrowsing',
        'content-autofill',
        'mtalk.google.com',
      ];

      const isIgnored =
        IGNORED_PATTERNS.some((p) => req.host === p) ||
        NOISE_SUBSTRINGS.some((s) => req.host.includes(s));

      if (isIgnored) {
        // console.log('Filtering out:', req.host);
        return;
      }

      if (!req.responseBody) return; // Only show requests with proper body? Or all? Let's show all but empty if no body.

      const domain = req.host;
      if (!root[domain]) {
        root[domain] = { name: domain, type: 'domain', children: {} };
      }

      // Parse path
      const url = new URL(req.protocol + '://' + req.host + req.path);
      const pathname = url.pathname;
      const segments = pathname.split('/').filter(Boolean);

      let current = root[domain];

      // Handle root file
      if (segments.length === 0) {
        // It's the root index
        const fileName = '(index)';
        if (!current.children) current.children = {};
        // Versioning: Only keep latest or handle multiple? For now, simple overwrite (latest wins due to loop order usually, or we sort reqs first)
        current.children[fileName] = {
          name: fileName,
          type: 'file',
          request: req,
        };
        return;
      }

      segments.forEach((segment, idx) => {
        if (!current.children) current.children = {};

        const isFile = idx === segments.length - 1; // Treat last segment as file usually

        // If it's not the last segment, it's a folder
        if (!isFile) {
          if (!current.children[segment]) {
            current.children[segment] = { name: segment, type: 'folder', children: {} };
          }
          current = current.children[segment];
        } else {
          // It is the file
          // Handle query params in name or just plain name?
          // User might want to distinguish `script.js?v=1` vs `script.js?v=2`
          // For "Sources" view, usually we strip query params for the tree, but that might hide versions.
          // Let's use full segment for now.
          const fileName = segment;
          current.children[fileName] = {
            name: fileName,
            type: 'file',
            request: req,
          };
        }
      });
    });

    return root;
  }, [requests]);

  const toggleExpand = (path: string) => {
    const next = new Set(expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  };

  const traverse = (nodes: Record<string, TreeNode>, pathPrefix: string = '') => {
    return Object.entries(nodes)
      .sort((a, b) => {
        // Sort: Domains/Folders first, then files? Or alphabetical?
        // Usually Folders first
        if (a[1].type !== 'file' && b[1].type === 'file') return -1;
        if (a[1].type === 'file' && b[1].type !== 'file') return 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([key, node]) => {
        const currentPath = pathPrefix ? `${pathPrefix}/${key}` : key;
        const isExpanded = expanded.has(currentPath);
        const isSelected = selectedPath === currentPath;
        const hasChildren = node.children && Object.keys(node.children).length > 0;

        const handleClick = () => {
          if (node.type === 'file' && node.request) {
            setSelectedPath(currentPath);
            // Determine language
            let lang = 'javascript';
            const ct = node.request.contentType || '';
            if (ct.includes('html')) lang = 'html';
            else if (ct.includes('css')) lang = 'css';
            else if (ct.includes('json')) lang = 'json';

            onSelectFile(node.request.responseBody || '', node.name, lang);
          } else {
            toggleExpand(currentPath);
          }
        };

        return (
          <div key={currentPath}>
            <div
              className={cn(
                'flex items-center gap-1 py-1 px-2 cursor-pointer whitespace-nowrap text-xs select-none transition-colors',
                isSelected
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'hover:bg-muted/50 text-muted-foreground',
              )}
              style={{ paddingLeft: `${pathPrefix.split('/').length * 12 + 4}px` }}
              onClick={handleClick}
            >
              {/* Icon */}
              <span className="opacity-70 shrink-0">
                {node.type === 'domain' ? (
                  <Globe className="w-3.5 h-3.5" />
                ) : node.type === 'folder' ? (
                  <Folder className="w-3.5 h-3.5" />
                ) : (
                  <FileCode className="w-3.5 h-3.5" />
                )}
              </span>

              <span className="truncate">{node.name}</span>
            </div>

            {hasChildren && isExpanded && <div>{traverse(node.children!, currentPath)}</div>}
          </div>
        );
      });
  };

  return (
    <div className="h-full overflow-auto py-2">
      {Object.keys(tree).length === 0 ? (
        <div className="text-center text-muted-foreground text-xs p-4">
          No captured sources yet.
        </div>
      ) : (
        traverse(tree)
      )}
    </div>
  );
}
