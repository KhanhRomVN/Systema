export const NETWORK = `NETWORK REFERENCE
<list_https>
--- limit(optional): limit the number of requests to return
<limit>10</limit>
--- offset(optional): offset the number of requests to return
<offset>0</offset>
--- method(optional, multi, default=all): filter requests by method
<method>get</method>
<method>post</method>
--- host(optional, multi, default=all): filter requests by host
<host>https://example1.com</host>
<host>https://example2.com</host>
--- path(optional, multi, default=all): filter requests by path
<path>/path1</path>
<path>/path2</path>
--- status(optional, multi, default=all): filter requests by status
<status>200</status>
<status>404</status>
--- type (optional, multi, default=all): filter requests by type
<type>request</type>
<type>response</type>
</list_https>

<get_https_details>
--- id (required): the id of the request to get
<id>123</id>
--- data (optional, multi, default=all): filter requests by data
<data>header</data>
<data>body</data>
</get_https_details>

<get_filter></get_filter>

<delete_https>
--- id (required): the id of the request to delete
<id>123</id>
</delete_https>

<edit_filter>
-- include
<method>
<value>get</value>
<value>post</value>
</method>
<host>
<value>https://example1.com</value>
<value>https://example2.com</value>
</host>
<path>
<value>/path1</value>
<value>/path2</value>
</path>
<status>
<value>200</value>
<value>404</value>
</status>
<type>
<value>request</value>
<value>response</value>
</type>
</edit_filter>

`;
