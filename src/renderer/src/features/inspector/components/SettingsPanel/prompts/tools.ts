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
  <field>method</field><value>POST</value>
  <field>status</field><value>error</value>
</set_filter>
- Set active filters. Use 'reset' as field to clear all.

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
