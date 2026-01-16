import { Trash2 } from 'lucide-react';

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
}

export function KeyValueTable({
  items,
  onChange,
  descriptionPlaceholder = false,
}: KeyValueTableProps) {
  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof KeyValueItem, value: string | boolean) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border border-border rounded-md overflow-hidden bg-background flex flex-col max-h-full">
        {/* Table Header */}
        <div className="flex bg-muted/30 text-[10px] font-medium text-muted-foreground border-b border-border flex-shrink-0">
          <div className="w-8 flex items-center justify-center py-1.5"></div>
          <div className="flex-1 px-2 py-1.5 border-r border-border/50">Key</div>
          <div className="flex-1 px-2 py-1.5 border-r border-border/50">Value</div>
          {descriptionPlaceholder && (
            <div className="flex-1 px-2 py-1.5 border-r border-border/50">Description</div>
          )}
          <div className="w-8"></div>
        </div>

        {/* Table Body - Scrollable */}
        <div className="overflow-y-auto flex-1">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex group border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors items-center"
            >
              <div className="w-8 flex items-center justify-center p-1">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleUpdate(i, 'enabled', e.target.checked)}
                  className="rounded border-border w-3.5 h-3.5"
                />
              </div>
              <div className="flex-1 border-r border-border/50 flex items-center">
                <input
                  value={item.key}
                  onChange={(e) => handleUpdate(i, 'key', e.target.value)}
                  placeholder="Key"
                  className="w-full h-8 px-2 bg-transparent text-xs outline-none focus:bg-muted/20 font-mono"
                />
              </div>
              <div className="flex-1 border-r border-border/50 flex items-center py-1">
                <textarea
                  ref={(el) => {
                    if (el) {
                      // Auto-resize when element mounts or value changes
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
                    // Auto-resize on change
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '28px';
                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 120;
                    if (scrollHeight > 28) {
                      target.style.height = Math.min(scrollHeight, maxHeight) + 'px';
                    }
                  }}
                  placeholder="Value"
                  className="w-full px-2 py-1 bg-transparent text-xs outline-none focus:bg-muted/20 font-mono resize-none overflow-y-auto leading-normal"
                  style={{
                    height: '28px',
                    maxHeight: '120px',
                  }}
                />
              </div>
              {descriptionPlaceholder && (
                <div className="flex-1 border-r border-border/50 flex items-center">
                  <input
                    value={item.description || ''}
                    onChange={(e) => handleUpdate(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full h-8 px-2 bg-transparent text-xs outline-none focus:bg-muted/20 text-muted-foreground"
                  />
                </div>
              )}
              <div className="w-8 flex items-center justify-center">
                <button
                  onClick={() => handleRemove(i)}
                  className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Row Placeholder */}
          <div className="flex border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors items-center">
            <div className="w-8 p-1"></div>
            <div className="flex-1 border-r border-border/50">
              <input
                placeholder="Add new key"
                className="w-full h-8 px-2 bg-transparent text-xs outline-none font-mono placeholder:text-muted-foreground/50"
                onFocus={handleAdd}
              />
            </div>
            <div className="flex-1 border-r border-border/50"></div>
            {descriptionPlaceholder && <div className="flex-1 border-r border-border/50"></div>}
            <div className="w-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
