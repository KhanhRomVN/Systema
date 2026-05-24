interface DocsEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function DocsEditor({ value, onChange, readOnly = false }: DocsEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <textarea
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        className="flex-1 w-full bg-background border border-border rounded p-3 text-xs outline-none focus:border-primary resize-none placeholder:text-muted-foreground/50 disabled:opacity-70"
        placeholder="Enter request description or notes..."
        readOnly={readOnly}
      />
    </div>
  );
}
