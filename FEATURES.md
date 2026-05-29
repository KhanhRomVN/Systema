# Systema — Danh sách chức năng hiện có

## 1. Request Inspector (Bảng chính)

- Bắt và hiển thị toàn bộ HTTPS traffic theo thời gian thực
- Bảng danh sách request với các cột: Method, Host, Path, Status, Type, Size, Time
- Chế độ xem Timeline (biểu đồ thời gian các request)
- Tìm kiếm và lọc request theo nhiều tiêu chí (method, host, status, type, size, time...)
- Chọn request để xem chi tiết

## 2. Request Details (Chi tiết request)

- **Headers**: Xem request headers và response headers
- **Body**: Xem request body và response body, hỗ trợ raw mode
- **Network**: Thông tin kết nối mạng (IP, protocol, timing...)
- **Trace**: Biểu đồ luồng dữ liệu của request (dạng node graph)
- **Composer**: Tái tạo và gửi lại request đã chọn
- Context menu khi bôi đen text: "Add to Crypto" và "Use in Search"

## 3. Sidebar — AI Chat

- Giao diện chat với AI assistant để debug và phân tích traffic
- Hỗ trợ nhiều provider (Elara Free, và các provider khác)
- Lưu lịch sử hội thoại theo session
- Cài đặt provider (model, base URL...)
- Đính kèm request/context vào chat

## 4. Sidebar — Target

- Chọn ứng dụng mục tiêu để bắt traffic (web browser, Electron app, Android app)
- Hỗ trợ 3 platform: Web, PC (Electron), Android (native)
- Quản lý kết nối proxy
- Kiểm tra và cài đặt Frida trên Android emulator
- Lưu và tải profile (snapshot toàn bộ session)
- Xác nhận chuyển đổi app đang theo dõi

## 5. Sidebar — Sources

- Duyệt cây thư mục các file JS, CSS, HTML, JSON, XML được tải về
- Xem source code với syntax highlighting
- Layout chia đôi có thể kéo thay đổi kích thước

## 6. Sidebar — Log

- Xem Android logcat theo thời gian thực
- Lọc theo log level (Verbose, Debug, Info, Warning, Error, Fatal)
- Tìm kiếm với hỗ trợ: match case, whole word, regex
- Lọc theo package/app cụ thể
- Ẩn tag không cần thiết
- Pause/Resume, xóa log, tải xuống log
- Auto-scroll với giới hạn 10.000 dòng

## 7. Sidebar — Composer Manager (Collections)

- Lưu các request vào collection để tái sử dụng
- Tìm kiếm trong collection
- Xem sơ đồ luồng (Diagram) của request đã lưu
- Tạo diagram mới từ request hiện tại

## 8. Sidebar — Trace

- Tạo và lưu trace (biểu đồ node graph) từ nhiều request
- Liên kết các giá trị giữa request header/body với nhau
- Tìm kiếm và highlight node theo giá trị
- Lưu nhiều trace theo tên, xóa trace

## 9. Sidebar — Compare

- So sánh 2 request song song (diff view)
- Lưu các cặp so sánh để dùng lại
- Hỗ trợ nhiều tab diff: Headers, Body, Network...
- Tìm kiếm trong kết quả diff

## 10. Sidebar — Crypto

- Quản lý các "Crypto Card" (lưu chuỗi cần phân tích)
- **String mode**: Encode/decode chuỗi qua nhiều bước (Base64, URL encode, Hash, AES, RSA...)
- **File mode**: Encode/decode file nhị phân
- Thêm nhanh text từ request vào Crypto qua context menu
- Lưu card với tên và mô tả

## 11. Sidebar — Media

- Tự động phát hiện file ảnh, video, audio từ traffic
- Lọc theo loại media (image/video/audio) và nguồn
- Tìm kiếm theo tên file
- Xem preview ảnh/video/audio trong modal
- Hiển thị trạng thái cache

## 12. Sidebar — WASM Manager

- Tự động phát hiện WebAssembly module từ traffic
- Phát hiện qua nhiều phương pháp: Content-Type, Extension, Magic Bytes, JS Heuristic, Embedded
- Tìm kiếm module theo tên hoặc URL
- Tải xuống file `.wasm` gốc


Breakpoints (Ngắt quãng): Dừng request/response trước khi gửi/nhận để chỉnh sửa header, body, status code theo thời gian thực.
Intruder (Tấn công tự động)	Gửi cùng một request với nhiều payload (từ danh sách, brute-force, số, ngày tháng…) vào các vị trí được đánh dấu, dùng để phát hiện SQLi, XSS, IDOR…