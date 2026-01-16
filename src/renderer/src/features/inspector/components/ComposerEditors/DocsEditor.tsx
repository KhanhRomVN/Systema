interface DocsEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DocsEditor({ value, onChange }: DocsEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full bg-background border border-border rounded p-3 text-xs outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50"
        placeholder="Enter request description or notes..."
      />
    </div>
  );
}
