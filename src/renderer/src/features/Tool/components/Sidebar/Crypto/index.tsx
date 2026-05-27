import { useState, useEffect } from 'react';
import { StringCryptoPanel, FileCryptoPanel } from './CryptoPanel';
import { CryptoManager, CryptoCard, saveCards } from './CryptoManager';

export function CryptoTab({ targetApp }: { targetApp?: string }) {
  const [view, setView] = useState<'manager' | 'panel'>('manager');
  const [tempText, setTempText] = useState<string | undefined>();
  const [isTemp, setIsTemp] = useState(false);
  const [activeCard, setActiveCard] = useState<CryptoCard | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text;
      if (text) {
        setTempText(text);
        setIsTemp(true);
        setActiveCard(null);
        setView('panel');
      }
    };
    window.addEventListener('add-to-crypto', handler);
    return () => window.removeEventListener('add-to-crypto', handler);
  }, []);

  const handleOpenCard = (card: CryptoCard) => {
    setActiveCard(card);
    setTempText(card.input || undefined);
    setIsTemp(false);
    setView('panel');
  };

  const handleSaveTemp = (name: string, description: string) => {
    const saved: CryptoCard = {
      id: crypto.randomUUID(),
      name,
      description,
      inputType: 'string',
      mode: 'decode',
      input: tempText || '',
      steps: [],
      createdAt: Date.now(),
    };
    const existing: CryptoCard[] = JSON.parse(localStorage.getItem('crypto-manager-cards') || '[]');
    saveCards([saved, ...existing]);
    setIsTemp(false);
    setActiveCard(saved);
  };

  const isFileCard = activeCard?.inputType === 'file';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {view === 'manager' ? (
        <CryptoManager onOpenCard={handleOpenCard} targetApp={targetApp} />
      ) : isFileCard ? (
        <FileCryptoPanel
          key={activeCard?.id}
          cardId={activeCard?.id}
          initialContent={activeCard?.input}
          initialFileName={activeCard?.name}
          initialSteps={activeCard?.steps as any}
          mode={activeCard?.mode ?? 'encode'}
          isTemp={isTemp}
          onSave={handleSaveTemp}
          onClose={() => setView('manager')}
        />
      ) : (
        <StringCryptoPanel
          key={activeCard?.id ?? (isTemp ? 'temp' : 'blank')}
          cardId={activeCard?.id}
          initialText={tempText}
          initialSteps={activeCard?.steps as any}
          mode={activeCard?.mode ?? 'decode'}
          isTemp={isTemp}
          onSave={handleSaveTemp}
          onClose={() => setView('manager')}
        />
      )}
    </div>
  );
}
