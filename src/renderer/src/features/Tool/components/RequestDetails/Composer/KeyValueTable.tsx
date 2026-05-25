import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';

export interface KeyValueItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

interface KeyValueTableProps {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  title?: string;
  descriptionPlaceholder?: boolean;
  readOnly?: boolean;
}

export function KeyValueTable({
  items,
  onChange,
  descriptionPlaceholder = false,
  readOnly = false,
}: KeyValueTableProps) {
  const [keyWidth, setKeyWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleAdd = () => {
    if (readOnly) return;
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    if (readOnly) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof KeyValueItem, value: string | boolean) => {
    if (readOnly) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = keyWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const delta = (e.clientX - dragStartX.current) / containerRect.width * 100;
      let newWidth = dragStartWidth.current + delta;
      newWidth = Math.min(80, Math.max(20, newWidth));
      setKeyWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full w-full" ref={containerRef}>
      <div className="flex flex-col h-full bg-table-bodyBg">
        {/* Table Header */}
        <div className="flex bg-table-headerBg text-xs font-bold text-text-secondary border-b border-border flex-shrink-0 sticky top-0 z-10">
          <div className="w-8 flex items-center justify-center py-2 shrink-0">
            <span className="sr-only">Enabled</span>
          </div>
          <div
            className="px-3 py-2 border-r border-border shrink-0 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ width: `${keyWidth}%` }}
          >
            Key
          </div>
          {/* Resize handle */}
          <div
            className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0"
            onMouseDown={handleMouseDown}
          />
          <div
            className="px-3 py-2 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ width: `${100 - keyWidth}%` }}
          >
            Value
          </div>
          {descriptionPlaceholder && (
            <div className="flex-1 px-3 py-2 border-r border-border shrink-0">Description</div>
          )}
          <div className="w-8 shrink-0"></div>
        </div>

        {/* Table Body - Scrollable */}
        <div className="overflow-y-auto flex-1">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex group border-b border-border/50 last:border-0 hover:bg-table-hoverItemBodyBg transition-colors items-center"
            >
              <div className="w-8 flex items-center justify-center p-1 shrink-0">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleUpdate(i, 'enabled', e.target.checked)}
                  className="rounded border-border w-3.5 h-3.5 cursor-pointer"
                  disabled={readOnly}
                />
              </div>
              <div
                className="px-3 py-1.5 border-r border-border/50 shrink-0"
                style={{ width: `${keyWidth}%` }}
              >
                <input
                  value={item.key}
                  onChange={(e) => handleUpdate(i, 'key', e.target.value)}
                  placeholder="Key"
                  className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 font-mono"
                  readOnly={readOnly}
                />
              </div>
              <div className="flex-1 px-3 py-1.5" style={{ width: `${100 - keyWidth}%` }}>
                <textarea
                  ref={(el) => {
                    if (el) {
                      el.style.height = '28px';
                      const scrollHeight = el.scrollHeight;
                      const maxHeight = 120;
                      if (scrollHeight > 28) {
                        el.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                      }
                    }
                  }}
                  value={item.value}
                  onChange={(e) => {
                    handleUpdate(i, 'value', e.target.value);
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '28px';
                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 120;
                    if (scrollHeight > 28) {
                      target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                    }
                  }}
                  placeholder="Value"
                  className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 font-mono resize-none overflow-y-auto leading-normal"
                  style={{
                    height: '28px',
                    maxHeight: '120px',
                  }}
                  readOnly={readOnly}
                />
              </div>
              {descriptionPlaceholder && (
                <div className="flex-1 px-3 py-1.5 border-r border-border/50 shrink-0">
                  <input
                    value={item.description || ''}
                    onChange={(e) => handleUpdate(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full bg-transparent text-xs outline-none focus:bg-muted/20 text-muted-foreground"
                    readOnly={readOnly}
                  />
                </div>
              )}
              <div className="w-8 flex items-center justify-center shrink-0">
                {!readOnly && (
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Row Placeholder */}
          {!readOnly && (
            <div className="flex border-b border-border/50 last:border-0 hover:bg-table-hoverItemBodyBg transition-colors items-center">
              <div className="w-8 p-1 shrink-0"></div>
              <div className="px-3 py-1.5 border-r border-border/50 shrink-0" style={{ width: `${keyWidth}%` }}>
                <input
                  placeholder="Add new key"
                  className="w-full bg-transparent text-xs outline-none font-mono placeholder:text-muted-foreground/50"
                  onFocus={handleAdd}
                />
              </div>
              <div className="flex-1 px-3 py-1.5" style={{ width: `${100 - keyWidth}%` }}></div>
              {descriptionPlaceholder && <div className="flex-1 px-3 py-1.5 border-r border-border/50 shrink-0"></div>}
              <div className="w-8 shrink-0"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}