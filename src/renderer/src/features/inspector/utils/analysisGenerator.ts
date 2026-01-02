import { NetworkRequest } from '../types';
import {
  RequestAnalysis,
  RequestOverview,
  Score,
  Insight,
  RequestAnalysisSection,
  ResponseAnalysisSection,
  HeaderItem,
  HeadersAnalysis,
  CookieItem,
  CookiesAnalysis,
  BodyAnalysis,
  SecurityAnalysis,
  NetworkAnalysis,
  TimingAnalysis,
  IssuesAnalysis,
  IssueItem,
} from '../analysisTypes';

export function generateRequestAnalysis(request: NetworkRequest): RequestAnalysis {
  let analysis: RequestAnalysis = {};

  try {
    const overview = generateOverview(request);
    const requestSection = generateRequestSection(request);
    const responseSection = generateResponseSection(request);
    const headers = generateHeadersAnalysis(request);
    const cookies = generateCookiesAnalysis(request);
    const body = generateBodyAnalysis(request);
    const security = generateSecurityAnalysis(request);
    const network = generateNetworkAnalysis(request);
    const timing = generateTimingAnalysis(request);
    const issues = generateIssuesAnalysis(request);

    analysis = {
      overview,
      request: requestSection,
      response: responseSection,
      headers,
      cookies,
      body,
      security,
      network,
      timing,
      issues,
    };
  } catch (error) {
    console.error('Error generating request analysis:', error);
  }

  return analysis;
}

function generateOverview(request: NetworkRequest): RequestOverview {
  // Simple scoring logic based on status and time
  const isSuccess = request.status >= 200 && request.status < 300;
  const isRedirect = request.status >= 300 && request.status < 400;
  const isError = request.status >= 400;

  let overallScore = 100;
  if (isError) overallScore -= 40;
  if (request.time !== 'Pending') {
    const timeMs = parseInt(request.time.replace('ms', ''));
    if (timeMs > 1000) overallScore -= 20;
    else if (timeMs > 500) overallScore -= 10;
  }

  const scores: { overall: Score; security: Score; performance: Score } = {
    overall: {
      value: Math.max(0, overallScore),
      grade: getGrade(overallScore),
      color: getColor(overallScore),
    },
    security: {
      value: request.protocol === 'https' ? 95 : 50,
      grade: request.protocol === 'https' ? 'A' : 'F',
      color: request.protocol === 'https' ? '#10b981' : '#ef4444',
    },
    performance: { value: 90, grade: 'A-', color: '#10b981' }, // Mocked for now
  };

  const insights: Insight[] = [];
  if (request.protocol === 'https') {
    insights.push({ type: 'success', icon: '✓', message: 'Secure connection (HTTPS)' });
  } else {
    insights.push({ type: 'warning', icon: '⚠', message: 'Insecure connection (HTTP)' });
  }

  if (request.status >= 400) {
    insights.push({
      type: 'warning',
      icon: '⚠',
      message: `Request failed with status ${request.status}`,
    });
  }

  return {
    url: `${request.protocol}://${request.host}${request.path}`,
    method: request.method,
    statusCode: request.status,
    statusText: getStatusText(request.status),
    protocol: request.protocol.toUpperCase(),
    httpVersion: 'HTTP/1.1', // Mocked, proxy doesn't give this detail yet
    timestamp: new Date(request.timestamp).toISOString(),
    duration: request.time !== 'Pending' ? request.time : '...',
    size: {
      request: request.size || '0 B', // Request size not fully tracked yet
      response: request.size,
      total: request.size,
    },
    scores,
    summary: {
      critical: isError ? 1 : 0,
      warnings: isRedirect ? 1 : 0,
      passed: isSuccess ? 1 : 0,
      info: 0,
    },
    quickInsights: insights,
  };
}

function generateRequestSection(request: NetworkRequest): RequestAnalysisSection {
  const urlObj = new URL(`${request.protocol}://${request.host}${request.path}`);
  return {
    general: {
      method: request.method,
      url: urlObj.href,
      protocol: request.protocol,
      httpVersion: 'HTTP/1.1',
      host: request.host,
      port: request.protocol === 'https' ? 443 : 80,
      path: urlObj.pathname,
      scheme: request.protocol,
    },
    queryString: urlObj.search.slice(1),
    queryParams: Object.fromEntries(urlObj.searchParams.entries()),
    timestamp: new Date(request.timestamp).toISOString(),
    size: {
      headers: JSON.stringify(request.requestHeaders).length + ' B', // Rough estimate
      body: request.requestBody ? request.requestBody.length + ' B' : '0 B',
      total: '...',
    },
  };
}

