/* 
   CAU 4 - SQL SERVER
   Hệ quản trị Cơ sở dữ liệu
*/

-- 1. Tạo Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'QuanLyDeAn')
BEGIN
    CREATE DATABASE QuanLyDeAn;
END
GO

USE QuanLyDeAn;
GO

-- 2. Tạo cấu trúc các bảng (Schema)
-- Bảng PHONG
IF OBJECT_ID('PHONG', 'U') IS NOT NULL DROP TABLE PHONG;
CREATE TABLE PHONG (
    maphong VARCHAR(10) PRIMARY KEY,
    tenphong NVARCHAR(50),
    sonv INT
);

-- Bảng NHANVIEN
IF OBJECT_ID('NHANVIEN', 'U') IS NOT NULL DROP TABLE NHANVIEN;
CREATE TABLE NHANVIEN (
    manv VARCHAR(10) PRIMARY KEY,
    honv NVARCHAR(20),
    tennv NVARCHAR(20),
    ngaysinh DATE,
    phai NVARCHAR(5),
    luong DECIMAL(18, 2),
    maphong VARCHAR(10),
    FOREIGN KEY (maphong) REFERENCES PHONG(maphong)
);

-- Bảng DEAN
IF OBJECT_ID('DEAN', 'U') IS NOT NULL DROP TABLE DEAN;
CREATE TABLE DEAN (
    mada VARCHAR(10) PRIMARY KEY,
    tenda NVARCHAR(100),
    diadiem NVARCHAR(100),
    ngaybatdau DATE,
    ngayhoantat DATE
);

-- Bảng THAMGIA
IF OBJECT_ID('THAMGIA', 'U') IS NOT NULL DROP TABLE THAMGIA;
CREATE TABLE THAMGIA (
    manv VARCHAR(10),
    mada VARCHAR(10),
    ngaythamgia DATE,
    ngayketthuc DATE,
    PRIMARY KEY (manv, mada),
    FOREIGN KEY (manv) REFERENCES NHANVIEN(manv),
    FOREIGN KEY (mada) REFERENCES DEAN(mada)
);
GO

-- 3. Chèn dữ liệu mẫu (Seed Data)
INSERT INTO PHONG (maphong, tenphong, sonv) VALUES 
('P01', N'Nghiên cứu', 5),
('P02', N'Điều hành', 3);

INSERT INTO NHANVIEN (manv, honv, tennv, ngaysinh, phai, luong, maphong) VALUES
('NV01', N'Nguyễn', N'An', '1990-01-01', N'Nam', 15000000, 'P01'),
('NV02', N'Trần', N'Bình', '1992-05-15', N'Nữ', 12000000, 'P01'),
('NV03', N'Lê', N'Cường', '1985-10-20', N'Nam', 20000000, 'P02');

INSERT INTO DEAN (mada, tenda, diadiem, ngaybatdau, ngayhoantat) VALUES
('DA01', N'Xây dựng hệ thống', N'TP.HCM', '2014-12-01', '2015-06-01'),
('DA02', N'Ứng dụng IoT', N'TP.HCM', '2015-02-01', '2015-12-31'),
('DA03', N'Quản lý nhân sự', N'Hà Nội', '2015-01-10', '2015-05-10');

INSERT INTO THAMGIA (manv, mada, ngaythamgia, ngayketthuc) VALUES
('NV01', 'DA01', '2014-12-01', '2015-06-01'),
('NV01', 'DA02', '2015-02-01', '2015-12-31'),
('NV02', 'DA02', '2015-03-01', '2015-10-01'),
('NV03', 'DA03', '2015-01-15', '2015-05-10');
GO

/* 
   Câu a: Hãy viết câu truy vấn "Liệt kê họ tên nhân viên tham gia ít nhất một đề án 
   được bắt đầu từ ngày 1/1/2015 tại TP.HCM".
*/

-- Truy vấn SQL standard
SELECT DISTINCT nv.honv, nv.tennv
FROM NHANVIEN nv
JOIN THAMGIA tg ON nv.manv = tg.manv
JOIN DEAN da ON tg.mada = da.mada
WHERE da.ngaybatdau >= '2015-01-01' 
  AND da.diadiem = N'TP.HCM';

