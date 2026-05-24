import { useState, useEffect } from 'react';
import { Copy, Trash2, KeyRound } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import CryptoJS from 'crypto-js';

type CryptoMethod =
  | 'base64-encode'
  | 'base64-decode'
  | 'url-encode'
  | 'url-decode'
  | 'html-encode'
  | 'html-decode'
  | 'hex-encode'
  | 'hex-decode'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'aes-encrypt'
  | 'aes-decrypt';

interface MethodOption {
  value: CryptoMethod;
  label: string;
  category: string;
  requiresKey?: boolean;
}

const methods: MethodOption[] = [
  { value: 'base64-encode', label: 'Base64 Encode', category: 'Encoding' },
  { value: 'base64-decode', label: 'Base64 Decode', category: 'Encoding' },
  { value: 'url-encode', label: 'URL Encode', category: 'Encoding' },
  { value: 'url-decode', label: 'URL Decode', category: 'Encoding' },
  { value: 'html-encode', label: 'HTML Entity Encode', category: 'Encoding' },
  { value: 'html-decode', label: 'HTML Entity Decode', category: 'Encoding' },
  { value: 'hex-encode', label: 'Hex Encode', category: 'Encoding' },
  { value: 'hex-decode', label: 'Hex Decode', category: 'Encoding' },
  { value: 'md5', label: 'MD5 Hash', category: 'Hashing' },
  { value: 'sha1', label: 'SHA-1 Hash', category: 'Hashing' },
  { value: 'sha256', label: 'SHA-256 Hash', category: 'Hashing' },
  { value: 'sha512', label: 'SHA-512 Hash', category: 'Hashing' },
  { value: 'aes-encrypt', label: 'AES-256 Encrypt', category: 'Encryption', requiresKey: true },
  { value: 'aes-decrypt', label: 'AES-256 Decrypt', category: 'Encryption', requiresKey: true },
];

function processText(text: string, method: CryptoMethod, key?: string): string {
  try {
    switch (method) {
      case 'base64-encode':
        return btoa(text);
      case 'base64-decode':
        return atob(text);
      case 'url-encode':
        return encodeURIComponent(text);
      case 'url-decode':
        return decodeURIComponent(text);
      case 'html-encode':
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      case 'html-decode':
        return text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
      case 'hex-encode':
        return Array.from(text)
          .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('');
      case 'hex-decode':
        return (
          text
            .match(/.{1,2}/g)
            ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
            .join('') || ''
        );
      case 'md5':
        return CryptoJS.MD5(text).toString();
      case 'sha1':
        return CryptoJS.SHA1(text).toString();
      case 'sha256':
        return CryptoJS.SHA256(text).toString();
      case 'sha512':
        return CryptoJS.SHA512(text).toString();
      case 'aes-encrypt':
        if (!key) throw new Error('Encryption key required');
        return CryptoJS.AES.encrypt(text, key).toString();
      case 'aes-decrypt':
        if (!key) throw new Error('Decryption key required');
        const decrypted = CryptoJS.AES.decrypt(text, key);
        return decrypted.toString(CryptoJS.enc.Utf8);
      default:
        return '';
    }
  } catch (error) {
    throw new Error(`Error: ${error instanceof Error ? error.message : 'Processing failed'}`);
  }
}

export function CryptoTab() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [method, setMethod] = useState<CryptoMethod>('base64-encode');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedMethod = methods.find((m) => m.value === method);
  const requiresKey = selectedMethod?.requiresKey || false;

  const handleProcess = () => {
    setError('');
    try {
      const result = processText(input, method, encryptionKey || undefined);
      setOutput(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setOutput('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
    setEncryptionKey('');
  };

  // Auto-process when input or method changes
  useState(() => {
    if (input) {
      handleProcess();
    }
  });

  // Listen for add-to-crypto events from RequestDetails
  useEffect(() => {
    const handleAddToCrypto = (event: Event) => {
      const customEvent = event as CustomEvent;
      const text = customEvent.detail?.text;
      if (text) {
        setInput(text);
      }
    };

    window.addEventListener('add-to-crypto', handleAddToCrypto);

    return () => {
      window.removeEventListener('add-to-crypto', handleAddToCrypto);
    };
  }, []);

  const groupedMethods = methods.reduce(
    (acc, method) => {
      if (!acc[method.category]) {
        acc[method.category] = [];
      }
      acc[method.category].push(method);
      return acc;
    },
    {} as Record<string, MethodOption[]>,
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-medium">Crypto Operations</h2>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-border bg-muted/20 space-y-3">
        <div>
          <label className="text-xs font-medium mb-1.5 block">Method</label>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value as CryptoMethod);
              setError('');
            }}
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded outline-none focus:border-primary"
          >
            {Object.entries(groupedMethods).map(([category, options]) => (
              <optgroup key={category} label={category}>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {requiresKey && (
          <div>
            <label className="text-xs font-medium mb-1.5 block">Encryption Key</label>
            <input
              type="text"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              placeholder="Enter encryption/decryption key..."
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded outline-none focus:border-primary"
            />
          </div>
        )}

        <button
          onClick={handleProcess}
          className="w-full px-4 py-2 text-xs bg-primary/20 text-primary hover:bg-primary/30 rounded transition-colors font-medium"
        >
          Process
        </button>

        {error && (
          <div className="px-3 py-2 text-xs bg-red-500/20 text-red-500 rounded border border-red-500/30">
            {error}
          </div>
        )}
      </div>

      {/* Input/Output Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-muted/20">
            <h3 className="text-xs font-medium">Input</h3>
          </div>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value) {
                handleProcess();
              } else {
                setOutput('');
                setError('');
              }
            }}
            placeholder="Enter text to process..."
            className="flex-1 p-4 text-xs font-mono bg-background border-0 outline-none resize-none"
          />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
            <h3 className="text-xs font-medium">Output</h3>
            {output && (
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                  copied
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                )}
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            className="flex-1 p-4 text-xs font-mono bg-muted/30 border-0 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