function generateResponseSection(request: NetworkRequest): ResponseAnalysisSection {
  return {
    general: {
      statusCode: request.status,
      statusText: getStatusText(request.status),
      httpVersion: 'HTTP/1.1',
      protocol: request.protocol,
    },
    timestamp: new Date().toISOString(), // Should be response timestamp
    size: {
      headers: JSON.stringify(request.responseHeaders).length + ' B',
      body: request.size,
      total: request.size,
    },
    compression: {
      algorithm: request.responseHeaders['content-encoding'] || 'none',
      originalSize: '...',
      compressedSize: request.size,
      ratio: '...',
    },
    redirectURL: request.responseHeaders['location'] || null,
  };
}

function generateHeadersAnalysis(request: NetworkRequest): HeadersAnalysis {
  const enrichHeader = (name: string, value: string): HeaderItem => {
    let description = 'Custom header';
    let parsed: any = undefined;
    let status = undefined;

    const lowerName = name.toLowerCase();
    if (lowerName === 'host') description = 'Target host for the request';
    else if (lowerName === 'connection') description = 'Connection persistence';
    else if (lowerName === 'content-length') description = 'Size of body in bytes';
    else if (lowerName === 'content-type') description = 'Media type of the body';
    else if (lowerName === 'authorization') {
      description = 'Credentials for authentication';
      if (value.startsWith('Bearer ')) {
        parsed = { type: 'Bearer', token: value.substring(7, 20) + '...' };
      }
    } else if (lowerName === 'user-agent') description = 'Client application details';
    else if (lowerName === 'accept') description = 'Acceptable response media types';
    else if (lowerName === 'accept-encoding') description = 'Acceptable content encodings';
    else if (lowerName === 'accept-language') description = 'Preferred languages';
    else if (lowerName === 'date') description = 'Message timestamp';
    else if (lowerName === 'server') description = 'Server software';
    else if (lowerName === 'cache-control') {
      description = 'Caching directives';
      parsed = {};
      value.split(',').forEach((p) => {
        const [k, v] = p.trim().split('=');
        parsed[k] = v || true;
      });
    } else if (lowerName === 'strict-transport-security') {
      description = 'HSTS configuration';
      status = 'good';
    } else if (lowerName === 'x-frame-options') {
      description = 'Clickjacking protection';
      status = 'good';
    } else if (lowerName === 'x-content-type-options') {
      description = 'MIME type sniffing protection';
      status = 'good';
    } else if (lowerName === 'content-security-policy') {
      description = 'Content security rules';
      status = 'good';
    } else if (lowerName === 'x-xss-protection') {
      description = 'XSS filter configuration';
      status = 'warning';
    }

    return { name, value, description, parsed, status };
  };

  const categorizeHeaders = (headers: Record<string, string>) => {
    const categories: Record<string, HeaderItem[]> = {
      general: [],
      authentication: [],
      client: [],
      referrer: [],
      custom: [],
      cache: [],
      security: [],
      cors: [],
    };

    Object.entries(headers).forEach(([name, value]) => {
      const item = enrichHeader(name, value);
      const lowerName = name.toLowerCase();

      if (
        [
          'host',
          'connection',
          'content-length',
          'content-type',
          'date',
          'server',
          'content-encoding',
        ].includes(lowerName)
      ) {
        categories.general.push(item);
      } else if (['authorization', 'cookie', 'set-cookie'].includes(lowerName)) {
        categories.authentication.push(item);
      } else if (
        ['user-agent', 'accept', 'accept-language', 'accept-encoding'].includes(lowerName)
      ) {
        categories.client.push(item);
      } else if (['referer', 'origin'].includes(lowerName)) {
        categories.referrer.push(item);
      } else if (
        ['cache-control', 'expires', 'etag', 'last-modified', 'pragma'].includes(lowerName)
      ) {
        categories.cache.push(item);
      } else if (
        [
          'strict-transport-security',
          'x-frame-options',
          'x-content-type-options',
          'content-security-policy',
          'x-xss-protection',
        ].includes(lowerName)
      ) {
        categories.security.push(item);
      } else if (lowerName.startsWith('access-control-')) {
        categories.cors.push(item);
      } else {
        categories.custom.push(item);
      }
    });

    const result: any = {};
    Object.entries(categories).forEach(([key, items]) => {
      if (items.length > 0) result[key] = items;
    });
    return result;
  };

  return {
    request: categorizeHeaders(request.requestHeaders),
    response: categorizeHeaders(request.responseHeaders),
    missing: !request.responseHeaders['content-security-policy']
      ? [
          {
            name: 'Content-Security-Policy',
            severity: 'warning',
            description: 'Controls resources the user agent is allowed to load',
            recommendation: 'Configure CSP to prevent XSS attacks',
          },
        ]
      : [],
  };
}

