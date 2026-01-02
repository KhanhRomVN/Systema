# Open Claude - Kiến trúc cốt lõi

## 1. AUTHENTICATION (Đăng nhập)

### Cơ chế: Cookie-based auth từ claude.ai

```typescript
// Mở webview chứa trang login của Claude
authWindow.loadURL('https://claude.ai/login');

// Theo dõi cookies mỗi giây
const cookies = await session.defaultSession.cookies.get({ domain: '.claude.ai' });
const sessionKey = cookies.find(c => c.name === 'sessionKey')?.value;
const orgId = cookies.find(c => c.name === 'lastActiveOrg')?.value;

// Nếu có đủ 2 cookies → login thành công
if (sessionKey && orgId) {
  store.set('orgId', orgId);  // Lưu vào electron-store
}
```

**Điểm quan trọng:**
- Không tự xây dựng hệ thống auth
- Sử dụng lại session từ claude.ai
- `useSessionCookies: true` trong mọi request để tự động gửi cookies

---

## 2. TẠO HỘI THOẠI MỚI

### API Endpoint

```
POST https://claude.ai/api/organizations/{orgId}/chat_conversations
```

### Request Body

```json
{
  "uuid": "generated-uuid",
  "name": "",
  "model": "claude-opus-4-5-20251101",
  "project_uuid": null,
  "create_mode": null
}
```

### Response

```json
{
  "uuid": "conversation-id",
  "name": "",
  "model": "claude-opus-4-5-20251101",
  "created_at": "2024-...",
  "updated_at": "2024-..."
}
```

---

## 3. GỬI TIN NHẮN (SEND MESSAGE)

### API Endpoint

```
POST https://claude.ai/api/organizations/{orgId}/chat_conversations/{conversationId}/completion
```

### Request Body

```json
{
  "prompt": "User message here",
  "parent_message_uuid": "previous-message-uuid",
  "timezone": "Asia/Ho_Chi_Minh",
  "locale": "en-US",
  "personalized_styles": [{
    "type": "default",
    "key": "Default",
    "name": "Normal"
  }],
  "tools": [
    { "type": "web_search_v0", "name": "web_search" },
    { "type": "artifacts_v0", "name": "artifacts" },
    { "type": "repl_v0", "name": "repl" }
  ],
  "attachments": [],
  "files": ["file-uuid-1", "file-uuid-2"],
  "rendering_mode": "messages"
}
```

### Headers quan trọng

```
Accept: text/event-stream
Content-Type: application/json
anthropic-client-platform: web_claude_ai
anthropic-device-id: <generated-once>
anthropic-anonymous-id: claudeai.v1.<uuid>
```

---

## 4. NHẬN RESPONSE (SSE STREAMING)

### Format SSE

Mỗi dòng có dạng: `data: {JSON}\n`

### Các loại event chính

#### a) `message_start` - Bắt đầu response

```json
{
  "type": "message_start",
  "message": {
    "uuid": "response-message-uuid"
  }
}
```

#### b) `content_block_start` - Bắt đầu 1 block

```json
{
  "type": "content_block_start",
  "index": 0,
  "content_block": {
    "type": "text"  // hoặc "thinking", "tool_use", "tool_result"
  }
}
```

#### c) `content_block_delta` - Stream nội dung

**Text delta:**
```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {
    "type": "text_delta",
    "text": "Hello"
  }
}
```

**Thinking delta:**
```json
{
  "type": "content_block_delta",
  "index": 1,
  "delta": {
    "type": "thinking_delta",
    "thinking": "Let me analyze..."
  }
}
```

**Tool input delta:**
```json
{
  "type": "content_block_delta",
  "index": 2,
  "delta": {
    "type": "input_json_delta",
    "partial_json": "{\"query\":"
  }
}
```

#### d) `content_block_stop` - Kết thúc block

```json
{
  "type": "content_block_stop",
  "index": 0
}
```

#### e) `message_delta` - Kết thúc message

```json
{
  "type": "message_delta",
  "delta": {
    "stop_reason": "end_turn"
  }
}
```

