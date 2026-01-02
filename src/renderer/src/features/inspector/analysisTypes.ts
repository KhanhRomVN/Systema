export interface RequestOverview {
  url: string;
  method: string;
  statusCode: number;
  statusText: string;
  protocol: string;
  httpVersion: string;
  timestamp: string;
  duration: string;
  size: {
    request: string;
    response: string;
    total: string;
  };
  scores: {
    overall: Score;
    security: Score;
    performance: Score;
  };
  summary: {
    critical: number;
    warnings: number;
    passed: number;
    info: number;
  };
  quickInsights: Insight[];
}

export interface Score {
  value: number;
  grade: string;
  color: string;
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  icon: string;
  message: string;
}

export interface RequestAnalysisSection {
  general: {
    method: string;
    url: string;
    protocol: string;
    httpVersion: string;
    host: string;
    port: number;
    path: string;
    scheme: string;
  };
  queryString: string;
  queryParams: Record<string, string>;
  timestamp: string;
  size: {
    headers: string;
    body: string;
    total: string;
  };
  preview?: string;
  contentType?: string;
}

export interface ResponseAnalysisSection {
  general: {
    statusCode: number;
    statusText: string;
    httpVersion: string;
    protocol: string;
  };
  timestamp: string;
  size: {
    headers: string;
    body: string;
    total: string;
  };
  compression: {
    algorithm: string;
    originalSize: string;
    compressedSize: string;
    ratio: string;
  };
  redirectURL: string | null;
  preview?: string;
  contentType?: string;
}

export interface HeaderItem {
  name: string;
  value: string;
  description?: string;
  parsed?: any;
  status?: string;
}

export interface HeadersAnalysis {
  request: {
    general?: HeaderItem[];
    authentication?: HeaderItem[];
    client?: HeaderItem[];
    referrer?: HeaderItem[];
    custom?: HeaderItem[];
    [key: string]: HeaderItem[] | undefined;
  };
  response: {
    general?: HeaderItem[];
    cache?: HeaderItem[];
    security?: HeaderItem[];
    cors?: HeaderItem[];
    custom?: HeaderItem[];
    [key: string]: HeaderItem[] | undefined;
  };
  missing?: {
    name: string;
    severity: string;
    description: string;
    recommendation: string;
  }[];
}

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: string;
  size?: string;
  expires?: string | null;
  maxAge?: number | null;
  priority?: string;
  analysis?: {
    security: string;
    issues: string[];
  };
  raw?: string;
}

export interface CookiesAnalysis {
  request: CookieItem[];
  response: CookieItem[];
  summary: {
    totalRequest: number;
    totalResponse: number;
    secureCount: number;
    httpOnlyCount: number;
    sameSiteCount: number;
    issues: {
      critical: number;
      warning: number;
      info: number;
    };
  };
}

export interface BodyAnalysis {
  request: {
    contentType: string;
    size: string;
    encoding?: string;
    raw: string;
    formatted?: any;
    preview?: string;
  };
  response: {
    contentType: string;
    size: string;
    originalSize?: string;
    compression?: string;
    encoding?: string;
    raw: string;
    formatted?: any;
    preview?: string;
    structure?: {
      type: string;
      depth: number;
      keys: number;
      arrays: number;
      objects: number;
    };
  };
  loader?: string;
}

export interface SecurityAnalysis {
  protocol: {
    version: string;
    isSecure: boolean;
    grade: string;
    details: string;
  };
  cipher: {
    suite: string;
    strength: string;
    grade: string;
    isStrong: boolean;
    supportsForwardSecrecy: boolean;
  };
  certificate: {
    valid: boolean;
    trusted: boolean;
    subject: string;
    commonName: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
  };
  securityHeaders: Record<
    string,
    { present: boolean; grade?: string; status?: string; value?: string }
  >;
}

export interface CertificateItem {
  level: string;
  position: number;
  subject: {
    commonName: string;
    organization?: string;
    country?: string;
    [key: string]: string | undefined;
  };
  issuer: {
    commonName: string;
    organization?: string;
    country?: string;
  };
  validity: {
    notBefore: string;
    notAfter: string;
    daysRemaining: number;
    isValid: boolean;
  };
  fingerprint: {
    sha1: string;
    sha256: string;
  };
  isTrusted: boolean;
  isSelfSigned: boolean;
}

export interface CertificateChainAnalysis {
  valid: boolean;
  trusted: boolean;
  chainLength: number;
  certificates: CertificateItem[];
  validation: {
    chainValid: boolean;
    signatureValid: boolean;
    datesValid: boolean;
    hostnameMatch: boolean;
    trustedRoot: boolean;
    revocationStatus: string;
    issues: string[];
  };
}

export interface NetworkAnalysis {
  connection: {
    protocol: string;
    remoteAddress: string;
    remotePort: number;
    localAddress: string;
    localPort: number;
    connectionReused: boolean;
  };
  dns: {
    hostname: string;
    resolvedIPs: { ip: string }[];
    lookupTime: string;
    dnsServer?: string;
  };
  geolocation?: {
    ip: string;
    country: string;
    countryCode: string;
    region: string;
    city: string;
    isp: string;
    timezone: string;
  };
}

export interface TimingPhase {
  time: string;
  description: string;
}

export interface TimingAnalysis {
  phases: Record<string, TimingPhase>;
  breakdown: Record<string, string>;
  timestamps: Record<string, string>;
  performance: {
    downloadSpeed: string;
    uploadSpeed: string;
    latency: string;
  };
}

export interface IssueItem {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  recommendation: string;
}

export interface IssuesAnalysis {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  critical: IssueItem[];
  high: IssueItem[];
  medium: IssueItem[];
  low: IssueItem[];
  info: IssueItem[];
  recommendations: {
    priority: string;
    category: string;
    title: string;
    description: string;
  }[];
  [key: string]: any;
}

export interface RequestAnalysis {
  overview?: RequestOverview;
  request?: RequestAnalysisSection;
  response?: ResponseAnalysisSection;
  headers?: HeadersAnalysis;
  cookies?: CookiesAnalysis;
  body?: BodyAnalysis;
  security?: SecurityAnalysis;
  certificateChain?: CertificateChainAnalysis;
  network?: NetworkAnalysis;
  timing?: TimingAnalysis;
  performance?: any; // Assuming merged with timing or separate
  issues?: IssuesAnalysis;
}
