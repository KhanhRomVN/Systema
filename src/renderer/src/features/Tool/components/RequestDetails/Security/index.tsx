import { NetworkRequest } from '../../../../../types/inspector';
import { SecurityIssue, SecuritySeverity } from '../../../utils/securityScanner';
import { cn } from '../../../../../shared/lib/utils';
import { ShieldCheck, ShieldX, Info, AlertTriangle, ShieldAlert, Navigation } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../../../../core/components/common/ui/context-menu';

const SEV: Record<SecuritySeverity, { label: string; badge: string; icon: React.ElementType }> = {
  high:   { label: 'High',   badge: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: ShieldX },
  medium: { label: 'Medium', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: AlertTriangle },
  low:    { label: 'Low',    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: ShieldAlert },
  info:   { label: 'Info',   badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: Info },
};

const SEV_ORDER: SecuritySeverity[] = ['high', 'medium', 'low', 'info'];

const ISSUE_TAB: Record<string, 'headers' | 'body'> = {
  'missing-hsts': 'headers', 'hsts-no-maxage': 'headers', 'hsts-short-maxage': 'headers',
  'missing-xcto': 'headers', 'missing-xfo': 'headers', 'missing-csp': 'headers',
  'csp-unsafe-inline': 'headers', 'csp-unsafe-eval': 'headers', 'csp-wildcard': 'headers',
  'missing-referrer-policy': 'headers', 'weak-referrer-policy': 'headers',
  'missing-permissions-policy': 'headers', 'missing-xxp': 'headers', 'xxp-disabled': 'headers',
  'cookie-no-secure': 'headers', 'cookie-no-httponly': 'headers', 'cookie-no-samesite': 'headers',
  'cookie-samesite-none-no-secure': 'headers', 'cookie-long-expiry': 'headers',
  'basic-auth': 'headers', 'cors-wildcard': 'headers', 'cors-wildcard-credentials': 'headers',
  'cors-reflect-origin': 'headers', 'server-version': 'headers', 'x-powered-by': 'headers',
  'aspnet-version': 'headers', 'sensitive-cacheable': 'headers',
  'missing-corp': 'headers', 'missing-coop': 'headers', 'missing-coep': 'headers',
  'hpkp-deprecated': 'headers', 'trace-in-cors-methods': 'headers', 'dangerous-methods-exposed': 'headers',
  'sensitive-in-url': 'headers', 'no-auth': 'headers',
  'stack-trace': 'body', 'sql-error': 'body', 'mixed-content': 'body', 'missing-sri': 'body',
};

const COL = { sev: 90, issue: 200, evidence: 180 };

function IssueRow({ issue, onJump }: { issue: SecurityIssue; onJump?: (tab: 'headers' | 'body', term: string) => void }) {
  const cfg = SEV[issue.severity];
  const Icon = cfg.icon;
  const tab = ISSUE_TAB[issue.id];
  const canJump = !!tab && !!issue.evidence && !!onJump;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex items-center border-b border-divider/20 hover:bg-secondary/30 transition-colors text-xs cursor-default">
          <div className="shrink-0 px-3 py-2" style={{ width: COL.sev }}>
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border', cfg.badge)}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          <div className="shrink-0 px-3 py-2 font-medium text-text-primary" style={{ width: COL.issue }}>{issue.title}</div>
          <div className="flex-1 px-3 py-2 text-text-secondary">{issue.description}</div>
          <div className="shrink-0 px-3 py-2" style={{ width: COL.evidence }}>
            {issue.evidence
              ? <code className="text-[10px] font-mono text-text-secondary truncate block">{issue.evidence}</code>
              : <span className="text-[10px] text-text-secondary/30">—</span>
            }
          </div>
        </div>
      </ContextMenuTrigger>
      {canJump && (
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => onJump!(tab!, issue.evidence!)}>
            <Navigation className="mr-2 h-3.5 w-3.5 text-primary" />
            Go to {tab === 'headers' ? 'Headers' : 'Body'}
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}

export function SecurityDetails({
  request,
  onJumpToEvidence,
}: {
  request: NetworkRequest;
  onJumpToEvidence?: (tab: 'headers' | 'body', term: string) => void;
}) {
  const issues = request.securityIssues || [];

  if (issues.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-text-secondary">
        <ShieldCheck className="w-7 h-7 text-success" />
        <span className="text-xs">No security issues detected</span>
      </div>
    );
  }

  const sorted = SEV_ORDER.flatMap((sev) => issues.filter((i) => i.severity === sev));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex shrink-0 border-b border-divider/30 bg-table-headerBg text-[10px] uppercase text-text-secondary font-semibold">
        <div className="shrink-0 px-3 py-2" style={{ width: COL.sev }}>Severity</div>
        <div className="shrink-0 px-3 py-2" style={{ width: COL.issue }}>Issue</div>
        <div className="flex-1 px-3 py-2">Description</div>
        <div className="shrink-0 px-3 py-2" style={{ width: COL.evidence }}>Evidence</div>
      </div>
      {/* Rows */}
      <div className="flex-1 overflow-auto">
        {sorted.map((issue) => (
          <IssueRow key={issue.id} issue={issue} onJump={onJumpToEvidence} />
        ))}
      </div>
    </div>
  );
}