---

## 5. XỬ LÝ SSE STREAM

### Flow xử lý

```typescript
// 1. Tạo state để tracking
const state = {
  fullResponse: '',
  lastMessageUuid: '',
  contentBlocks: new Map(),  // Map<blockIndex, ContentBlock>
  pendingCitations: new Map()
};

// 2. Đọc từng chunk SSE
response.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      processSSEEvent(data, state, callbacks);
    }
  }
});
```

### Xử lý từng event

```typescript
function processSSEEvent(data, state, callbacks) {
  const { contentBlocks } = state;
  
  // message_start
  if (data.type === 'message_start') {
    state.lastMessageUuid = data.message.uuid;
  }
  
  // content_block_start
  if (data.type === 'content_block_start') {
    const block = {
      type: data.content_block.type,
      index: data.index,
      text: '',
      thinking: '',
      // ...
    };
    contentBlocks.set(data.index, block);
  }
  
  // content_block_delta
  if (data.type === 'content_block_delta') {
    const block = contentBlocks.get(data.index);
    
    if (data.delta.type === 'text_delta') {
      block.text += data.delta.text;
      state.fullResponse += data.delta.text;
      callbacks.onTextDelta?.(data.delta.text, state.fullResponse);
    }
    
    if (data.delta.type === 'thinking_delta') {
      block.thinking += data.delta.thinking;
      callbacks.onThinkingDelta?.(block.thinking);
    }
  }
  
  // message_delta với stop_reason
  if (data.type === 'message_delta' && data.delta.stop_reason) {
    callbacks.onComplete?.(state.fullResponse, state.lastMessageUuid);
  }
}
```

---

## 6. UPLOAD FILES

### API Endpoint

```
POST https://claude.ai/api/{orgId}/upload
```

### Request (multipart/form-data)

```
------ElectronFormBoundary123456
Content-Disposition: form-data; name="file"; filename="example.pdf"
Content-Type: application/pdf

<binary data>
------ElectronFormBoundary123456--
```

### Response

```json
{
  "document": {
    "document_id": "doc-uuid",
    "file_name": "example.pdf",
    "size_bytes": 12345,
    "file_type": "application/pdf",
    "file_url": "/api/...",
    "extracted_content": "..."
  }
}
```

### Gửi file khi chat

```json
{
  "prompt": "Analyze this file",
  "files": ["doc-uuid-1", "doc-uuid-2"],  // Chỉ gửi ID
  "attachments": []  // Metadata để hiển thị UI
}
```

---

## 7. KIẾN TRÚC TỔNG THỂ

```
┌──────────────────────────────────────────────┐
│  RENDERER (UI - main.ts trong src/renderer)  │
│  • Hiển thị messages                         │
│  • Lắng nghe IPC events                      │
│  • Render streaming content real-time        │
└──────────────────────────────────────────────┘
                    ↕
           IPC (contextBridge)
                    ↕
┌──────────────────────────────────────────────┐
│  MAIN PROCESS (src/main.ts)                  │
│  • Quản lý windows, shortcuts                │
│  • IPC handlers                              │
│  • Phát events về renderer                   │
└──────────────────────────────────────────────┘
                    ↕
           API Calls
                    ↕
┌──────────────────────────────────────────────┐
│  API CLIENT (src/api/client.ts)              │
│  • makeRequest() - HTTP requests             │
│  • streamCompletion() - SSE streaming        │
│  • prepareAttachmentPayload() - Upload       │
└──────────────────────────────────────────────┘
                    ↕
           Parse SSE
                    ↕
┌──────────────────────────────────────────────┐
│  STREAM PARSER (src/streaming/parser.ts)     │
│  • processSSEChunk() - Parse chunks          │
│  • processSSEEvent() - Xử lý từng event      │
│  • buildSteps() - Tạo timeline               │
└──────────────────────────────────────────────┘
                    ↕
           HTTPS + Cookies
                    ↕
┌──────────────────────────────────────────────┐
│  CLAUDE.AI API                               │
│  /api/organizations/{orgId}/...              │
└──────────────────────────────────────────────┘
```

