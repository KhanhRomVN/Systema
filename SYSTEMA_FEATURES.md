# Systema - Tính năng & Lộ trình phát triển

Tài liệu này liệt kê các khả năng hiện tại của công cụ Systema và đề xuất lộ trình chi tiết các tính năng mới nhằm biến Systema thành một "Siêu ứng dụng" trong lĩnh vực theo dõi, gỡ lỗi và bảo mật mạng.

## 🚀 Tính năng hiện có

Systema hiện là một công cụ kiểm tra HTTPS mạnh mẽ với các khả năng AI được tích hợp sẵn.

### 1. Kiểm tra Lưu lượng (Inspector)
- **Giám sát lưu lượng trực tiếp**: Ghi lại và hiển thị các yêu cầu HTTP/HTTPS theo thời gian thực.
- **Phân tích yêu cầu chi tiết**:
  - **Tổng quan**: Trạng thái, phương thức, host, độ trễ, kích thước.
  - **Yêu cầu/Phản hồi**: Chi tiết đầy đủ về headers, cookies, và body.
  - **Trình xem Body (Viewers)**:
    - **JSON/XML**: Tree view, format tự động, tô màu cú pháp.
    - **Raw**: Xem dữ liệu thô.
  - **Thời gian (Timing)**: Phân tích chi tiết thác nước (DNS, Connect, SSL, TTFB, Download).
  - **Bảo mật**: Chi tiết về phiên bản TLS, Cipher suite, Valid/Invalid Certificate.
- **Lọc & Tìm kiếm**:
  - Tìm kiếm văn bản toàn cục (Global Search) trên Headers, Body, URL.
  - Lọc nâng cao theo nhiều tiêu chí (Domain, Method, Status Code, Body size).
  - Bộ lọc nhanh (Quick Filters) trên thanh công cụ.

### 2. Trình soạn thảo Yêu cầu (API Client)
- **Composer**: Tạo yêu cầu HTTP thủ công (GET, POST, PUT, DELETE, PATCH, HEAD...).
- **Trình chỉnh sửa thông minh**:
  - **Params/Headers**: Nhập liệu dạng Key-Value (Table view).
  - **Authorization**: UI chuyên biệt cho Bearer Token, Basic Auth, API Key, OAuth2.
  - **Body**: Hỗ trợ JSON, Form-data (multipart), x-www-form-urlencoded, Binary, Raw.
- **Xử lý phản hồi**: Lưu lịch sử phản hồi, xem lại phản hồi của các lần gửi trước.
- **Bộ sưu tập (Collections)**: Quản lý request theo thư mục, dự án.

### 3. Công cụ & Tiện ích
- **Log Viewer**: Xem log realtime từ devices (hỗ trợ logcat/os_log qua adb/tidevice).
- **Crypto Tab**: Công cụ mã hóa/giải mã (Base64, URL Encode, MD5, SHA256, AES...).
- **Sources Viewer**: Xem mã nguồn response (HTML/JS/CSS) với định dạng đẹp.
- **Context Menu**: Các hành động nhanh trên văn bản được chọn (Gửi tới Crypto, Tìm kiếm...).

### 4. AI & Cộng tác
- **AI Assistant**: Chatbot tích hợp hiểu ngữ cảnh request/response hiện tại.
- **WebSocket Agent**: Giao tiếp thời gian thực với backend để xử lý tác vụ AI nặng.
- **Profiles**: Quản lý nhiều hồ sơ làm việc khác nhau.

---

## 💡 Đề xuất tính năng mới (Massive Roadmap)

### 🛡️ 1. Bảo mật & Penetration Testing (Chuyên sâu)
- **Fuzzing Tự động**: Tự động gửi hàng loạt request với các input rác/biên để tìm lỗi crash server hoặc lỗ hổng input validation.
- **SQL Injection Scanner**: Tự động kiểm tra các param trong URL/Body xem có khả năng bị SQL Injection không.
- **XSS Probe**: Tự động inject các đoạn script test vào response phản hồi để phát hiện lỗi Cross-Site Scripting.
- **Sensitive Data Exposure**: Quét regex để tìm số thẻ tín dụng, SSN, API Key trong log và cảnh báo ngay lập tức.
- **JWT Attack Helper**: Thử giả mạo JWT bằng cách đổi thuật toán (None attack) hoặc brute-force secret key yếu.
- **CORS Analyzer**: Phân tích header `Access-Control-Allow-Origin` để phát hiện cấu hình quá lỏng lẻo.

### ⚙️ 2. Kiểm soát & Giả lập Mạng (Interception & Mocking)
- **Rule-based Breakpoints**: Dừng request dựa trên điều kiện logic phức tạp (Vd: `Body.user.id == 123` VÀ `Header.Auth không tồn tại`).
- **Dynamic Mocking**: 
  - Mock API trả về dữ liệu ngẫu nhiên theo schema (Fake Name, Fake Email).
  - Delay ngẫu nhiên (Jitter) để giả lập server không ổn định.
