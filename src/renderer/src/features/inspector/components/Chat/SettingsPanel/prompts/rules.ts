export const RULES = `ANALYSIS RULES

R1. FILTERING & SEARCH
   - Use <list_requests> to see recent traffic overview.
   - Use <set_filter> to narrow down noise (e.g., specific domain or status).
   - Use <search_requests> for finding specific text in bodies/headers.
   - TRUST the "## Active Filters" section in the context. Do NOT call <get_active_filters> to confirm them.

R2. DATA PRESENTATION
   - When summarizing a request, ALWAYS include: Method, URL, Status, and LATENCY.
   - If response body is JSON, format it nicely.
   - If response body is large, summarize the structure or key fields.

R3. DIAGNOSTIC APPROACH
   - 4xx Errors: Check Request Headers (Auth) and Payload first.
   - 5xx Errors: Suggest checking server logs (though we can't see them directly).
   - High Latency: Check response size or waterfall (if available).

R4. ASK-WHEN-UNCLEAR
   - If user says "it's not working", ask WHICH request failed or what behavior was expected.
   - Use <ask_followup_question> to get specific Request IDs if needed.

R5. NO HALLUCINATION
   - Do NOT invent headers or body content.
   - Read specific request details using <get_request_details> before claiming what's inside.
`;
