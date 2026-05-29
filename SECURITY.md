Dưới đây là bộ quét bảo mật HTTPS đầy đủ nhất, mở rộng từ 12 mục bạn đã có, bao quát toàn bộ các khía cạnh: cấu hình TLS, headers bảo mật, cookie, chứng chỉ, lộ thông tin và các lỗi nâng cao. Bạn có thể dùng danh sách này để tự xây dựng công cụ hoặc kiểm tra thủ công.

---

## 🔍 Bộ quét bảo mật HTTPS toàn diện

### 1. Kiểm tra kết nối cơ bản & phiên bản TLS
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 1 | Hỗ trợ HTTPS (cổng 443 mở, chứng chỉ hợp lệ) | **Critical** | Kiểm tra xem website có phục vụ qua HTTPS không, tránh redirect HTTP → HTTPS thiếu bảo vệ HSTS. |
| 2 | Bắt buộc HTTPS (HTTP 80 redirect 301/308 đến HTTPS) | High | Nếu HTTP vẫn trả về nội dung thay vì redirect, dữ liệu truyền không mã hóa. |
| 3 | Các phiên bản TLS được hỗ trợ (chỉ TLS 1.2, 1.3) | High | Cấm SSLv2, SSLv3, TLS 1.0, TLS 1.1 (không an toàn). |
| 4 | Cipher suites yếu (NULL, EXPORT, RC4, DES, 3DES, CBC yếu) | High | Chỉ cho phép các bộ mã hóa AEAD (AES-GCM, ChaCha20-Poly1305). |
| 5 | Hỗ trợ Perfect Forward Secrecy (PFS) | Medium | Kiểm tra các bộ cipher ECDHE/DHE để đảm bảo PFS. |
| 6 | Hỗ trợ TLS 1.3 (phiên bản mới nhất) | Info | TLS 1.3 cải thiện tốc độ và bảo mật. |
| 7 | Kiểm tra Renegotiation không an toàn (Client-Initiated Renegotiation) | Medium | Có thể dẫn đến DoS hoặc injection. |
| 8 | Kiểm tra lỗ hổng TLS Compression (CRIME) | Medium | Tắt nén TLS để tránh CRIME. |
| 9 | Kiểm tra lỗ hổng Heartbleed | High | Nếu dùng OpenSSL cũ. |
| 10 | Kiểm tra FREAK, Logjam, POODLE, BEAST | High | Các lỗ hổng SSL/TLS cổ điển. |
| 11 | Kiểm tra TLS Fallback SCSV (downgrade prevention) | Medium | Ngăn tấn công hạ cấp giao thức. |

### 2. Chứng chỉ số (X.509)
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 12 | Chứng chỉ hết hạn hoặc sắp hết hạn (<30 ngày) | **Critical** | Hết hạn khiến trình duyệt chặn kết nối. |
| 13 | Tên miền khớp (CN/SAN) | Critical | Chứng chỉ phải chứa đúng hostname đang truy cập. |
| 14 | Chuỗi tin cậy hoàn chỉnh (intermediate CA) | High | Thiếu intermediate sẽ gây lỗi ở một số client. |
| 15 | Thuật toán ký yếu (SHA-1, MD5) | High | Chỉ chấp nhận SHA-256 trở lên. |
| 16 | Độ dài khóa công khai yếu (RSA < 2048 bit, ECC < 256 bit) | High | Tối thiểu RSA 2048 bit, ECDSA P-256. |
| 17 | Chứng chỉ self-signed hoặc không tin cậy | Critical | Không được dùng trong production. |
| 18 | Revocation status (OCSP stapling, CRL) | Medium | Xác minh chứng chỉ chưa bị thu hồi. |
| 19 | Chứng chỉ wildcard dùng sai phạm vi | Low | Wildcard chỉ nên dùng khi cần, tránh trên subdomain nhạy cảm. |
| 20 | Certificate Transparency (SCT) | Info | Chứng chỉ có nhúng SCT cho minh bạch. |

### 3. HTTP Security Headers
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 21 | Strict-Transport-Security (HSTS) | High | `max-age` ≥ 1 năm, có `includeSubDomains`, nên có `preload`. |
| 22 | X-Content-Type-Options | Low | Phải có `nosniff`. |
| 23 | X-Frame-Options hoặc CSP `frame-ancestors` | Medium | Chống clickjacking. Dùng `DENY` hoặc `SAMEORIGIN`. |
| 24 | Content-Security-Policy (CSP) | Medium | CSP giảm XSS, nên cấu hình chặt chẽ, không dùng `unsafe-inline`, `unsafe-eval`. |
| 25 | Referrer-Policy | Info | Giới hạn thông tin Referer (`strict-origin-when-cross-origin`). |
| 26 | Permissions-Policy (tên cũ Feature-Policy) | Info | Vô hiệu hóa các API nhạy cảm không cần thiết. |
| 27 | Cross-Origin-Resource-Policy (CORP) | Medium | Ngăn tải tài nguyên từ cross-origin. |
| 28 | Cross-Origin-Opener-Policy (COOP) | Medium | Cô lập browsing context, chống Spectre. |
| 29 | Cross-Origin-Embedder-Policy (COEP) | Medium | Yêu cầu tài nguyên cross-origin phải có CORP/CORS. |
| 30 | Cache-Control/Pragma/Expires trên trang nhạy cảm | High | Trang xác thực, dữ liệu cá nhân không được cache. |
| 31 | Clear-Site-Data header trên logout | Info | Xóa dữ liệu trình duyệt khi logout. |

