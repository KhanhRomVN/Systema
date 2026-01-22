# Hướng dẫn Tích hợp 8 Công cụ Bảo mật & Chất lượng Code (AI-Ready)

Tài liệu này được thiết kế để cung cấp đầy đủ thông tin kỹ thuật giúp một AI khác có thể triển khai hệ thống Git Hooks tương tự vào bất kỳ dự án JS/TS nào.

## 1. Mục tiêu

Thiết lập quy trình tự động quét code khi `git commit` bao gồm:

1. ESLint (Quét lỗi code)
2. tsc (Check Type)
3. ggshield (Quét secrets)
4. Gitleaks (Quét leak secrets offline)
5. Talisman (Ngăn file nhạy cảm)
6. njsscan (Security scan cho Node.js)
7. Prettier (Format code)
8. Husky (Quản lý Hooks)

## 2. Các lệnh cài đặt cần thiết

```bash
# Cài đặt các package npm
npm install -D husky lint-staged eslint prettier typescript

# Cài đặt njsscan và ggshield (Yêu cầu Python/Pip)
pip install njsscan ggshield --user

# Tải Binary cho Gitleaks & Talisman (Ví dụ cho Linux x64)
mkdir -p scripts/bin
curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_x64.tar.gz | tar -xz -C scripts/bin gitleaks
curl -sSL https://github.com/thoughtworks/talisman/releases/download/v1.32.0/talisman_linux_amd64 -o scripts/bin/talisman
chmod +x scripts/bin/gitleaks scripts/bin/talisman
```

## 3. Cấu hình package.json (AI Prompt)

Copy đoạn cấu hình sau vào `package.json`:

```json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "npm run typecheck",
      "bash -c 'njsscan . --exit-zero'"
    ],
    "*.{json,css,md}": ["prettier --write"],
    "*": [
      "bash -c 'ggshield secret scan pre-commit --exit-zero || true'",
      "bash -c 'scripts/bin/gitleaks protect --staged -v'",
      "bash -c 'scripts/bin/talisman --pattern staged'"
    ]
  }
}
```

## 4. Cấu hình Husky Hook

Tạo file `.husky/pre-commit`:

```sh
#!/bin/sh
npx lint-staged
```

Sau đó chạy: `chmod +x .husky/pre-commit` và `git config core.hooksPath .husky`

## 5. Hướng dẫn cho AI thực thi (System Prompt)

_Khi bạn (AI) thực hiện chức năng này cho dự án mới:_

1. Kiểm tra môi trường (Node, Python, Git) có sẵn không.
2. Kiểm tra xem dự án đã có `.eslintrc` hoặc `tsconfig.json` chưa.
3. Luôn sử dụng `bash -c` khi chạy các lệnh không thuộc npm trong `lint-staged`.
4. Đảm bảo cấu hình `ggshield` có `|| true` để không chặn commit khi thiếu API Key/Offline.
5. Kiểm tra quyền thực thi (chmod +x) cho các file script và binary.

---

_Tài liệu được tạo tự động bởi Antigravity để hỗ trợ các thế hệ AI tiếp theo._