/*
   TỐI ƯU HÓA CÂU TRUY VẤN BẰNG GIẢI THUẬT HEURISTIC
   
   1. Biểu diễn dưới dạng cây đại số quan hệ (Cây gốc):
      π (honv, tennv)
          |
      σ (ngaybatdau >= '2015-01-01' AND diadiem = 'TP.HCM')
          |
          ⨝ (NHANVIEN.manv = THAMGIA.manv)
         /  \
      NHANVIEN  ⨝ (THAMGIA.mada = DEAN.mada)
                /  \
            THAMGIA DEAN

   2. Áp dụng các quy tắc Heuristic:
      - Quy tắc 1: Đưa phép chọn (Selection) xuống càng sâu càng tốt.
      - Quy tắc 2: Đưa phép chiếu (Projection) xuống các nhánh để giảm số lượng cột.
      - Quy tắc 3: Kết hợp tích Descartes với phép chọn thành phép kết nối (Join).

   3. Cây truy vấn sau khi tối ưu hóa:
      π (honv, tennv)
          |
      ⨝ (NHANVIEN.manv = THAMGIA.manv)
     /      \
 NHANVIEN   ⨝ (THAMGIA.mada = DEAN.mada)
           /      \
       THAMGIA    σ (ngaybatdau >= '2015-01-01' AND diadiem = 'TP.HCM') (DEAN)

   Giải thích: 
   Ta thực hiện lọc bảng DEAN trước khi thực hiện phép kết (Join) để giảm số lượng bản ghi trung gian,
   giúp tốc độ truy thực hiện nhanh hơn đáng kể.
*/


/*
   Câu b: Tính chi phí thực hiện câu truy vấn bằng phương pháp ước lượng theo mẫu tin.
   Biểu thức: σ_{phai='Nữ' ∧ ngayketthuc > '1/1/2017'} (NHANVIEN ⨝_{NHANVIEN.manv = THAMGIA.manv} THAMGIA)

   1. THÔNG SỐ GIẢ THIẾT:
      - N(NHANVIEN) = 1000 (Số mẫu tin bảng NHANVIEN)
      - N(THAMGIA) = 3000 (Số mẫu tin bảng THAMGIA)
      - V(phai, NHANVIEN) = 2 ('Nam', 'Nữ')
      - V(manv, NHANVIEN) = 1000 (Khóa chính)
      - V(manv, THAMGIA) = 200 (Số nhân viên thực tế có tham gia đề án)

   2. BƯỚC 1: Ước lượng kích thước phép kết (Join)
      Kết quả J = NHANVIEN ⨝ THAMGIA
      N(J) = [N(NHANVIEN) * N(THAMGIA)] / max(V(manv, NHANVIEN), V(manv, THAMGIA))
      N(J) = (1000 * 3000) / max(1000, 200)
      N(J) = 3,000,000 / 1000 = 3000 (mẫu tin)
      (Giải thích: Vì mọi manv trong THAMGIA đều phải tồn tại trong NHANVIEN, nên kết quả bằng số dòng của THAMGIA)

   3. BƯỚC 2: Ước lượng kích thước phép chọn (Selection)
      Điều kiện 1: phai = 'Nữ'
      - Hệ số chọn (Selectivity factor) sf1 = 1 / V(phai, NHANVIEN) = 1 / 2 = 0.5
      
      Điều kiện 2: ngayketthuc > '1/1/2017'
      - Do không có thông tin về khoảng giá trị (min, max) của ngayketthuc, thông thường trong các bài toán 
        ước lượng cơ bản nếu không cho cụ thể, ta có thể:
        + Giả định một tỷ lệ (Ví dụ: 1/10 hoặc 1/3 tùy theo ngữ cảnh bài toán).
        + Hoặc giữ nguyên dưới dạng ký hiệu sf2.
        *Giả sử theo các bài tập tương tự, nếu không có range, ta thường lấy sf2 = 1/10 (hoặc nếu là đề thi thực tế, 
        hãy kiểm tra xem có bảng chỉ số nào đi kèm không).*
      
      Giả sử sf2 = 0.1 (10% bản ghi thỏa mãn điều kiện thời gian):

   4. KẾT QUẢ CUỐI CÙNG (Số mẫu tin dự kiến):
      N_final = N(J) * sf1 * sf2
      N_final = 3000 * 0.5 * 0.1 = 150 (mẫu tin)

   5. CHI PHÍ THỰC HIỆN (Cost):
      - Chi phí kết nối (Join Cost): Phụ thuộc vào thuật toán (Nested Loop, Hash Join...).
      - Nếu tính theo số lượng mẫu tin trung gian cần xử lý: 
        Cost ≈ N(NHANVIEN) + N(THAMGIA) + N(J) = 1000 + 3000 + 3000 = 7000 đơn vị xử lý mẫu tin.
*/
