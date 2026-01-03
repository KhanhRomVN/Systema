import { RequestAnalysis } from './analysisTypes';

export interface NetworkRequest {
  id: string;
  method: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  isBinary?: boolean;
  contentType?: string;
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
  securityDetails?: any;
  timing?: any;
  serverIPAddress?: string;
  connection?: string;
  analysis?: RequestAnalysis;
}

export const MOCK_REQUESTS: NetworkRequest[] = [
  {
    id: '1',
    method: 'GET',
    protocol: 'https',
    host: 'api.github.com',
    path: '/users/khanhromvn',
    status: 200,
    type: 'JSON',
    size: '1.2kb',
    time: '120ms',
    timestamp: Date.now(),
    requestHeaders: { 'User-Agent': 'Systema' },
    responseHeaders: { 'Content-Type': 'application/json' },
    responseBody: '{"login": "khanhromvn", "id": 12345}',
  },
  {
    id: '2',
    method: 'POST',
    protocol: 'https',
    host: 'api.google.com',
    path: '/analytics/collect',
    status: 204,
    type: 'XHR',
    size: '0b',
    time: '45ms',
    timestamp: Date.now() - 1000,
    requestHeaders: { 'Content-Type': 'application/json' },
    responseHeaders: {},
  },
  {
    id: '3',
    method: 'GET',
    protocol: 'https',
    host: 'fonts.googleapis.com',
    path: '/css2?family=Inter',
    status: 200,
    type: 'CSS',
    size: '4.5kb',
    time: '80ms',
    timestamp: Date.now() - 2000,
    requestHeaders: {},
    responseHeaders: { 'Content-Type': 'text/css' },
  },
  {
    id: '4',
    method: 'GET',
    protocol: 'https',
    host: 'avatars.githubusercontent.com',
    path: '/u/12345',
    status: 200,
    type: 'IMG',
    size: '12kb',
    time: '200ms',
    timestamp: Date.now() - 3000,
    requestHeaders: {},
    responseHeaders: { 'Content-Type': 'image/png' },
  },
  {
    id: '5',
    method: 'GET',
    protocol: 'https',
    host: 'example.com',
    path: '/404',
    status: 404,
    type: 'HTML',
    size: '1.5kb',
    time: '60ms',
    timestamp: Date.now() - 4000,
    requestHeaders: {},
    responseHeaders: { 'Content-Type': 'text/html' },
  },
];
