# Nhật Ký Reverse Engineering Zai x-signature

Tài liệu này ghi lại toàn bộ quá trình phân tích và reverse engineering thuật toán sinh `x-signature` của Zai.

## 1. Khởi Đầu & Thu Thập Thông Tin
Mục tiêu là tìm ra cách client sinh ra header `x-signature` trong request gửi lên server.
- **Quan sát**: Request mẫu trong `https.md` cho thấy `x-signature` là một chuỗi hex 64 ký tự (tương ứng độ dài SHA-256).
- **Tìm kiếm**: Quét toàn bộ source code tải về (trong thư mục `temp/Zai_ALO`) để tìm từ khóa "x-signature".
- **Phát hiện**: File `BEe54yZ2.js` chứa chuỗi `"x-signature"` nhưng nằm trong một mảng string lớn bị obfuscate.

## 2. Giải Mã String Obfuscation (Lớp vỏ bảo vệ)
Code của Zai được bảo vệ bằng kỹ thuật "String Array Rotation".
- **Cấu trúc**:
    - Một mảng lớn `Te` chứa hàng trăm chuỗi vô nghĩa.
    - Một hàm giải mã `H` (hoặc alias `Y`, `r`) nhận vào `index` và trả về chuỗi thật.
    - Một hàm `xoay` mảng này mỗi khi file được load.

- **Thử thách**: Gọi hàm giải mã trực tiếp với index trong code (ví dụ `r(479)`) trả về kết quả sai hoặc undefined.
- **Giải pháp**:
    - Viết script `dump_strings_brute.js` để brute-force độ lệch (offset).
    - Thử cộng/trừ index với các giá trị từ 0-1000.
    - **Kết quả**: Tìm ra quy luật `(input_index + 165) % 702`. Mảng bị xoay 165 vị trí so với trạng thái tĩnh.

## 3. Phân Tích Hàm Ký (`Bo` / `aE`)
Sau khi giải mã được string, tôi xác định được hàm chính sinh chữ ký là `Bo` (được export là `aE`).

**Logic bên trong `Bo`:**
1.  Sử dụng thư viện `js-sha256`.
2.  Thuật toán chính là **HMAC-SHA256**.
3.  **Key Derivation (Tạo Key Động)**:
    - Key không cố định mà thay đổi theo mỗi 5 phút.
    - Công thức: `timeBucket = floor(timestamp / 5 phút)`.
    - `DerivedKey = HMAC(SecretKey, timeBucket)`.
    - **Secret Key tìm được**: `"key-@@@@)))()((9))-xxxx&&&%%%%%"` (được giải mã từ index 996).

## 4. Mảnh Ghép Bị Thiếu (The Missing Link)
Tuy đã có Key và Thuật toán, việc chạy thử (verify) vẫn thất bại. Chữ ký tạo ra không khớp với mẫu.
- **Vấn đề**: Không rõ tham số đầu vào (Payload) được ghép như thế nào. Code gốc dùng các tên biến vô nghĩa như `a`, `e`, `n`.
- **Đột phá**:
    - Trace ngược lên nơi gọi hàm `Bo` (tức `aE`) trong file `CNv-PQrD.js` (hàm `o4`).
    - Phân tích file `ctx.txt` (ngữ cảnh lúc chạy):
        - Tham số thứ 1 (`a`): Là danh sách url params + timestamp.
        - Tham số thứ 2 (`nd`): Chính là **nội dung prompt** của người dùng!
        - Tham số thứ 3 (`ro`): Timestamp.

## 5. Công Thức Cuối Cùng
Sau khi lắp ghép đầy đủ, thuật toán chính xác là:

1.  **Payload (a)**: Lấy tất cả key/value của params, sắp xếp theo key, nối lại bằng dấu phẩy.
    - Ví dụ: `requestId,uuid,timestamp,12345...`
2.  **Prompt Encoded (W)**: Nội dung chat -> UTF8 -> Base64.
3.  **Data Signing (d)**: `a + "|" + W + "|" + timestamp`.
4.  **Signature**: `HMAC-SHA256(DerivedKey, d)`.

## Kết Luận
Bảo mật của Zai dựa trên việc giấu Secret Key trong mảng string bị xáo trộn và thuật toán xoay vòng key theo thời gian. Việc reverse engineering thành công nhờ kết hợp giữa Static Analysis (đọc code) và Dynamic Emulation (chạy giả lập decoder).