function generateCookiesAnalysis(request: NetworkRequest): CookiesAnalysis {
  const parseCookieString = (
    cookieStr: string | undefined | null,
    isResponse: boolean,
  ): CookieItem[] => {
    if (typeof cookieStr !== 'string' || !cookieStr) return [];

    // Simplistic split for response cookies (might be imperfect for dates with commas)
    // For Request cookies it's usually '; '
    // For Response Set-Cookie, each header is usually separate, but proxy might join them.
    // Assuming array or single string. NetworkRequest type is Record<string, string>, so it's joined.
    // We will try to split by newline if possible, or assume simple structure for now.
    // Ideally the proxy should pass array for Set-Cookie.

    // Fallback: split by Set-Cookie pattern if response
    const parts = isResponse
      ? cookieStr.split(/,(?=\s*[^=]+=[^;]+)/) // Heuristic split for Set-Cookie coalesced string
      : cookieStr.split(';');

    return parts.map((part) => {
      const attributes = part.split(';').map((s) => s.trim());
      const [nameVal, ...flags] = attributes;
      const [name, ...valParts] = nameVal.split('=');
      const value = valParts.join('=');

      const item: CookieItem = {
        name: name?.trim(),
        value: value,
        domain: request.host,
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        raw: part.trim(),
      };

      if (isResponse) {
        flags.forEach((flag) => {
          const lowerFlag = flag.toLowerCase();
          if (lowerFlag === 'secure') item.secure = true;
          else if (lowerFlag === 'httponly') item.httpOnly = true;
          else if (lowerFlag.startsWith('samesite=')) item.sameSite = flag.split('=')[1];
          else if (lowerFlag.startsWith('domain=')) item.domain = flag.split('=')[1];
          else if (lowerFlag.startsWith('path=')) item.path = flag.split('=')[1];
          else if (lowerFlag.startsWith('max-age=')) item.maxAge = parseInt(flag.split('=')[1]);
          else if (lowerFlag.startsWith('expires=')) item.expires = flag.split('=')[1];
        });
      }

      // Analysis
      const issues: string[] = [];
      if (!item.secure) issues.push('Missing Secure flag');
      if (!item.httpOnly) issues.push('Missing HttpOnly flag');
      if (item.sameSite === 'None' && !item.secure) issues.push('SameSite=None must be Secure');

      item.analysis = {
        security: issues.length === 0 ? 'good' : issues.length < 2 ? 'warning' : 'poor',
        issues,
      };

      return item;
    });
  };

  const reqCookies = parseCookieString(request.requestHeaders['cookie'] || '', false);
  const resCookies = parseCookieString(request.responseHeaders['set-cookie'] || '', true);

  const allCookies = [...reqCookies, ...resCookies];

  return {
    request: reqCookies,
    response: resCookies,
    summary: {
      totalRequest: reqCookies.length,
      totalResponse: resCookies.length,
      secureCount: allCookies.filter((c) => c.secure).length,
      httpOnlyCount: allCookies.filter((c) => c.httpOnly).length,
      sameSiteCount: allCookies.filter((c) => c.sameSite && c.sameSite !== 'Lax').length,
      issues: {
        critical: allCookies.filter((c) => c.analysis?.security === 'poor').length,
        warning: allCookies.filter((c) => c.analysis?.security === 'warning').length,
        info: 0,
      },
    },
  };
}

