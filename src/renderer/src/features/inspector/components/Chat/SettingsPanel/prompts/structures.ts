export const STRUCTURES = `
DATA STRUCTURE DEFINITION
The following JSON structure represents a single Network Request object you will analyze:

\`\`\`json
{
  "id": "req-123456789",          // Unique Request ID
  "method": "GET|POST|PUT...",    // HTTP Method
  "protocol": "https",            // Protocol (http/https/wss)
  "host": "api.example.com",      // Target Host
  "path": "/v1/users",            // Request Path
  "url": "https://...",           // Full URL
  "status": 200,                  // HTTP Status Code
  "type": "XHR|JSON|IMG...",      // Resource Type
  "time": "150ms",                // Duration string
  "size": "1.2kb",                // Size string
  "timestamp": 1700000000000,     // Unix Timestamp
  "contentType": "application/json", // Response Content-Type
  "isBinary": false,              // Whether the response body is binary
  "requestHeaders": {             // Key-Value Headers (Record<string, string>)
     "Content-Type": "application/json",
     "Authorization": "Bearer ..."
  },
  "responseHeaders": {            // Key-Value Headers (Record<string, string>)
     "Server": "nginx",
     "Date": "..."
  },
  "requestBody": "...",           // String content (if available)
  "responseBody": "..."           // String content (decoded if binary)
}
\`\`\`

Use these field names exactly when referring to request properties.
` as const;
