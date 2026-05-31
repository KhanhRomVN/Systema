import { ChevronLeft, Plus, MessageSquare } from 'lucide-react';
import { useI18n } from '../../../../../../../i18n/i18nContext';

interface ChatHeaderProps {
  sessionId: string;
  title?: string;
  provider?: string;
  model?: string;
  accountEmail?: string;
  tokenCount?: number;
  onBack: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

export function ChatHeader({
  sessionId,
  title,
  provider,
  model,
  accountEmail,
  tokenCount,
  onBack,
  onNewChat,
}: ChatHeaderProps) {
  const { t } = useI18n();
  const providerId = provider || 'elara';
  const faviconDomain =
    providerId.includes('openai') ? 'openai.com' :
    providerId.includes('anthropic') ? 'anthropic.com' :
    providerId.includes('google') ? 'google.com' :
    providerId.includes('deepseek') ? 'deepseek.com' :
    'deepseek.com';

  return (
    <div className="border-b border-border bg-table-bodyBg shrink-0">
      {/* Top row: back + title + actions */}
      <div className="h-10 flex items-center px-3 gap-2">
        <button
          onClick={onBack}
          className="flex items-center justify-center h-7 w-7 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors shrink-0"
          title={t.agent.back}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-border/50 shrink-0" />

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <MessageSquare className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-xs font-semibold text-foreground truncate">
            {title || t.agent.title}
          </span>
        </div>

        <button
          onClick={onNewChat}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors shrink-0"
          title={t.agent.newChat}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom row: model info + token count */}
      <div className="px-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground overflow-hidden">
          <img
            src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`}
            alt="provider"
            className="w-3.5 h-3.5 rounded-sm shrink-0"
          />
          <span className="font-medium truncate">
            {providerId}/{model || 'chat'}
          </span>
          {accountEmail && (
            <span className="italic opacity-60 truncate max-w-[120px]" title={accountEmail}>
              &lt;{accountEmail}&gt;
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground/60 shrink-0 font-mono">
          {tokenCount ? formatTokens(tokenCount) : sessionId.slice(0, 6)}
        </div>
      </div>
    </div>
  );
}
