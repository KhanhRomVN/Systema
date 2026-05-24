import { useState, useEffect } from 'react';
import { Brain, MessageSquare, Zap, Activity } from 'lucide-react';

const SLOGANS = [
  'Analyze network traffic with AI',
  'Inspect HTTPS requests intelligently',
  'Debug faster with AI assistance',
  'Understand your traffic patterns',
  'AI-powered security analysis',
];

export function WelcomeUI() {
  const [sloganIndex, setSloganIndex] = useState(0);
  const [stats, setStats] = useState({ messages: 0, sessions: 0 });

  useEffect(() => {
    const timer = setInterval(() => setSloganIndex((p) => (p + 1) % SLOGANS.length), 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('khanhromvn-systema-agent-history') || '[]');
      const totalMsgs = history.reduce((s: number, h: any) => s + (h.messageCount || 0), 0);
      setStats({ messages: totalMsgs, sessions: history.length });
    } catch {}
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-3 mb-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
          <Brain className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Systema AI</h1>
        <div className="h-6 overflow-hidden">
          <p key={sloganIndex} className="text-xs text-muted-foreground animate-in slide-in-from-bottom-2 fade-in duration-300">
            {SLOGANS[sloganIndex]}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 w-full mb-4">
        {[
          { icon: MessageSquare, label: 'Total Messages', value: stats.messages, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { icon: Activity, label: 'Sessions', value: stats.sessions, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`rounded-lg border p-3 flex items-center gap-2.5 ${bg}`}>
            <div className={`shrink-0 ${color}`}><Icon className="w-4 h-4" /></div>
            <div>
              <div className="text-sm font-bold text-foreground">{value.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Prerequisite notice */}
      <div className="w-full rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-yellow-500">Prerequisite:</strong> Ensure{' '}
          <a href="http://localhost:8888" className="text-blue-400 hover:underline font-semibold" target="_blank" rel="noreferrer">
            Elara
          </a>{' '}
          is running locally before starting a chat session.
        </p>
      </div>
    </div>
  );
}
