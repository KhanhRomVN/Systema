/* 
   CAU 5 - SQL SERVER
   Tối ưu hóa câu truy vấn quản lý dự án công ty
*/

-- 1. Tạo Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'QuanLySanXuat')
BEGIN
    CREATE DATABASE QuanLySanXuat;
END
GO

USE QuanLySanXuat;
GO

-- 2. Tạo cấu trúc các bảng (Schema)
-- Bảng TOSX (Tổ sản xuất)
IF OBJECT_ID('TOSX', 'U') IS NOT NULL DROP TABLE TOSX;
CREATE TABLE TOSX (
    mato VARCHAR(10) PRIMARY KEY,
    tento NVARCHAR(50),
    tenbp NVARCHAR(50)
);

-- Bảng NHANVIEN
IF OBJECT_ID('NHANVIEN', 'U') IS NOT NULL DROP TABLE NHANVIEN;
CREATE TABLE NHANVIEN (
    manv VARCHAR(10) PRIMARY KEY,
    hoten NVARCHAR(100),
    mato VARCHAR(10),
    FOREIGN KEY (mato) REFERENCES TOSX(mato)
);

-- Bảng CONGDOAN
IF OBJECT_ID('CONGDOAN', 'U') IS NOT NULL DROP TABLE CONGDOAN;
CREATE TABLE CONGDOAN (
    macd VARCHAR(10) PRIMARY KEY,
    tencd NVARCHAR(100),
    dongia DECIMAL(18, 2),
    mato VARCHAR(10),
    FOREIGN KEY (mato) REFERENCES TOSX(mato)
);

-- Bảng SANXUAT
IF OBJECT_ID('SANXUAT', 'U') IS NOT NULL DROP TABLE SANXUAT;
CREATE TABLE SANXUAT (
    manv VARCHAR(10),
    macd VARCHAR(10),
    soluong INT,
    PRIMARY KEY (manv, macd),
    FOREIGN KEY (manv) REFERENCES NHANVIEN(manv),
    FOREIGN KEY (macd) REFERENCES CONGDOAN(macd)
);
GO

-- 3. Chèn dữ liệu mẫu
INSERT INTO TOSX (mato, tento, tenbp) VALUES 
('TO01', N'Tổ Lắp Ráp 1', N'Bộ phận Cơ khí'),
('TO02', N'Tổ Hoàn Thiện', N'Bộ phận Đóng gói');

INSERT INTO NHANVIEN (manv, hoten, mato) VALUES
('NV01', N'Nguyễn Văn A', 'TO01'),
('NV02', N'Trần Thị B', 'TO01'),
('NV03', N'Lê Minh C', 'TO02');

INSERT INTO CONGDOAN (macd, tencd, dongia, mato) VALUES
('CD01', N'Công đoạn 1', 50000, 'TO01'),
('CD02', N'Công đoạn 2', 70000, 'TO01'),
('CD03', N'Sơn phủ', 30000, 'TO02');

INSERT INTO SANXUAT (manv, macd, soluong) VALUES
('NV01', 'CD01', 100),
('NV01', 'CD02', 50),
('NV02', 'CD01', 120),
('NV03', 'CD03', 200);
GO

/* 
   TRUY VẤN GỐC (Chưa tối ưu):
   "Cho biết họ tên nhân viên, tên tổ của nhân viên tham gia vào công đoạn 1"
*/
SELECT hoten, tento
FROM TOSX, NHANVIEN, SANXUAT, CONGDOAN
WHERE TOSX.mato = NHANVIEN.mato 
  AND NHANVIEN.manv = SANXUAT.manv 
  AND SANXUAT.macd = CONGDOAN.macd 
  AND tencd = N'Công đoạn 1';

/*
   TỐI ƯU HÓA CÂU TRUY VẤN (HEURISTIC)

   1. CÂY TRUY VẤN GỐC:
      π (hoten, tento)
          |
      σ (TOSX.mato = NHANVIEN.mato AND NHANVIEN.manv = SANXUAT.manv AND SANXUAT.macd = CONGDOAN.macd AND tencd = 'Công đoạn 1')
          |
          X (Tích Descartes 4 bảng)
      /   /   \   \
   TOSX NHANVIEN SANXUAT CONGDOAN

   2. CÂY TRUY VẤN SAU TỐI ƯU HÓA (HEURISTIC):
      - Quy tắc 1: Đưa phép chọn (Selection) xuống nhánh bảng CONGDOAN trước.
      - Quy tắc 2: Chuyển tích Descartes thành phép kết nối (Join) dựa trên các khóa.
      - Quy tắc 3: Đưa phép chiếu (Projection) xuống các nhánh để loại bớt cột thừa.

      HÌNH VẼ CÂY TỐI ƯU:
      π (hoten, tento)
          |
      ⨝ (NHANVIEN.mato = TOSX.mato)
     /      \
    |      TOSX (mato, tento)
    ⨝ (SANXUAT.manv = NHANVIEN.manv)
   /      \
  |      NHANVIEN (manv, hoten, mato)
  ⨝ (SANXUAT.macd = CONGDOAN.macd)
 /      \
SANXUAT  σ (tencd = 'Công đoạn 1') (CONGDOAN)

   3. CÂU TRUY VẤN SQL ĐÃ TỐI ƯU (Dạng Join tường minh):
*/

SELECT nv.hoten, ts.tento
FROM (
    SELECT macd 
    FROM CONGDOAN 
    WHERE tencd = N'Công đoạn 1'
) cd
JOIN SANXUAT sx ON cd.macd = sx.macd
JOIN NHANVIEN nv ON sx.manv = nv.manv
JOIN TOSX ts ON nv.mato = ts.mato;

/*
   GIẢI THÍCH:
   - Việc lọc (WHERE tencd = N'Công đoạn 1') được thực hiện ngay từ bước đầu trong bảng CONGDOAN 
     giúp giảm đáng kể số lượng bản ghi tham gia vào các phép JOIN tiếp theo.
   - Sử dụng cú pháp JOIN tường minh (INNER JOIN) giúp SQL Server Optimizer dễ dàng nhận diện 
     và lập kế hoạch thực thi tốt hơn so với tích Descartes trong mệnh đề WHERE.
*/
