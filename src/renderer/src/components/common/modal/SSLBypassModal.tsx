import { useState, useRef, useEffect } from 'react';

interface SSLBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (packageName: string) => void;
  defaultValue?: string;
  packages?: string[];
}

export function SSLBypassModal({
  isOpen,
  onClose,
  onConfirm,
  defaultValue,
  packages = [],
}: SSLBypassModalProps) {
  const [packageName, setPackageName] = useState(defaultValue || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPackageName(defaultValue || '');
      setShowDropdown(false);
    }
  }, [isOpen, defaultValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (packageName.trim()) {
      onConfirm(packageName.trim());
      onClose();
    }
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.toLowerCase().includes(packageName.toLowerCase()),
  );

  const handleSelectPackage = (pkg: string) => {
    setPackageName(pkg);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 w-[500px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Inject SSL Pinning Bypass</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative">
            <label htmlFor="packageName" className="block text-sm font-medium mb-2">
              Android Package Name
            </label>
            <input
              ref={inputRef}
              id="packageName"
              type="text"
              value={packageName}
              onChange={(e) => {
                setPackageName(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="e.g. com.example.app"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
              autoComplete="off"
            />

            {showDropdown && filteredPackages.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-10"
              >
                {filteredPackages.map((pkg) => (
                  <button
                    key={pkg}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {pkg}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              Select from installed packages or enter manually
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Inject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
