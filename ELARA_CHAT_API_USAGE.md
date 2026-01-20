# Hướng dẫn sử dụng API Chat Elara

Tài liệu này mô tả cách sử dụng API gửi và nhận tin nhắn của Elara, dựa trên phân tích mã nguồn từ `temp/Elara/src/renderer/src/features/playground`.

## Tổng quan

API này hỗ trợ gửi tin nhắn trò chuyện tới các tài khoản AI (DeepSeek, Claude, etc.) thông qua server Elara. Nó hỗ trợ cả phản hồi dạng streaming (SSE) và non-streaming.

## Chi tiết API

### 1. Endpoint
**POST** `/v1/chat/accounts/:accountId/messages`

- `:accountId`: ID của tài khoản được sử dụng để chat.
- `port`: Port của server Elara (thường trả về từ `window.api.server.start()`).

### 2. Request Body
Body gửi đi là JSON object:

```json
{
  "model": "model-id",           // ID của model muốn sử dụng (ví dụ: "deepseek-reasoner")
  "messages": [                  // Lịch sử chat và tin nhắn mới
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there" },
    { "role": "user", "content": "New question" }
  ],
  "conversationId": "string",    // ID của cuộc hội thoại (để trống hoặc "new-session" nếu là cuộc hội thoại mới)
  "stream": true,                // true để nhận phản hồi dạng stream (SSE), false để nhận response thường
  "search": false,               // true để bật tính năng tìm kiếm web (nếu provider hỗ trợ)
  "thinking": true,              // true để bật tính năng "Thinking" (cho model như DeepSeek R1)
  "ref_file_ids": ["file_id_1"]  // Mảng chứa các ID file (lấy từ API Upload) để đính kèm
}
```

### 3. Response Handling

#### A. Streaming Response (`stream: true`)
Server trả về các sự kiện **Server-Sent Events (SSE)**. Mỗi dòng bắt đầu bằng `data: `.
Cần parse từng chunk dữ liệu:

1.  **Format**: `data: {JSON_OBJECT}`
2.  **Các trường trong JSON**:
    -   `content`: (string) Nội dung tin nhắn trả về (cộng dồn vào tin nhắn hiện tại).
    -   `thinking`: (string) Nội dung suy nghĩ của model (cộng dồn vào phần thinking).
    -   `meta`: (object) Thông tin metadata cập nhật.
        -   `conversation_id`: ID của cuộc hội thoại (quan trọng khi chat mới).
        -   `conversation_title`: Tiêu đề tự động tạo cho cuộc hội thoại.
        -   `thinking_elapsed`: Thời gian suy nghĩ.

**Ví dụ xử lý Stream (JavaScript/TypeScript):**

```typescript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') break;

      try {
        const parsed = JSON.parse(dataStr);

        // 1. Xử lý nội dung hiển thị
        if (parsed.content) {
          // appendToMessage(parsed.content);
        }

        // 2. Xử lý nội dung suy nghĩ (DeepSeek R1)
        if (parsed.thinking) {
          // appendToThinking(parsed.thinking);
        }

        // 3. Xập nhật thông tin hội thoại
        if (parsed.meta) {
           if (parsed.meta.conversation_id) setChatId(parsed.meta.conversation_id);
           if (parsed.meta.conversation_title) setTitle(parsed.meta.conversation_title);
        }
      } catch (e) {
        // Ignore JSON parse errors on partial chunks
      }
    }
  }
}
```

#### B. Non-Streaming Response (`stream: false`)
Server trả về JSON trọn vẹn:

```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "Full response content here..."
  },
  "metadata": {
    "conversation_id": "...",
    "conversation_title": "..."
  }
}
```

## Lưu ý quan trọng
1.  **Thinking Mode**: Với các model như DeepSeek R1, trường `thinking` trong stream response chứa quy trình suy luận. Client cần xử lý hiển thị riêng biệt phần này (thường là trong block có thể mở rộng/thu gọn).
2.  **File Attachments**: Các file phải được upload trước qua API Upload để lấy `ref_file_ids`. Không gửi trực tiếp file binary trong API chat này.
3.  **Conversation ID**: Luôn cập nhật `conversationId` từ phản hồi đầu tiên của cuộc trò chuyện mới để duy trì ngữ cảnh cho các tin nhắn sau.