---

## 8. FLOW GỬI - NHẬN MESSAGE

```
[1] User nhập tin nhắn + click Send
         ↓
[2] Renderer: sendMessage()
         ↓
[3] IPC: invoke('send-message', conversationId, message, parentUuid, attachments)
         ↓
[4] Main: ipcMain.handle('send-message')
         ↓
[5] API Client: streamCompletion()
    • Gọi POST /completion
    • Nhận SSE stream
         ↓
[6] Stream Parser: processSSEChunk()
    • Parse từng event: text_delta, thinking_delta, tool_use...
    • Trigger callbacks
         ↓
[7] Main: callbacks.onTextDelta() / onThinkingStart()...
    • Phát IPC events: 'message-stream', 'message-thinking'...
         ↓
[8] Renderer: onMessageStream() / onMessageThinking()...
    • Cập nhật streamingBlocks
    • Render UI real-time
         ↓
[9] Complete: onMessageComplete()
    • Lưu messageUuid
    • Reset streaming state
    • Enable input
```

---

## 9. ĐIỂM QUAN TRỌNG

### ✅ Ưu điểm
- **Không cần backend riêng** - sử dụng trực tiếp Claude API
- **Cookie-based auth** - tận dụng session của claude.ai
- **SSE streaming** - real-time updates mượt mà
- **IPC + callbacks** - tách biệt UI và logic rõ ràng

### ⚠️ Lưu ý
- **Cookies expire** - cần re-login khi session hết hạn
- **Rate limits** - API có giới hạn requests
- **File size limits** - Upload có giới hạn kích thước
- **Network errors** - cần xử lý retry/reconnect

---

## 10. CODE MẪU ĐƠN GIẢN HÓA

### Send message và nhận stream

```typescript
// Tạo conversation
const { conversationId } = await createConversation('claude-opus-4-5-20251101');

// Gửi message
const state = createStreamState();

await streamCompletion(orgId, conversationId, 'Hello', conversationId, 
  (chunk) => {
    processSSEChunk(chunk, state, {
      onTextDelta: (text, fullText) => {
        console.log('Text:', text);
        updateUI(fullText);
      },
      onComplete: (fullText, steps, messageUuid) => {
        console.log('Done:', fullText);
        saveMessageUuid(messageUuid);
      }
    });
  }
);
```

### Upload file

```typescript
// Upload file
const file = { name: 'test.pdf', size: 12345, type: 'application/pdf', data: arrayBuffer };
const attachment = await prepareAttachmentPayload(file);

// Gửi message với file
await streamCompletion(orgId, conversationId, 'Analyze this file', parentUuid,
  onData,
  { files: [attachment.document_id] }
);
```

---

## 11. API ENDPOINTS SUMMARY

| Endpoint | Method | Mục đích |
|----------|--------|----------|
| `/api/organizations/{orgId}/chat_conversations` | POST | Tạo conversation mới |
| `/api/organizations/{orgId}/chat_conversations` | GET | Lấy danh sách conversations |
| `/api/organizations/{orgId}/chat_conversations/{id}` | GET | Lấy chi tiết conversation |
| `/api/organizations/{orgId}/chat_conversations/{id}` | PUT | Rename/star conversation |
| `/api/organizations/{orgId}/chat_conversations/{id}` | DELETE | Xóa conversation |
| `/api/organizations/{orgId}/chat_conversations/{id}/completion` | POST | Gửi message (SSE) |
| `/api/organizations/{orgId}/chat_conversations/{id}/stop_response` | POST | Dừng streaming |
| `/api/organizations/{orgId}/chat_conversations/{id}/title` | POST | Generate title |
| `/api/{orgId}/upload` | POST | Upload file |

---

## 12. COOKIES CẦN THIẾT

```
sessionKey=<token>          // Session authentication
lastActiveOrg=<org-uuid>    // Organization ID
```

**Lưu ý:** Cookies được tự động gửi khi dùng `useSessionCookies: true` trong `net.request()`.