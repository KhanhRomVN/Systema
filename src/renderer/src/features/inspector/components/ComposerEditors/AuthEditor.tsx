export type AuthType =
  | 'none'
  | 'bearer'
  | 'basic'
  | 'apikey'
  | 'digest'
  | 'oauth1'
  | 'oauth2'
  | 'hawk'
  | 'aws'
  | 'ntlm';

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyKey?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
  oauth2AccessToken?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  awsService?: string;
}

interface AuthEditorProps {
  config: AuthConfig;
  onChange: (config: AuthConfig) => void;
  readOnly?: boolean;
}

export function AuthEditor({ config, onChange, readOnly = false }: AuthEditorProps) {
  const updateConfig = (key: keyof AuthConfig, value: any) => {
    if (readOnly) return;
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="flex flex-col h-full space-y-4 max-w-2xl p-1">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
        <select
          value={config.type}
          onChange={(e) => updateConfig('type', e.target.value as AuthType)}
          className="w-full max-w-xs h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-50"
          disabled={readOnly}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
          <option value="oauth2">OAuth 2.0</option>
          <option value="digest">Digest Auth</option>
          <option value="oauth1">OAuth 1.0</option>
          <option value="hawk">Hawk Authentication</option>
          <option value="aws">AWS Signature</option>
          <option value="ntlm">NTLM Authentication</option>
        </select>
      </div>

      <div className="p-4 border border-border/50 rounded-md bg-muted/10">
        {config.type === 'none' && (
          <div className="text-center text-muted-foreground text-xs italic py-4">
            This request does not use any authorization.
          </div>
        )}

        {config.type === 'bearer' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Token</label>
              <div className="relative">
                <input
                  value={config.bearerToken || ''}
                  onChange={(e) => updateConfig('bearerToken', e.target.value)}
                  placeholder="Enter access token"
                  type="password"
                  className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono disabled:opacity-70"
                  readOnly={readOnly}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                The token will be added to the Authorization header as{' '}
                <code>Bearer &lt;token&gt;</code>.
              </p>
            </div>
          </div>
        )}

        {config.type === 'basic' && (
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Username
              </label>
              <input
                value={config.basicUsername || ''}
                onChange={(e) => updateConfig('basicUsername', e.target.value)}
                placeholder="Username"
                className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Password
              </label>
              <input
                value={config.basicPassword || ''}
                onChange={(e) => updateConfig('basicPassword', e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                readOnly={readOnly}
              />
            </div>
          </div>
        )}

        {config.type === 'apikey' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Key</label>
                <input
                  value={config.apiKeyKey || ''}
                  onChange={(e) => updateConfig('apiKeyKey', e.target.value)}
                  placeholder="Key"
                  className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Value
                </label>
                <input
                  value={config.apiKeyValue || ''}
                  onChange={(e) => updateConfig('apiKeyValue', e.target.value)}
                  placeholder="Value"
                  className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                  readOnly={readOnly}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Add to</label>
              <select
                value={config.apiKeyLocation || 'header'}
                onChange={(e) => updateConfig('apiKeyLocation', e.target.value as any)}
                className="w-full max-w-xs h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-50"
                disabled={readOnly}
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>
        )}

        {config.type === 'oauth2' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Access Token
              </label>
              <input
                value={config.oauth2AccessToken || ''}
                onChange={(e) => updateConfig('oauth2AccessToken', e.target.value)}
                placeholder="Enter OAuth 2.0 access token"
                type="password"
                className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono disabled:opacity-70"
                readOnly={readOnly}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                The token will be added to the Authorization header as{' '}
                <code>Bearer &lt;token&gt;</code>.
              </p>
            </div>
          </div>
        )}

        {config.type === 'aws' && (
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Access Key
              </label>
              <input
                value={config.awsAccessKey || ''}
                onChange={(e) => updateConfig('awsAccessKey', e.target.value)}
                placeholder="AWS Access Key ID"
                className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono disabled:opacity-70"
                readOnly={readOnly}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Secret Key
              </label>
              <input
                value={config.awsSecretKey || ''}
                onChange={(e) => updateConfig('awsSecretKey', e.target.value)}
                placeholder="AWS Secret Access Key"
                type="password"
                className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono disabled:opacity-70"
                readOnly={readOnly}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Region
                </label>
                <input
                  value={config.awsRegion || ''}
                  onChange={(e) => updateConfig('awsRegion', e.target.value)}
                  placeholder="us-east-1"
                  className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                  readOnly={readOnly}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Service
                </label>
                <input
                  value={config.awsService || ''}
                  onChange={(e) => updateConfig('awsService', e.target.value)}
                  placeholder="execute-api"
                  className="w-full h-8 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary disabled:opacity-70"
                  readOnly={readOnly}
                />
              </div>
            </div>
          </div>
        )}

        {(config.type === 'digest' ||
          config.type === 'oauth1' ||
          config.type === 'hawk' ||
          config.type === 'ntlm') && (
          <div className="text-center text-muted-foreground text-xs italic py-4">
            {config.type.toUpperCase()} authentication support coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
