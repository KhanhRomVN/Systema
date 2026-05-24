export const TOOLS_REFERENCE = `# TOOLS REFERENCE

\`\`\`xml
<list_https>
  <limit>10</limit>          <!-- optional: max results -->
  <offset>0</offset>         <!-- optional: skip N -->
  <method>get</method>       <!-- optional, multi: get/post/put/delete/... -->
  <host>https://api.example.com</host>  <!-- optional, multi -->
  <path>/api/v1</path>       <!-- optional, multi -->
  <status>200</status>       <!-- optional, multi -->
  <type>xhr</type>           <!-- optional, multi: xhr/js/css/img/media/font/doc/ws/wasm/manifest/other -->
</list_https>

<get_https_details>
  <id>123</id>               <!-- required -->
  <data>header</data>        <!-- optional, multi: header/body (default=all) -->
</get_https_details>

<get_filter></get_filter>

<delete_https>
  <id>123</id>               <!-- required -->
</delete_https>

<edit_filter>
  <method><value>get</value><value>post</value></method>
  <host><value>https://example.com</value></host>
  <path><value>/api</value></path>
  <status><value>200</value></status>
  <type><value>xhr</value></type>
</edit_filter>

<text>Critical explanation (visible to user)</text>
<temp>Hidden placeholder (when no visible response is needed)</temp>
\`\`\``;
