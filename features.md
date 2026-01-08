# Tổng Quan Tính Năng Systema

Tài liệu này liệt kê chi tiết các tính năng hiện có và lộ trình phát triển tiềm năng của dự án Systema.

## 🌟 Tính Năng Hiện Tại (Current Features)

### 1. Hệ Thống Proxy & Chặn Bắt (Core Proxy)
-   **Chặn bắt HTTP/HTTPS**: Sử dụng `http-mitm-proxy` để kiểm soát toàn bộ lưu lượng mạng.
-   **Giải mã SSL/TLS**: Tự động tạo và quản lý chứng chỉ CA để giải mã lưu lượng HTTPS an toàn.
-   **Hỗ trợ nén nâng cao**: Tự động giải nén các định dạng hiện đại như `zstd`, `brotli` (br), bên cạnh `gzip` và `deflate`.
-   **Khởi chạy ứng dụng (App Launcher)**: Tích hợp sẵn khả năng khởi chạy ứng dụng (ví dụ: VS Code) với cấu hình proxy được thiết lập tự động, giúp việc gỡ lỗi trở nên liền mạch.
-   **Lọc nhiễu thông minh**: Tự động ẩn các lỗi kết nối không quan trọng (như `ECONNRESET`, `socket hang up`) thường gặp khi gỡ lỗi ứng dụng Electron/Node.js.

### 2. Giao Diện Giám Sát (Inspector UI)
-   **Monitor thời gian thực**: Danh sách request cập nhật live với các chỉ số quan trọng (status, method, domain, time).
-   **Phân loại nội dung thông minh**: Tự động nhận diện loại traffic: API (XHR), Scripts (JS), Styles (CSS), Hình ảnh, Media, Fonts, WebSocket, v.v.
-   **Traffic Dashboard**: Cái nhìn tổng quan về phiên làm việc hiện tại.

### 3. Phân Tích Request Chuyên Sâu (Deep Analysis)
Hệ thống tự động phân tích từng request và cung cấp các báo cáo chi tiết:

#### 🔍 Tổng Quan & Điểm Số (Overview & Scoring)
-   **Chấm điểm tự động**: Đánh giá request dựa trên Bảo mật, Hiệu suất và Độ tin cậy (Overall Grade A-F).
-   **Quick Insights**: Cảnh báo nhanh về trạng thái (Thành công/Lỗi/Cảnh báo) và giao thức (Secure/Insecure).

#### 🛠 Chi Tiết Kỹ Thuật
-   **Headers**: Hiển thị headers theo nhóm (General, Auth, Client, Cache, Security, CORS) giúp dễ dàng tra cứu.
-   **Body Preview**:
    -   Tự động format JSON cho dễ đọc.
    -   Nhận diện và hiển thị dữ liệu Binary/Image.
    -   Thông tin về kích thước và định dạng Content-Type.
-   **Cookies**: Phân tích từng cookie, kiểm tra các cờ bảo mật (`Secure`, `HttpOnly`, `SameSite`) và cảnh báo nếu thiếu an toàn.

#### 🛡 Bảo Mật (Security)
-   **Protocol & Cipher**: Hiển thị phiên bản TLS và độ mạnh của thuật toán mã hóa (Cipher Suite).
-   **Chứng chỉ (Certificate)**: Kiểm tra tính hợp lệ, tổ chức phát hành (Issuer) và thời hạn của chứng chỉ SSL.
-   **Security Headers**: Kiểm tra sự tồn tại của các headers bảo mật quan trọng như `HSTS`, `X-Frame-Options`, `CSP`, `X-XSS-Protection`.

#### ⏱ Hiệu Suất & Mạng (Timing & Network)
-   **Timing Phases**: Biểu đồ thác nước (waterfall) chi tiết các giai đoạn: DNS Lookup, TCP Handshake, SSL Handshake, TTFB, và Content Download.
-   **Network Info**: Thông tin về địa chỉ IP máy chủ, geo-location dự đoán (Quốc gia/Thành phố/ISP).

#### ⚠️ Phát Hiện Vấn Đề (Issues)
-   **Phân tích lỗi tự động**: Tự động quét và liệt kê các vấn đề tiềm ẩn (ví dụ: thiếu Content-Security-Policy, Mixed Content) và đưa ra gợi ý khắc phục.

---

## 🚀 Tính Năng Tiềm Năng (Roadmap Ideas)

### 1. Công Cụ Debug & Thao Tác Nâng Cao
-   **Request Replay & Edit**: Khả năng chỉnh sửa headers/body của một request đã bắt được và gửi lại (resend) để test API nhanh chóng.
-   **Breakpoints**: Tạm dừng request đang bay (in-flight), cho phép sửa đổi dữ liệu trước khi gửi đến server hoặc trước khi trả về client.
-   **Local Map / Remote Map**: Trỏ một tên miền hoặc đường dẫn cụ thể về file local hoặc một server khác (hữu ích để test frontend với dữ liệu giả lập).
-   **Network Throttling**: Giả lập mạng chậm (3G, Offline) để kiểm tra độ ổn định của ứng dụng.

### 2. Mở Rộng Khả Năng Giám Sát
-   **WebSocket Inspector**: Xem chi tiết từng frame tin nhắn gửi/nhận qua WebSocket/Socket.io.
-   **GraphQL Explorer**: Tự động parse body GraphQL để hiển thị Query/Mutation và Variables rõ ràng hơn.
-   **Diff Viewer**: So sánh sự khác nhau giữa 2 requests bất kỳ (headers, body, timing).
-   **Advanced Search (QL)**: Tìm kiếm nâng cao với cú pháp truy vấn (ví dụ: `method:POST status:>=400 body:"error"`).

### 3. Tự Động Hóa & Cộng Tác
-   **Scripting Middleware**: Cho phép người dùng viết script nhỏ (JS/TS) để tự động sửa đổi traffic theo logic tùy chỉnh.
-   **Mock Server**: Tạo các endpoint giả lập ngay trong ứng dụng để trả về dữ liệu mẫu mà không cần backend thực.
-   **Chia sẻ Session**: Xuất/Nhập dữ liệu phiên làm việc (file .HAR hoặc định dạng riêng) để gửi cho đồng nghiệp debug.
-   **API Generator**: Tự động tạo code gọi API (Fetch, Curl, Axios, Python...) từ request đã bắt được.

### 4. Quản Lý & Tiện Ích
-   **Profiles/Environments**: Lưu các cấu hình proxy khác nhau cho các môi trường (Staging, Prod, Dev).
-   **Vulnerability Scanner**: Quét thụ động các lỗi bảo mật phổ biến (OWASP Top 10) trên lưu lượng đi qua.
-   **Dark/Light Mode Theme**: Tùy chỉnh giao diện người dùng.
