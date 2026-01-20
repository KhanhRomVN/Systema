# Hướng dẫn sử dụng API Upload File

Tài liệu này mô tả cách sử dụng API upload file dựa trên việc phân tích mã nguồn từ `temp/Elara/src/renderer/src/features/playground`.

## Tổng quan

Chức năng upload file hiện được hỗ trợ cho các nhà cung cấp (providers) như **DeepSeek** và **Claude**. Quy trình bao gồm việc upload file lên server cục bộ để lấy `file_id`, sau đó sử dụng ID này khi gửi tin nhắn chat.

## Chi tiết API

### 1. Endpoint
**POST** `/v1/chat/accounts/:accountId/uploads`

Trong đó:
- `:accountId` là ID của tài khoản đang sử dụng (ví dụ: tài khoản DeepSeek).
- Server thường chạy trên port do `window.api.server.start()` trả về (mặc định có thể là 11434).

### 2. Request Headers
- `Content-Type`: Không cần set thủ công nếu dùng `FormData` (trình duyệt sẽ tự động thêm `multipart/form-data` và boundary).

### 3. Request Body
Body gửi đi là `FormData` chứa file:
- Key: `file`
- Value: File object (Binary)

### 4. Response
Phản hồi thành công sẽ trả về JSON có cấu trúc:

```json
{
  "success": true,
  "data": {
    "file_id": "string", // ID của file đã upload
    "token_usage": 123   // (Optional) Số token sử dụng (nếu có)
  }
}
```

## Quy trình tích hợp (Workflow)

1.  **Chọn file**: Người dùng chọn file từ giao diện (hỗ trợ images, .pdf, .txt, .md, .csv, .json).
2.  **Upload file**:
    - Gọi API upload tới endpoint trên.
    - Nhận lại `file_id`.
3.  **Gửi tin nhắn đính kèm file**:
    - Khi gọi API gửi tin nhắn (`POST /v1/chat/accounts/:accountId/messages`), thêm trường `ref_file_ids` vào body.

```json
{
  "model": "model-name",
  "messages": [...],
  "ref_file_ids": ["file_id_return_from_upload_api"],
  "stream": true
  // ...
}
```

## Ví dụ mã (JavaScript)

Dưới đây là ví dụ minh họa cách thực hiện upload file:

```javascript
async function uploadFile(file, accountId, port = 11434) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `http://localhost:${port}/v1/chat/accounts/${accountId}/uploads`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data?.file_id) {
      console.log("Upload thành công. File ID:", result.data.file_id);
      return result.data.file_id;
    } else {
      console.error("Upload thất bại:", result.error);
    }
  } catch (error) {
    console.error("Lỗi hệ thống:", error);
  }
}
```
