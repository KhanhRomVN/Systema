export const STRUCTURES = `
DATA STRUCTURE DEFINITION
The following JSON structure represents a single Network Request object you will analyze:

{
  "id": "req-123456789",          // Unique Request ID
  "method": "GET|POST|PUT...",    // HTTP Method
  "host": "api.example.com",      // Target Host
  "path": "/v1/users",            // Request Path
  "url": "https://...",           // Full URL
  "status": 200,                  // HTTP Status Code
  "type": "xhr|fetch|doc...",     // Resource Type
  "time": 150,                    // Duration in ms
  "size": 1024,                   // Response size in bytes
  "timestamp": 1700000000000,     // Unix Timestamp
  "requestHeaders": {             // Key-Value Headers
     "Content-Type": "application/json",
     "Authorization": "Bearer ..."
  },
  "responseHeaders": { ... },
  "requestBody": "...",           // String or JSON object
  "responseBody": "..."           // Decoded body content
}

Use these field names when filtering or searching.
`;