- **Map Remote nâng cao**: Regex rewrite URL, thay đổi port động.
- **Scripting Middleware (JS/Python/Lua)**: Viết plugin nhỏ để xử lý luồng data.
- **Auto-Reply Rules**: Tự động trả lời `200 OK` cho tất cả các request tracking/analytics để giảm nhiễu.

### 📡 3. Đa Giao thức & Định dạng
- **WebSocket Inspector & Manipulator**:
  - Xem, lọc, search message.
  - **Message Editor**: Sửa nội dung message ngay trước khi nó được gửi đi (Break message).
- **gRPC / Protobuf / Avro / Thrift**: Hỗ trợ giải mã hầu hết các định dạng binary RPC phổ biến.
- **SOAP/WSDL**: Hỗ trợ parse XML SOAP Request/Response cũ.
- **MQTT**: Debug các thiết bị IoT dùng giao thức MQTT.
- **Video/Audio Streaming**: 
  - Tự động phát hiện luồng HLS (.m3u8) / DASH (.mpd).
  - Tích hợp Player để xem trước video segment ngay trong tool.
- **Image Preview**: Xem trước ảnh WebP, AVIF, HEIC, SVG.

### 📱 4. Hệ sinh thái Di động (Mobile First)
- **QR Code Pairing**: Setup proxy trong 3 giây.
- **Cookie Passthrough**: Đồng bộ trạng thái đăng nhập từ PC sang Mobile.
- **Device Logs Integration (Nâng cao)**:
  - Màu sắc hóa Logcat/Syslog theo mức độ (Info, Warn, Error).
  - Filter log theo Process ID (PID) hoặc Tên ứng dụng.
- **Network Profile Switching**: 1 nút bấm để chuyển đổi giả lập mạng: "Very Bad Network", "High Latency 3G", "Offline".
- **Battery Impact Analysis**: Ước tính lượng pin tiêu thụ dựa trên khối lượng data transfer và thời gian giữ kết nối (Radio active time).

### ⚡ 5. Tiện ích cho Developer (Utilities)
- **Diff Tool (Supercharged)**: So sánh JSON bằng cấu trúc (Structure Diff) chứ không chỉ text diff (Bỏ qua thứ tự key).
- **Regex Tester**: Công cụ test Regex ngay trong app để viết bộ lọc.
- **JSONPath / XPath Extractor**: Test nhanh các câu truy vấn trích xuất dữ liệu.
- **Time Converter**: Chuyển đổi qua lại giữa Timestamp (ms/s) và định dạng ngày tháng con người đọc được ngay khi hover chuột.
- **Base64 Image Decoder**: Tự động hiển thị ảnh nếu phát hiện chuỗi Base64 trong JSON.
- **CURL Import/Export**: Hỗ trợ mọi flag của cURL.

### 🤖 6. AI Intelligence (Systema Brain)
- **Anomaly Detection**: Cảnh báo bất thường dựa trên học máy (VD: Pattern lạ chưa từng xuất hiện).
- **Auto-Swagger**: Tự động vẽ lại sơ đồ API (OpenAPI 3.0) từ traffic thực tế.
- **Smart Remediation**: Khi gặp lỗi 4xx/5xx, AI đề xuất nguyên nhân và cách sửa (VD: "Lỗi 401 này khả năng cao do Token hết hạn lúc 10:00 AM").
- **Cost Estimator**: Ước tính chi phí AWS/Cloud dựa trên dung lượng băng thông đang sử dụng.

### 🏢 7. Tính năng Doanh nghiệp (Enterprise)
- **Team Sync**: Đồng bộ Realtime các request đang bắt được cho cả team cùng xem (Live Share).
- **Audit Logs**: Ghi lại ai đã xem request nào, export dữ liệu gì (Cho banking/security compliance).
- **Role Based Access**: Giới hạn nhân viên chỉ được xem Header, không được xem Body chứa PII.
- **SSO Login**: Đăng nhập bằng Google Workspace / Okta / Azure AD.
- **Self-Hosted Server**: Triển khai Systema Proxy Server riêng trên hạ tầng công ty.

### 🧩 8. Hệ thống Mở rộng (Extensibility)
- **Plugin System**: Cho phép cộng đồng viết plugin thêm tính năng (VD: Plugin decode custom protocol của game).
- **Theme Builder**: Tự tạo giao diện, màu sắc riêng.
- **Macro Recorder**: Ghi lại chuỗi hành động (Login -> Click -> Mua hàng) và phát lại (Replay) tự động.
- **CI/CD Integration**: Chạy Systema ở chế độ Headless trong Jenkins/GitHub Actions để test API tự động.
