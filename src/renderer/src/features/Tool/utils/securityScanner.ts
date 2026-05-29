import { NetworkRequest } from '../../../types/inspector';

export type SecuritySeverity = 'high' | 'medium' | 'low' | 'info';

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  evidence?: string;
}

export interface TlsScanResult {
  protocol?: string;
  cipher?: { name: string; version: string };
  cert?: {
    subject?: Record<string, string>;
    issuer?: Record<string, string>;
    valid_from?: string;
    valid_to?: string;
    bits?: number;
    fingerprint?: string;
    fingerprint256?: string;
    serialNumber?: string;
    subjectaltname?: string;   // "DNS:example.com, DNS:*.example.com"
    infoAccess?: string;       // contains OCSP URL if present
    ext_key_usage?: string[];
  };
  selfSigned?: boolean;
  error?: string;
}

export function analyzeTls(result: TlsScanResult, host?: string): SecurityIssue[] {
  if (result.error) return [];
  const issues: SecurityIssue[] = [];

  // Protocol version
  const proto = result.protocol || '';
  if (['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'].includes(proto))
    issues.push({ id: 'tls-old-version', title: `Outdated TLS Version (${proto})`, severity: 'high',
      description: `${proto} is deprecated and insecure. Only TLS 1.2 and 1.3 should be used.`, evidence: proto });

  if (proto === 'TLSv1.2')
    issues.push({ id: 'tls-12-only', title: 'TLS 1.3 Not Used', severity: 'info',
      description: 'Connection negotiated TLS 1.2. TLS 1.3 offers better performance and security.', evidence: proto });

  // Cipher suite
  const cipher = result.cipher?.name || '';
  const weakCiphers = ['RC4', 'DES', '3DES', 'NULL', 'EXPORT', 'anon', 'MD5'];
  const matchedWeak = weakCiphers.find((w) => cipher.toUpperCase().includes(w));
  if (matchedWeak)
    issues.push({ id: 'tls-weak-cipher', title: `Weak Cipher Suite (${matchedWeak})`, severity: 'high',
      description: `Cipher "${cipher}" uses ${matchedWeak} which is cryptographically broken.`, evidence: cipher });

  if (cipher && !cipher.includes('ECDHE') && !cipher.includes('DHE'))
    issues.push({ id: 'tls-no-pfs', title: 'No Perfect Forward Secrecy', severity: 'medium',
      description: `Cipher "${cipher}" does not use ECDHE/DHE key exchange. Past sessions can be decrypted if private key is compromised.`, evidence: cipher });

  // Certificate
  const cert = result.cert;
  if (cert) {
    // #17 Self-signed
    if (result.selfSigned)
      issues.push({ id: 'cert-self-signed', title: 'Self-Signed Certificate', severity: 'high',
        description: 'Certificate is self-signed and not trusted by any CA. Should not be used in production.' });

    // #12 Expiry
    if (cert.valid_to) {
      const expiry = new Date(cert.valid_to);
      const now = new Date();
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
      if (daysLeft < 0)
        issues.push({ id: 'cert-expired', title: 'Certificate Expired', severity: 'high',
          description: `Certificate expired ${Math.abs(daysLeft)} day(s) ago.`, evidence: cert.valid_to });
      else if (daysLeft < 30)
        issues.push({ id: 'cert-expiring-soon', title: `Certificate Expiring Soon (${daysLeft}d)`, severity: 'medium',
          description: `Certificate expires in ${daysLeft} day(s). Renew before expiry to avoid service disruption.`, evidence: cert.valid_to });
    }

    // #13 CN/SAN hostname mismatch
    if (host) {
      const sans = (cert.subjectaltname || '')
        .split(',')
        .map((s) => s.trim().replace(/^DNS:/, '').toLowerCase());
      const cn = (cert.subject?.CN || '').toLowerCase();
      const allNames = sans.length > 0 ? sans : [cn];
      const matched = allNames.some((name) => {
        if (name.startsWith('*.')) return host.endsWith(name.slice(1));
        return name === host.toLowerCase();
      });
      if (!matched && allNames.some(Boolean))
        issues.push({ id: 'cert-hostname-mismatch', title: 'Certificate Hostname Mismatch', severity: 'high',
          description: `Certificate is not valid for "${host}". Valid names: ${allNames.filter(Boolean).join(', ')}`,
          evidence: cert.subjectaltname || `CN=${cn}` });
    }

    // #16 Weak key length
    if (cert.bits && cert.bits < 2048)
      issues.push({ id: 'cert-weak-key', title: `Weak Certificate Key (${cert.bits} bits)`, severity: 'high',
        description: `RSA key length ${cert.bits} bits is below the recommended minimum of 2048 bits.`, evidence: `${cert.bits} bits` });

    // #15 SHA-1 signature
    if (cert.fingerprint && cert.fingerprint.toLowerCase().startsWith('sha1'))
      issues.push({ id: 'cert-sha1', title: 'Certificate Uses SHA-1 Signature', severity: 'high',
        description: 'SHA-1 is cryptographically broken. Certificate should use SHA-256 or higher.', evidence: cert.fingerprint });

    // #18 No OCSP (revocation check)
    if (cert.infoAccess && !cert.infoAccess.includes('OCSP'))
      issues.push({ id: 'cert-no-ocsp', title: 'No OCSP Responder in Certificate', severity: 'medium',
        description: 'Certificate does not include an OCSP URL. Revocation status cannot be checked online.' });

    // #19 Wildcard cert on sensitive path
    const cn = cert.subject?.CN || '';
    if (cn.startsWith('*.') && cert.subjectaltname && (cert.subjectaltname.match(/DNS:/g) || []).length === 1)
      issues.push({ id: 'cert-wildcard-only', title: 'Wildcard-Only Certificate', severity: 'low',
        description: `Certificate uses only a wildcard (${cn}) with no specific SANs. Wildcard certs increase blast radius if compromised.`,
        evidence: cn });

    // #20 Certificate Transparency (no SCT)
    if (cert.infoAccess && !cert.infoAccess.includes('CT Precertificate') && !cert.fingerprint256)
      issues.push({ id: 'cert-no-ct', title: 'No Certificate Transparency Evidence', severity: 'info',
        description: 'Certificate may not be logged in CT logs. Modern browsers require CT for public trust.' });
  }

  return issues;
}

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export function scanRequest(req: NetworkRequest): SecurityIssue[] {
  if (req.protocol !== 'https') return [];

  const issues: SecurityIssue[] = [];
  const res = req.responseHeaders || {};
  const reqH = req.requestHeaders || {};
  const url = req.url || '';
  const resBody = req.responseBody || '';
  const reqBody = req.requestBody || '';

  // ── Transport / Headers ──────────────────────────────────────────────────

  if (!getHeader(res, 'strict-transport-security'))
    issues.push({ id: 'missing-hsts', title: 'Missing HSTS', severity: 'medium',
      description: 'Strict-Transport-Security absent. Browsers may allow HTTP downgrade.' });

  const hsts = getHeader(res, 'strict-transport-security') || '';
  if (hsts && !/max-age\s*=\s*(\d+)/.test(hsts))
    issues.push({ id: 'hsts-no-maxage', title: 'HSTS Missing max-age', severity: 'low',
      description: 'HSTS header present but max-age directive is missing or malformed.', evidence: hsts });

  if (hsts && parseInt((hsts.match(/max-age\s*=\s*(\d+)/) || [])[1] || '0') < 31536000)
    issues.push({ id: 'hsts-short-maxage', title: 'HSTS max-age Too Short', severity: 'low',
      description: 'HSTS max-age is less than 1 year (31536000s). Recommended ≥ 1 year.', evidence: hsts });

  if (!getHeader(res, 'x-content-type-options'))
    issues.push({ id: 'missing-xcto', title: 'Missing X-Content-Type-Options', severity: 'low',
      description: 'X-Content-Type-Options: nosniff not set. MIME-sniffing attacks possible.' });

  const csp = getHeader(res, 'content-security-policy') || '';
  if (!getHeader(res, 'x-frame-options') && !csp.includes('frame-ancestors'))
    issues.push({ id: 'missing-xfo', title: 'Missing X-Frame-Options', severity: 'medium',
      description: 'No clickjacking protection (X-Frame-Options or CSP frame-ancestors).' });

  if (!csp)
    issues.push({ id: 'missing-csp', title: 'Missing Content-Security-Policy', severity: 'medium',
      description: 'No CSP header. XSS and data injection attacks may be possible.' });

  if (csp && csp.includes("'unsafe-inline'"))
    issues.push({ id: 'csp-unsafe-inline', title: "CSP Allows 'unsafe-inline'", severity: 'medium',
      description: "CSP contains 'unsafe-inline' which allows inline scripts/styles, weakening XSS protection.", evidence: csp.substring(0, 150) });

  if (csp && csp.includes("'unsafe-eval'"))
    issues.push({ id: 'csp-unsafe-eval', title: "CSP Allows 'unsafe-eval'", severity: 'medium',
      description: "CSP contains 'unsafe-eval' which allows eval(), weakening XSS protection.", evidence: csp.substring(0, 150) });

  if (csp && csp.includes('*'))
    issues.push({ id: 'csp-wildcard', title: 'CSP Contains Wildcard', severity: 'low',
      description: 'CSP uses wildcard (*) source which may allow loading resources from any origin.', evidence: csp.substring(0, 150) });

  if (!getHeader(res, 'referrer-policy'))
    issues.push({ id: 'missing-referrer-policy', title: 'Missing Referrer-Policy', severity: 'info',
      description: 'No Referrer-Policy. Sensitive URL data may leak via Referer header.' });

  const rp = getHeader(res, 'referrer-policy') || '';
  if (rp && ['unsafe-url', 'no-referrer-when-downgrade'].includes(rp.toLowerCase()))
    issues.push({ id: 'weak-referrer-policy', title: 'Weak Referrer-Policy', severity: 'low',
      description: `Referrer-Policy "${rp}" may leak full URLs to third parties.`, evidence: rp });

  if (!getHeader(res, 'permissions-policy') && !getHeader(res, 'feature-policy'))
    issues.push({ id: 'missing-permissions-policy', title: 'Missing Permissions-Policy', severity: 'info',
      description: 'No Permissions-Policy header. Browser features (camera, mic, geolocation) are unrestricted.' });

  if (!getHeader(res, 'x-xss-protection'))
    issues.push({ id: 'missing-xxp', title: 'Missing X-XSS-Protection', severity: 'info',
      description: 'X-XSS-Protection header absent. Legacy browsers may lack reflected XSS filtering.' });

  const xxp = getHeader(res, 'x-xss-protection') || '';
  if (xxp === '0')
    issues.push({ id: 'xxp-disabled', title: 'X-XSS-Protection Disabled', severity: 'low',
      description: 'X-XSS-Protection is explicitly set to 0 (disabled).', evidence: xxp });

  // ── Cookie Issues ────────────────────────────────────────────────────────

  const rawSetCookie = getHeader(res, 'set-cookie');
  const setCookie = Array.isArray(rawSetCookie) ? (rawSetCookie as string[]).join('; ') : String(rawSetCookie ?? '');
  if (rawSetCookie) {
    const cookieLower = setCookie.toLowerCase();
    if (!cookieLower.includes('secure'))
      issues.push({ id: 'cookie-no-secure', title: 'Cookie Missing Secure Flag', severity: 'high',
        description: 'Set-Cookie missing Secure flag. Cookie may be transmitted over HTTP.', evidence: setCookie.substring(0, 120) });
    if (!cookieLower.includes('httponly'))
      issues.push({ id: 'cookie-no-httponly', title: 'Cookie Missing HttpOnly', severity: 'medium',
        description: 'Set-Cookie missing HttpOnly. Cookie accessible via JavaScript (XSS risk).', evidence: setCookie.substring(0, 120) });
    if (!cookieLower.includes('samesite'))
      issues.push({ id: 'cookie-no-samesite', title: 'Cookie Missing SameSite', severity: 'low',
        description: 'Set-Cookie has no SameSite attribute. CSRF attacks may be possible.', evidence: setCookie.substring(0, 120) });
    if (cookieLower.includes('samesite=none') && !cookieLower.includes('secure'))
      issues.push({ id: 'cookie-samesite-none-no-secure', title: 'SameSite=None Without Secure', severity: 'high',
        description: 'SameSite=None requires Secure flag. Cookie will be rejected by modern browsers.', evidence: setCookie.substring(0, 120) });
    if (/expires\s*=\s*[^;]+\s*2[0-9]{3}/i.test(setCookie))
      issues.push({ id: 'cookie-long-expiry', title: 'Cookie With Long Expiry', severity: 'info',
        description: 'Cookie has a far-future expiry date. Long-lived cookies increase session hijacking risk.', evidence: setCookie.substring(0, 120) });
  }

  // ── Sensitive Data Exposure ──────────────────────────────────────────────

  const sensitiveParams = ['token', 'password', 'passwd', 'secret', 'api_key', 'apikey', 'access_token', 'auth', 'private_key', 'client_secret', 'session', 'ssn', 'credit_card'];
  try {
    const urlObj = new URL(url);
    for (const [key] of urlObj.searchParams.entries()) {
      if (sensitiveParams.some((s) => key.toLowerCase().includes(s))) {
        issues.push({ id: 'sensitive-in-url', title: 'Sensitive Parameter in URL', severity: 'high',
          description: `Query parameter "${key}" may expose sensitive data in URL, logs, and Referer headers.`,
          evidence: urlObj.search.substring(0, 100) });
        break;
      }
    }
  } catch { /* invalid url */ }

  // Sensitive data patterns in response body
  const sensitivePatterns: [RegExp, string, string][] = [
    [/"password"\s*:\s*"[^"]{1,}"/i, 'Password in Response Body', 'Response body contains a "password" field in plaintext JSON.'],
    [/"(secret|api_key|apikey|private_key|client_secret)"\s*:\s*"[^"]{4,}"/i, 'Secret/Key in Response Body', 'Response body exposes a secret or API key in JSON.'],
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i, 'Email Address in Response', 'Response body contains email addresses which may be PII.'],
    [/\b(?:\d[ -]?){13,16}\b/, 'Possible Credit Card Number', 'Response body may contain a credit card number pattern.'],
    [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'Private Key in Response', 'Response body contains a private key.'],
    [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT Token in Response', 'Response body contains a JWT token which may expose sensitive claims.'],
  ];
  for (const [pattern, title, description] of sensitivePatterns) {
    const match = resBody.match(pattern);
    if (match) {
      issues.push({ id: `body-${title.toLowerCase().replace(/\s+/g, '-')}`, title, severity: 'high', description,
        evidence: match[0].substring(0, 80) });
    }
  }

  // ── Authentication / Authorization ───────────────────────────────────────

  const authHeader = getHeader(reqH, 'authorization') || '';
  if (authHeader.toLowerCase().startsWith('basic '))
    issues.push({ id: 'basic-auth', title: 'HTTP Basic Authentication', severity: 'medium',
      description: 'Basic Auth credentials are base64-encoded (not encrypted). Prefer token-based auth.' });

  if (!authHeader && !getHeader(reqH, 'cookie') && !getHeader(reqH, 'x-api-key') && req.method !== 'GET' && req.method !== 'HEAD')
    issues.push({ id: 'no-auth', title: 'No Authentication Header', severity: 'info',
      description: `${req.method} request sent without Authorization, Cookie, or API key header.` });

  // ── CORS ─────────────────────────────────────────────────────────────────

  const acao = getHeader(res, 'access-control-allow-origin') || '';
  if (acao === '*')
    issues.push({ id: 'cors-wildcard', title: 'CORS Wildcard Origin', severity: 'medium',
      description: 'Access-Control-Allow-Origin: * allows any origin to read the response.', evidence: acao });

  const acac = getHeader(res, 'access-control-allow-credentials') || '';
  if (acao === '*' && acac.toLowerCase() === 'true')
    issues.push({ id: 'cors-wildcard-credentials', title: 'CORS Wildcard With Credentials', severity: 'high',
      description: 'Wildcard CORS with credentials=true is a critical misconfiguration allowing cross-origin credential theft.' });

  if (acao && acao !== '*' && getHeader(reqH, 'origin') && acao === getHeader(reqH, 'origin'))
    issues.push({ id: 'cors-reflect-origin', title: 'CORS Reflects Request Origin', severity: 'high',
      description: 'Server reflects the request Origin back verbatim, allowing any origin to bypass CORS.', evidence: `Origin: ${getHeader(reqH, 'origin')} → ACAO: ${acao}` });

  // ── Information Disclosure ───────────────────────────────────────────────

  const server = getHeader(res, 'server') || '';
  if (server && /[\d.]{3,}/.test(server))
    issues.push({ id: 'server-version', title: 'Server Version Disclosure', severity: 'low',
      description: 'Server header reveals version info aiding fingerprinting.', evidence: `Server: ${server}` });

  const poweredBy = getHeader(res, 'x-powered-by') || '';
  if (poweredBy)
    issues.push({ id: 'x-powered-by', title: 'X-Powered-By Exposed', severity: 'info',
      description: 'X-Powered-By reveals technology stack.', evidence: `X-Powered-By: ${poweredBy}` });

  const aspVersion = getHeader(res, 'x-aspnet-version') || getHeader(res, 'x-aspnetmvc-version') || '';
  if (aspVersion)
    issues.push({ id: 'aspnet-version', title: 'ASP.NET Version Disclosed', severity: 'low',
      description: 'ASP.NET version header exposes framework version.', evidence: aspVersion });

  // Stack traces / debug info in response body
  if (/at\s+\w+[\w.]+\s*\(.*:\d+:\d+\)/m.test(resBody) || /stack\s*trace/i.test(resBody))
    issues.push({ id: 'stack-trace', title: 'Stack Trace in Response', severity: 'high',
      description: 'Response body contains a stack trace, exposing internal file paths and code structure.' });

  if (/SQL\s+(syntax|error|exception)/i.test(resBody) || /ORA-\d{5}/.test(resBody) || /mysql_fetch/i.test(resBody))
    issues.push({ id: 'sql-error', title: 'SQL Error in Response', severity: 'high',
      description: 'Response contains SQL error messages, indicating potential SQL injection vulnerability.' });

  // ── Injection Indicators ─────────────────────────────────────────────────

  const allInput = reqBody + url;
  if (/<script[\s>]/i.test(allInput) || /javascript:/i.test(allInput))
    issues.push({ id: 'xss-in-request', title: 'Potential XSS Payload in Request', severity: 'high',
      description: 'Request contains script tags or javascript: URI which may indicate XSS attempt.' });

  if (/(\bUNION\b.*\bSELECT\b|\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?|--\s*$|;\s*DROP\s+TABLE)/i.test(allInput))
    issues.push({ id: 'sqli-in-request', title: 'Potential SQL Injection in Request', severity: 'high',
      description: 'Request contains patterns resembling SQL injection payloads.' });

  if (/\.\.[/\\]/.test(allInput))
    issues.push({ id: 'path-traversal', title: 'Path Traversal Pattern in Request', severity: 'high',
      description: 'Request contains ../ or ..\\ sequences indicating possible path traversal attempt.' });

  // ── Caching ──────────────────────────────────────────────────────────────

  const cc = getHeader(res, 'cache-control') || '';
  const pragma = getHeader(res, 'pragma') || '';
  const contentType = getHeader(res, 'content-type') || '';
  const isApiOrAuth = contentType.includes('json') || !!getHeader(reqH, 'authorization') || !!getHeader(reqH, 'cookie');
  if (isApiOrAuth && !cc.includes('no-store') && !cc.includes('private') && !pragma.includes('no-cache'))
    issues.push({ id: 'sensitive-cacheable', title: 'Sensitive Response May Be Cached', severity: 'medium',
      description: 'Authenticated/API response lacks Cache-Control: no-store or private. May be cached by proxies.',
      evidence: cc ? `Cache-Control: ${cc}` : '(no Cache-Control header)' });

  // ── Mixed Content / Protocol ─────────────────────────────────────────────

  if (/http:\/\/(?!localhost|127\.0\.0\.1)/i.test(resBody))
    issues.push({ id: 'mixed-content', title: 'Mixed Content in Response', severity: 'medium',
      description: 'Response body references HTTP (non-HTTPS) URLs, causing mixed content warnings.' });

  // ── Cross-Origin Policies (CORP / COOP / COEP) ───────────────────────────

  if (!getHeader(res, 'cross-origin-resource-policy'))
    issues.push({ id: 'missing-corp', title: 'Missing Cross-Origin-Resource-Policy', severity: 'medium',
      description: 'No CORP header. Resources may be loaded by cross-origin pages (Spectre risk).' });

  if (!getHeader(res, 'cross-origin-opener-policy'))
    issues.push({ id: 'missing-coop', title: 'Missing Cross-Origin-Opener-Policy', severity: 'medium',
      description: 'No COOP header. Page shares browsing context with cross-origin popups (Spectre risk).' });

  if (!getHeader(res, 'cross-origin-embedder-policy'))
    issues.push({ id: 'missing-coep', title: 'Missing Cross-Origin-Embedder-Policy', severity: 'medium',
      description: 'No COEP header. Required for SharedArrayBuffer and high-resolution timers isolation.' });

  // ── Deprecated / Dangerous Headers ──────────────────────────────────────

  if (getHeader(res, 'public-key-pins') || getHeader(res, 'public-key-pins-report-only'))
    issues.push({ id: 'hpkp-deprecated', title: 'HPKP Header Detected (Deprecated)', severity: 'info',
      description: 'HTTP Public Key Pinning is deprecated and removed from browsers. Remove Public-Key-Pins header.',
      evidence: `Public-Key-Pins: ${(getHeader(res, 'public-key-pins') || getHeader(res, 'public-key-pins-report-only') || '').substring(0, 80)}` });

  // ── HTTP Methods ─────────────────────────────────────────────────────────

  if (req.method === 'TRACE')
    issues.push({ id: 'trace-method', title: 'HTTP TRACE Method Used', severity: 'low',
      description: 'TRACE method is enabled. Can be exploited for Cross-Site Tracing (XST) attacks.' });

  const acam = getHeader(res, 'access-control-allow-methods') || '';
  if (/\b(TRACE|TRACK)\b/i.test(acam))
    issues.push({ id: 'trace-in-cors-methods', title: 'TRACE Allowed in CORS Methods', severity: 'low',
      description: 'Access-Control-Allow-Methods includes TRACE/TRACK, enabling Cross-Site Tracing.', evidence: acam });

  if (/\b(PUT|DELETE|PATCH)\b/i.test(acam))
    issues.push({ id: 'dangerous-methods-exposed', title: 'Dangerous Methods in CORS', severity: 'low',
      description: 'Access-Control-Allow-Methods exposes mutating methods (PUT/DELETE/PATCH) to cross-origin requests.', evidence: acam });

  // ── Subresource Integrity ────────────────────────────────────────────────

  const scriptSrcPattern = /<script[^>]+src\s*=\s*["']https?:\/\/(?!localhost)[^"']+["'][^>]*>/gi;
  const scriptTags = resBody.match(scriptSrcPattern) || [];
  const missingSri = scriptTags.filter((tag) => !/integrity\s*=/i.test(tag));
  if (missingSri.length > 0)
    issues.push({ id: 'missing-sri', title: 'External Scripts Without SRI', severity: 'low',
      description: `${missingSri.length} external <script> tag(s) lack Subresource Integrity (integrity=) attribute. Third-party scripts could be tampered.`,
      evidence: missingSri[0].substring(0, 120) });

  return issues;
}
