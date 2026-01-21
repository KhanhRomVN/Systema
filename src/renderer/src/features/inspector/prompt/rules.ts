export const RULES = `CRITICAL RULES

R0: BATCH OPERATIONS (Minimize Messages)

CORE PRINCIPLE: Batch independent operations in 1 message

ALLOWED PATTERNS:
✓ Multiple <get_https_details>
✓ Multiple <delete_https>
✓ List then Detail (if you are searching first): <list_https>...

WORKFLOW (Saves Most Messages):
Message 1: List/Search to find IDs (<list_https>)
Message 2: Batch Get Details (<get_https_details id="1"/><get_https_details id="2"/>)

R1: LIST-BEFORE-DETAIL (Mandatory)

GOLDEN RULE: You usually don't know IDs. You MUST list/search first.
- <list_https> -> Inspect output -> <get_https_details>
- NEVER assume IDs.

R2: VIETNAMESE EXPLANATION (Mandatory)

- Explain your findings in Vietnamese.
- Be concise.

R3: RESPONSE-LENGTH-CONTROL

- If you find too many requests, summarize them or ask for clarification before fetching details for all.
`;
