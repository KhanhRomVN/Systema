import { NetworkRequest } from '../../../../../types/inspector';
import { useI18n } from '../../../../../i18n/i18nContext';

interface CookieDetailsProps {
  request: NetworkRequest;
}

// Parse "Cookie" request header: "key1=value1; key2=value2"
function parseRequestCookieHeader(headerValue: string): Record<string, string> {
  const result: Record<string, string> = {};
  headerValue.split(';').forEach((pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) {
      result[key.trim()] = rest.join('=').trim();
    }
  });
  return result;
}

// Parse "Set-Cookie" response header: "key=value; Path=/; HttpOnly"
function parseSetCookieHeader(headerValue: string): Record<string, string> {
  const parts = headerValue.split(';');
  const firstPart = parts[0]?.trim();
  if (!firstPart) return {};

  // First part is the key=value, rest are attributes
  const [key, ...rest] = firstPart.split('=');
  if (!key) return {};

  // Build value with attributes for context
  const value = rest.join('=').trim();
  const attributes = parts.slice(1).map((s) => s.trim()).filter(Boolean);

  return {
    [key.trim()]: attributes.length > 0 ? `${value}; ${attributes.join('; ')}` : value,
  };
}

export function CookieDetails({ request }: CookieDetailsProps) {
  const { t } = useI18n();

  // Use dedicated cookie objects first, fall back to parsing raw headers
  let requestCookies = request.requestCookies || {};
  let responseCookies = request.responseCookies || {};

  // If dedicated objects are empty, try parsing from raw headers
  if (Object.keys(requestCookies).length === 0 && request.requestHeaders) {
    const cookieHeader = request.requestHeaders['Cookie'] || request.requestHeaders['cookie'];
    if (cookieHeader) {
      requestCookies = parseRequestCookieHeader(String(cookieHeader));
    }
  }

  if (Object.keys(responseCookies).length === 0 && request.responseHeaders) {
    const setCookieHeader = request.responseHeaders['Set-Cookie'] || request.responseHeaders['set-cookie'];
    if (setCookieHeader) {
      responseCookies = parseSetCookieHeader(String(setCookieHeader));
    }
  }

  const hasRequestCookies = Object.keys(requestCookies).length > 0;
  const hasResponseCookies = Object.keys(responseCookies).length > 0;

  if (!hasRequestCookies && !hasResponseCookies) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        {t.requestDetails.noCookies}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {hasRequestCookies && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            {t.requestDetails.requestCookies}
          </h3>
          <div className="border border-divider/40 rounded-md bg-table-bodyBg overflow-hidden text-xs">
            <div className="grid grid-cols-[140px_1fr]">
              {Object.entries(requestCookies).map(([key, value]) => (
                <div
                  key={key}
                  className="contents"
                >
                  <div className="p-2 border-b border-r border-divider/40 bg-secondary/10 font-mono font-bold text-text-primary/90 break-all">
                    {key}
                  </div>
                  <div className="p-2 border-b border-divider/40 font-mono text-text-primary/80 break-all whitespace-pre-wrap">
                    {String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasResponseCookies && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            {t.requestDetails.responseCookies}
          </h3>
          <div className="border border-divider/40 rounded-md bg-table-bodyBg overflow-hidden text-xs">
            <div className="grid grid-cols-[140px_1fr]">
              {Object.entries(responseCookies).map(([key, value]) => (
                <div
                  key={key}
                  className="contents"
                >
                  <div className="p-2 border-b border-r border-divider/40 bg-secondary/10 font-mono font-bold text-text-primary/90 break-all">
                    {key}
                  </div>
                  <div className="p-2 border-b border-divider/40 font-mono text-text-primary/80 break-all whitespace-pre-wrap">
                    {String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}