# Open DeepSeek - Kiến trúc Web (Reverse Engineered)

> [!WARNING]
> Tài liệu này mô tả cách sử dụng **Internal Web API** của DeepSeek (`chat.deepseek.com`).
> Phương pháp này không chính thống, có thể bị thay đổi hoặc chặn bất cứ lúc nào.

## 1. AUTHENTICATION (Web Login)

### Cơ chế: Browser Sniffing

Thay vì nhập API Key, ứng dụng sẽ mở một cửa sổ trình duyệt (Hidden/Visible) để user đăng nhập vào `chat.deepseek.com`. Main process sẽ lắng nghe network requests để "bắt" token.

```typescript
// Trong Main Process
session.defaultSession.webRequest.onBeforeSendHeaders(
  { urls: ['https://chat.deepseek.com/api/*'] },
  (details, callback) => {
    const authHeader = details.requestHeaders['Authorization'];
    if (authHeader) {
      store.set('deepseekToken', authHeader); // Lưu Bearer Token
    }
    callback({});
  }
);
```

**Cần lưu:**
1. `Authorization`: Bearer token xác thực user.
2. `Cookies`: Session cookies (quan trọng cho Cloudflare/WAF).

---

## 2. QUẢN LÝ HỘI THOẠI

### API Endpoint

```
POST https://chat.deepseek.com/api/v0/chat/completions
(Hoặc endpoint tương tự tìm thấy khi inspect network)
```

DeepSeek Web có thể cần `parent_message_id` để duy trì context.

---

## 3. GỬI TIN NHẮN (SEND MESSAGE)

### Payload (Dự đoán từ Web Traffic)

```json
{
  "message": "Hello",
  "stream": true,
  "model_class": "deepseek_chat", // hoặc "deepseek_code"
  "temperature": 0.0,
  "conversation_id": null, // null cho chat mới
  "parent_message_id": null
}
```

*Lưu ý: Payload thực tế có thể khác, cần verify qua DevTools.*

---

## 4. QUY TRÌNH (FLOW)

1. **User Click Login**: Mở `CreateAuthWindow` load `chat.deepseek.com`.
2. **User Login**: User đăng nhập bằng Google/Email/Phone.
3. **Capture Token**: Main process bắt được header `Authorization`.
4. **Close Auth**: Token được lưu, cửa sổ Auth đóng.
5. **Chat**: Client dùng Token + Cookies để gọi API.

---

## 5. RỦI RO

- **PoW (Proof of Work)**: DeepSeek có thể yêu cầu tính toán PoW client-side. Nếu request từ NodeJS không có PoW, có thể bị 403.
- **WAF**: Cloudflare có thể chặn request không phải từ browser thật.
    - *Giải pháp*: Dùng `session.request` của Electron (giả lập browser request tốt hơn fetch thường) hoặc copy đầy đủ User-Agent.
