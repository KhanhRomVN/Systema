export const TOOLS = `TOOLS REFERENCE

NETWORK OPERATIONS

list_requests(limit?) - List recent requests (default limit: 10)
search_requests(query) - Search/Filter requests by path or keyword in real-time
get_request_details(requestId) - Get full headers/body for a specific request
set_filter(type, value) - Apply active filters
    - type: "method" | "status" | "reset"
    - value: "GET"/"POST" etc OR "error"/"success" OR null (for reset)

DATA EXPORT

export_har(requestIds?) - Export requests to HAR file format (Mock)

COMMUNICATION

ask_followup_question(question, options?) - Ask user for clarification
attempt_completion(result) - Finalize the analysis task`;
