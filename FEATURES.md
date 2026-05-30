# Systema — Phân Bố Tính Năng & Bố Cục Giao Diện

> **Mục đích**: Tài liệu này liệt kê mọi tính năng của Systema kèm vị trí hiển thị, diện tích chiếm dụng và tần suất sử dụng, nhằm giúp đánh giá phân bổ không gian giao diện có hợp lý không.

---

## 📐 Tổng Quan Layout

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│  TOPBAR (40px)                                          │              │
│  [Systema] │ [Target: DeepSeek | URL] │ [Intercept]     │              │
├────────────────────────────────┬─────────────────────────┤   SIDEBAR    │
│                                │                         │   (30%)      │
│    REQUEST LIST (50% dọc)     │   REQUEST DETAILS       │              │
│    ┌──┐ ┌──────────────────┐  │   (50% dọc)             │   ┌──┐       │
│    │Tb│ │   Table/         │  │                         │   │Tb│       │
│    │  │ │   Timeline/      │  │   Headers │ Body        │   │  │ Nội   │
│    │Tl│ │   WebSocket      │  │   ────────┼───────      │   │a │ dung  │
│    │  │ │                  │  │   Composer│Filter       │   │b │ tab   │
│    │Ws│ │                  │  │   Trace                 │   │  │ hiện  │
│    └──┘ └──────────────────┘  │                         │   │s │ tại   │
│                                │                         │   └──┘       │
├────────────────────────────────┴─────────────────────────┤              │
│  FOOTER (24px)  [120 requests | 90 HTTPS | 2.3 MB | 45ms]              │
└──────────────────────────────────────────────────────────┴──────────────┘
```

| Khu vực | Chiều cao | Tỷ lệ ngang | Mô tả |
|---------|-----------|-------------|-------|
| **TopBar** | 40px | 100% | Logo, target info, Intercept toggle, Frida status |
| **RequestList** | ~50% viewport | 70% | Danh sách request (Table/Timeline/WebSocket) |
| **RequestDetails** | ~50% viewport | 70% | Chi tiết request (Headers/Body/Composer/Filter/Trace) |
| **Sidebar** | full height | 30% | Chat, Target, Sources, Log, Collections, Trace, Compare, Crypto, Media, WASM, Fuzzer |
| **FootBar** | 24px | 100% | Thống kê: tổng requests, HTTPS count, data size, avg time |

---

## 🗺️ Chi Tiết Từng Feature

### 1. TOPBAR (40px — toàn chiều ngang — luôn hiển thị)

| Feature | Vị trí | Mô tả |
|---------|--------|-------|
| **Logo & Tên App** | Góc trái TopBar | "Systema" |
| **Target Info** | TopBar, sau logo | Tên target đang chạy + URL |
| **Intercept Toggle** | TopBar, góc phải | Bật/tắt chặn request, hiển thị trạng thái ON/OFF |
| **Frida Status** | TopBar, góc phải (Android) | Trạng thái Frida, nút Install/Start/SSL Bypass |

> **Đánh giá**: ✅ Hợp lý — thông tin quan trọng, truy cập nhanh, không chiếm nhiều không gian.

---

### 2. REQUEST LIST (50% dọc, 70% ngang, bên trái — Tab Bar 48px + Content)

| Feature | Vị trí | Diện tích | Tần suất |
|---------|--------|-----------|----------|
| **Tab Bar** | Dọc bên trái RequestList | 48px × full height | Thường xuyên |
| **Table View** | Tab chính, nội dung RequestList | ~65% viewport | Rất thường xuyên |
| **Timeline View** | Tab phụ, nội dung RequestList | ~65% viewport | Thỉnh thoảng |
| **WebSocket View** | Tab phụ, nội dung RequestList | ~65% viewport | Thỉnh thoảng |

| Tab Bar Icon | Feature | Tooltip |
|-------------|---------|---------|
| 📋 List | Table View | "View HTTP/HTTPS requests in a table" |
| 📊 BarChart2 | Timeline View | "Waterfall chart of request timing" |
| 📶 Wifi | WebSocket | "View WebSocket connections and messages" |

> **Đánh giá**: ✅ Bố cục tốt — Table view chiếm toàn bộ không gian khi active, các view phụ ẩn khi không dùng.

---

### 3. REQUEST DETAILS (50% dọc, 70% ngang, bên trái — Tab Bar + Content)

| Feature | Vị trí | Diện tích | Tần suất |
|---------|--------|-----------|----------|
| **Headers** | Tab đầu tiên | ~65% viewport | Rất thường xuyên |
| **Body** | Tab thứ hai | ~65% viewport | Rất thường xuyên |
| **Composer** | Tab thứ ba | ~65% viewport | Thường xuyên |
| **Filter** | Panel hoặc tab | ~65% viewport | Thỉnh thoảng |
| **Trace** | Tab hoặc panel | ~65% viewport | Thỉnh thoảng |

> **Đánh giá**: ✅ Tốt — Headers và Body là 2 tab quan trọng nhất, diện tích đủ lớn để xem nội dung.

---

### 4. SIDEBAR (30% ngang, bên phải — Tab Bar 48px + Content)

#### 4.1 Sidebar Tab Bar (48px dọc bên trái Sidebar)

| Icon | Tab | Tooltip | Tần suất |
|------|-----|---------|----------|
| 💬 MessageSquare | **Chat** | "AI-powered chat assistant" | Rất thường xuyên |
| 🎯 Crosshair | **Target** | "Select and manage target applications" | Thường xuyên |
| 📁 FileCode | **Sources** | "View and analyze source code files" | Thỉnh thoảng |
| 🖥️ TerminalSquare | **Log** | "Real-time log viewer" | Thỉnh thoảng |
| 🔖 BookmarkPlus | **Composers** | "Save and organize HTTP requests" | Thỉnh thoảng |
| 🌿 GitBranch | **Trace** | "Request trace and call hierarchy" | Hiếm |
| ↔️ ArrowRightLeft | **Compare** | "Compare two requests" | Thỉnh thoảng |
| 🔐 KeyRound | **Crypto** | "Cryptographic tools" | Thỉnh thoảng |
| 🖼️ Image | **Media** | "Media files viewer" | Thỉnh thoảng |
| ⚙️ Cpu | **WASM** | "WebAssembly analyzer" | Hiếm |
| ⚡ Zap | **Fuzzer** | "Spam HTTPS với nhiều payload" | Thỉnh thoảng |

> **Đánh giá**: ⚠️ 11 tab trong 48px chiều rộng — hơi nhiều. Một số tab có thể gộp hoặc di chuyển.

#### 4.2 Nội Dung Từng Tab trong Sidebar

| Tab | Nội dung | Diện tích | Đánh giá |
|-----|----------|-----------|----------|
| **Chat** | HomePanel (Welcome) hoặc ChatPanel (chat view) | 30% viewport | ✅ Tốt — đủ rộng cho chat |
| **Target** | TargetSelector (danh sách app, breakpoints) | 30% viewport | ✅ Tốt — danh sách dọc phù hợp |
| **Sources** | SourcesPanel (cây thư mục + code viewer) | 30% viewport | ⚠️ Code viewer hơi hẹp |
| **Log** | LogViewer (logcat real-time) | 30% viewport | ✅ Tốt — log dạng dòng, không cần rộng |
| **Composers** | ComposerManager (danh sách collection + diagram) | 30% viewport | ✅ Tốt |
| **Trace** | TraceTab (node graph) | 30% viewport | ⚠️ Node graph có thể cần rộng hơn |
| **Compare** | ComparePanel (diff view) | 30% viewport | ⚠️ Diff view hơi hẹp để so sánh |
| **Crypto** | CryptoTab (String + File panels) | 30% viewport | ✅ Tốt cho công cụ crypto |
| **Media** | MediaPanel (grid ảnh/video) | 30% viewport | ✅ Tốt cho grid preview |
| **WASM** | WasmPanel (danh sách module) | 30% viewport | ✅ Tốt |
| **Fuzzer** | FuzzerPanel (payload config + results) | 30% viewport | ⚠️ Có thể cần rộng hơn khi xem kết quả |

---

### 5. FOOTER (24px — toàn chiều ngang — luôn hiển thị)

| Thông tin | Mô tả |
|-----------|-------|
| Tổng requests | Số lượng request đã bắt |
| HTTPS count | Số request HTTPS |
| Data transferred | Tổng dung lượng đã truyền |
| Avg time | Thời gian trung bình |
| Errors | Số request lỗi (>=400) |
| Filtered shown | Số request đang hiển thị (nếu đang filter) |

> **Đánh giá**: ✅ Gọn, hữu ích — thông tin thống kê nhanh.

---

### 6. MODALS & DRAWERS (Overlay — toàn màn hình)

| Feature | Loại | Kích thước | Mô tả |
|---------|------|-----------|-------|
| **Add Target Drawer** | Drawer từ dưới lên | 80% chiều cao | Form thêm target mới |
| **Confirm Switch Drawer** | Drawer từ dưới lên | ~200px | Xác nhận chuyển target |
| **Confirm Delete Drawer** | Drawer từ dưới lên | ~200px | Xác nhận xóa target |
| **Breakpoint Editor** | Modal | Trung bình | Chỉnh sửa breakpoint |
| **SSLBypass Modal** | Modal | Trung bình | Chọn package để inject SSL bypass |
| **Save Profile Modal** | Modal | Nhỏ | Lưu profile với tên |
| **Media Preview Modal** | Modal | Lớn | Xem ảnh/video/audio |
| **File Preview Modal** | Modal | Lớn | Xem file trong Sources |

> **Đánh giá**: ✅ Hợp lý — modal/drawer chỉ xuất hiện khi cần, không chiếm không gian cố định.

---

## 📊 Đánh Giá Phân Bổ Không Gian

### Điểm mạnh

| Yếu tố | Nhận xét |
|--------|----------|
| **Request List & Details** | Chiếm 70% chiều ngang + 100% chiều dọc (trừ topbar/footer) — đây là khu vực quan trọng nhất, xứng đáng diện tích lớn |
| **ResizableSplit** | Cả 2 hướng đều có thể kéo thả thay đổi tỷ lệ (70/30 ngang, 50/50 dọc) — linh hoạt |
| **Tab Bar dọc** | Tiết kiệm không gian, icon dễ nhận biết, tooltip khi hover |
| **Footer mỏng** | 24px đủ hiển thị thống kê hữu ích mà không lãng phí |

### Điểm cần cải thiện

| Vấn đề | Gợi ý |
|--------|-------|
| **11 tab trong Sidebar** | Quá nhiều tab trong 48px rộng. Có thể gộp: Sources + WASM, Crypto + Media vào menu "Tools" |
| **Compare & Trace** | 30% chiều ngang hơi hẹp cho diff view và node graph. Có thể mở rộng thành panel overlay hoặc cho phép kéo rộng hơn |
| **Fuzzer** | Kết quả fuzzing cần không gian hiển thị rộng, có thể tách thành panel riêng thay vì trong Sidebar |
| **Sources code viewer** | 30% hơi hẹp để đọc code. Có thể cho phép mở rộng thành panel chính |
| **Tab Bar RequestList** | Chỉ 3 tab (Table/Timeline/WebSocket) — ✅ ổn |

---

## 🎯 Đề Xuất Tối Ưu

1. **Gộp tab Sidebar**: Gom Sources + WASM + Media thành một tab "Assets", giảm từ 11 xuống 8 tab
2. **Fuzzer ra panel riêng**: Tách Fuzzer thành panel overlay có thể mở rộng toàn màn hình
3. **Compare mở rộng**: Cho phép Compare mở rộng chiếm toàn bộ Sidebar hoặc thành panel overlay
4. **Quick Actions Bar**: Thêm thanh công cụ nhanh giữa TopBar và RequestList (VD: nút Clear, Pause, Export)