### 4. Cookie Security
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 32 | Cookie có gắn cờ `Secure` | High | Cookie chỉ gửi qua HTTPS. |
| 33 | Cookie có gắn cờ `HttpOnly` | Medium | Ngăn JavaScript truy cập cookie (chống XSS đánh cắp). |
| 34 | Cookie có `SameSite` (Lax/Strict) | Low | Chống CSRF cơ bản. |
| 35 | Cookie session không có `Domain` hoặc `Path` quá rộng | Medium | Giới hạn phạm vi cookie. |
| 36 | Prefix cookie `__Host-` hoặc `__Secure-` | Low | Tăng cường bảo mật (cần Secure, Path=/, không Domain). |
| 37 | Cookie chứa dữ liệu nhạy cảm không mã hóa | High | Session ID phải ngẫu nhiên, không đoán được, không lộ thông tin. |

### 5. Lộ thông tin nhạy cảm
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 38 | Server header tiết lộ phiên bản (Server: nginx/1.x.x) | Low | Giảm thông tin cho kẻ tấn công. |
| 39 | X-Powered-By header (PHP, ASP.NET version) | Info | Nên xóa hoặc thay đổi. |
| 40 | Các header tùy chỉnh lộ framework/phiên bản | Low | Ví dụ `X-Generator`, `X-Drupal-Cache`, ... |
| 41 | Tham số nhạy cảm trong URL (token, password, api_key...) | High | Không được truyền qua GET (xuất hiện trong log, referer). |
| 42 | HTTP Basic Authentication gửi qua header `Authorization: Basic` | Medium | Nên thay bằng token bearer, tránh gửi base64 mỗi request. |
| 43 | Lộ thông tin qua trang lỗi (stack trace, debug) | High | Tắt debug mode, dùng trang lỗi chung. |
| 44 | Lộ tập tin nhạy cảm (/.git, /.env, /backup) | Critical | Quét các đường dẫn phổ biến. |
| 45 | HTTP TRACE method enabled | Low | Có thể bị Cross-Site Tracing (XST). |
| 46 | OPTIONS method tiết lộ các methods không cần thiết (PUT, DELETE) | Low | Vô hiệu hóa method không dùng. |

### 6. Cấu hình HTTPS nâng cao & Best Practices
| # | Hạng mục kiểm tra | Mức độ | Mô tả |
|---|-------------------|--------|-------|
| 47 | OCSP Stapling được bật | Medium | Tăng tốc kiểm tra revocation, bảo vệ quyền riêng tư. |
| 48 | DNS CAA record (Certificate Authority Authorization) | Info | Giới hạn CA được phép cấp chứng chỉ cho domain. |
| 49 | HSTS preload submission status | Info | Kiểm tra domain có trong danh sách preload của Chrome. |
| 50 | HPKP (HTTP Public Key Pinning) - đã lỗi thời, tránh dùng | Info | Cảnh báo nếu còn header Public-Key-Pins. |
| 51 | Sử dụng HTTPS cho tất cả tài nguyên (mixed content) | High | Không tải script, CSS, font, ảnh qua HTTP. |
| 52 | Kiểm tra redirection loop khi có HSTS | Medium | Đảm bảo redirect không gây lỗi. |
| 53 | Kiểm tra CORS header bị cấu hình sai (`Access-Control-Allow-Origin: *` với credentials) | High | Nguy cơ rò rỉ dữ liệu qua cross-origin. |
| 54 | X-Forwarded-For/Proto được xử lý an toàn khi qua proxy | Medium | Tránh giả mạo IP, giao thức. |
| 55 | Subresource Integrity (SRI) cho tài nguyên bên ngoài | Low | Đảm bảo script bên thứ ba không bị sửa đổi. |
| 56 | Kiểm tra certificate pinning ở ứng dụng mobile (nếu có) | Medium | Tránh trust thêm CA giả. |

các công cụ package như
1/ unpwned
2/ securecheck
3/ tlsing
4/ tls-check
5/ @mdn/mdn-http-observatory
6/ check-my-headers
7/ @hint/hint-https-only
8/ insecurity


Loại bỏ (không có data):
- #1-11: TLS version, cipher suites, Heartbleed, POODLE... → cần TLS handshake
- #12-20: Certificate (expiry, CN/SAN, chain, key length...) → cần cert details
- #44: File exposure (/.git, /.env) → cần active scanning
- #47-49: OCSP, DNS CAA, HSTS preload → cần DNS/network queries
- #52: Redirect loop → cần follow redirects
- #54: X-Forwarded-For proxy handling → server-side logic
- #56: Mobile cert pinning → không liên quan