function generateBodyAnalysis(request: NetworkRequest): BodyAnalysis {
  let reqFormatted = undefined;
  try {
    if (request.requestBody && request.requestHeaders['content-type']?.includes('json')) {
      reqFormatted = JSON.parse(request.requestBody);
    }
  } catch {}

  let resFormatted = undefined;
  try {
    if (request.responseBody && request.responseHeaders['content-type']?.includes('json')) {
      resFormatted = JSON.parse(request.responseBody);
    }
  } catch {}

  return {
    request: {
      contentType: request.requestHeaders['content-type'] || '',
      size: request.requestBody?.length + ' B' || '0 B',
      raw: request.requestBody || '',
      formatted: reqFormatted,
    },
    response: {
      contentType: request.responseHeaders['content-type'] || '',
      size: request.size,
      raw: request.responseBody || '',
      formatted: resFormatted,
    },
  };
}

function generateSecurityAnalysis(request: NetworkRequest): SecurityAnalysis {
  return {
    protocol: {
      version: 'TLS 1.2', // Mock
      isSecure: request.protocol === 'https',
      grade: request.protocol === 'https' ? 'A' : 'F',
      details: request.protocol === 'https' ? 'Secure connection' : 'Insecure connection',
    },
    cipher: {
      suite: 'AES_256_GCM',
      strength: '256-bit',
      grade: 'A',
      isStrong: true,
      supportsForwardSecrecy: true,
    },
    certificate: {
      valid: true,
      trusted: true,
      subject: request.host,
      commonName: request.host,
      issuer: 'Example CA', // Mock
      validFrom: '...',
      validTo: '...',
      daysRemaining: 100,
    },
    securityHeaders: {
      strictTransportSecurity: { present: !!request.responseHeaders['strict-transport-security'] },
      xFrameOptions: { present: !!request.responseHeaders['x-frame-options'] },
      xContentTypeOptions: { present: !!request.responseHeaders['x-content-type-options'] },
    },
  };
}

function generateNetworkAnalysis(request: NetworkRequest): NetworkAnalysis {
  return {
    connection: {
      protocol: 'TCP',
      remoteAddress: '198.51.100.1',
      remotePort: request.protocol === 'https' ? 443 : 80,
      localAddress: '192.168.1.100',
      localPort: 54321,
      connectionReused: true,
    },
    dns: {
      hostname: request.host,
      resolvedIPs: [{ ip: '198.51.100.1' }],
      lookupTime: '10ms',
      dnsServer: '8.8.8.8',
    },
    geolocation: {
      ip: '198.51.100.1',
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      isp: 'Google LLC',
      timezone: 'America/Los_Angeles',
    },
  };
}

function generateTimingAnalysis(request: NetworkRequest): TimingAnalysis {
  return {
    phases: {
      dns: { time: '10ms', description: 'DNS Lookup' },
      tcp: { time: '20ms', description: 'TCP Handshake' },
      ssl: { time: '30ms', description: 'SSL Handshake' },
      ttfb: { time: '40ms', description: 'Time to First Byte' },
      download: { time: '50ms', description: 'Content Download' },
    },
    breakdown: {
      total: request.time,
      timeToFirstByte: '40ms',
    },
    timestamps: {
      startTime: new Date(request.timestamp).toISOString(),
      endTime: new Date(request.timestamp + (parseInt(request.time) || 0)).toISOString(),
    },
    performance: {
      downloadSpeed: '5 MB/s',
      uploadSpeed: '1 MB/s',
      latency: '60ms',
    },
  };
}

function generateIssuesAnalysis(request: NetworkRequest): IssuesAnalysis {
  const medium: IssueItem[] = [];
  if (!request.responseHeaders['content-security-policy']) {
    medium.push({
      id: 'miss-csp',
      category: 'security',
      title: 'Missing CSP',
      description: 'Content Security Policy header is missing',
      impact: 'Medium',
      severity: 'medium',
      recommendation: 'Add CSP header',
    });
  }

  return {
    summary: { total: medium.length, critical: 0, high: 0, medium: medium.length, low: 0, info: 0 },
    critical: [],
    high: [],
    medium,
    low: [],
    info: [],
    recommendations: [],
  };
}

function getStatusText(status: number): string {
  const statusText: { [key: number]: string } = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusText[status] || 'Unknown';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getColor(score: number): string {
  if (score >= 90) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // yellow
  return '#ef4444'; // red
}
