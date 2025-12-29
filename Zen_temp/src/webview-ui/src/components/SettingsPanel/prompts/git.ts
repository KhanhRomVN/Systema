/**
 * Git Commit Message Generation Prompts
 * Managed by language setting
 */

export const GIT_PROMPTS: Record<string, string> = {
  en: `# Git Commit Message Guidelines

Generate a clear, concise commit message following these conventions:

## Format:
<type>(<scope>): <subject>

<body>

<footer>

## Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semicolons, etc.)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- chore: Maintenance tasks, dependencies, build process
- ci: CI/CD changes
- build: Build system changes

## Rules:
1. Subject line: max 50 characters, imperative mood
2. Body: Explain what and why (not how), wrap at 72 characters
3. Footer: Reference issues, breaking changes

## Example:
feat(auth): add OAuth2 login support

Implemented OAuth2 authentication flow with Google and GitHub providers.
This allows users to sign in using their existing accounts.

Closes #123`,

  vi: `# Hướng Dẫn Tạo Commit Message

Tạo commit message rõ ràng, ngắn gọn theo quy ước sau:

## Định dạng:
<type>(<scope>): <subject>

<body>

<footer>

## Các loại (Types):
- feat: Tính năng mới
- fix: Sửa lỗi
- docs: Thay đổi tài liệu
- style: Thay đổi code style (format, thiếu dấu chấm phẩy, v.v.)
- refactor: Tái cấu trúc code
- perf: Cải thiện hiệu suất
- test: Thêm hoặc cập nhật tests
- chore: Công việc bảo trì, dependencies, build process
- ci: Thay đổi CI/CD
- build: Thay đổi build system

## Quy tắc:
1. Dòng subject: tối đa 50 ký tự, dùng thể mệnh lệnh
2. Body: Giải thích cái gì và tại sao (không phải như thế nào), ngắt dòng ở 72 ký tự
3. Footer: Tham chiếu issues, breaking changes

## Ví dụ:
feat(auth): thêm hỗ trợ đăng nhập OAuth2

Triển khai luồng xác thực OAuth2 với Google và GitHub.
Cho phép người dùng đăng nhập bằng tài khoản hiện có.

Closes #123`,
};

/**
 * Get git prompt by language
 */
export function getGitPrompt(language: string = "en"): string {
  return GIT_PROMPTS[language] || GIT_PROMPTS.en;
}
