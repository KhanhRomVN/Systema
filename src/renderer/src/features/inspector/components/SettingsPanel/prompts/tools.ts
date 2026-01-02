export const TOOLS = `TOOLS REFERENCE

NETWORK OPERATIONS

<list_requests>
  <!-- Optional: Filter criteria -->
  <field>method</field><value>POST</value>
  <limit>10</limit>
  <!-- Optional: Show extra columns (Size, Time) -->
  <show_all_columns>true</show_all_columns>
</list_requests>
- Returns: ID | Method | Host | Path | Status | Type (and Size | Time if requested)

<get_request_details><requestId>req-123</requestId></get_request_details> 
- Get full details (headers, body, timings)

<set_filter>
  <field>method</field><value>POST,PUT</value><mode>append</mode>
  <field>status</field><value>200,404</value><mode>remove</mode>
  <field>size</field><value>100 - 1000</value>
</set_filter>
- Set filters.
- Fields: method, status, type, host, path, size, time.
- For arrays (method, status, type): CSV. <mode>append|remove</mode>.
- For host/path: Whitelist. "append" adds to allowed list (Show Only). Empty = Show All.
- For ranges (size, time): "min - max". Use "any" for open ended.
- Use <field>reset</field> to clear all.

<get_active_filters />
- Returns the current filter configuration.

<get_values>
  <field>host</field>
  <!-- Optional: default false (respects current filters) -->
  <ignore_filters>false</ignore_filters>
</get_values>
- Returns unique values for a field (host, method, status, type, path).

COMMUNICATION

<ask_followup_question><question>...</question><options>["Opt1"]</options></ask_followup_question>

<attempt_completion><result>Final answer</result></attempt_completion>

<table>
  <headers>Col1, Col2</headers>
  <rows>
    <row>Val1a, Val2a</row>
    <row>Val1b, Val2b</row>
  </rows>
</table>`;
