export const TOOLS = `TOOLS REFERENCE

FILE OPERATIONS

read_file(path, start_line?, end_line?) - Read file content (start_line/end_line: 0-based)
write_to_file(path, content) - Create/overwrite file | Wrap in \`\`\`text
replace_in_file(path, diff) - Targeted edits | Format:
  <<<<<<< SEARCH
  \`\`\`text
  EXACT_OLD_CODE
  \`\`\`
  =======
  \`\`\`text
  NEW_CODE
  \`\`\`
  >>>>>>> REPLACE

list_files(path, recursive?, type?) - List directory (recursive: depth 1..max, type: "only_file"|"only_folder"|"all")
search_files(path, regex) - Search files matching regex content

update_codebase_context(projectName, language, description, keyFiles) - Update project info

EXECUTION

execute_command(command, requires_approval)
  - requires_approval: true (destructive), false (safe)
  - Supports chaining: cd dir && npm install

COMMUNICATION

ask_followup_question(question, options?) - Ask for critical missing info
attempt_completion(result, command?) - Final result (after user confirms)

TASK_PROGRESS (Optional for any tool)
<task_progress>
\`\`\`text
- [x] Done
- [ ] Current
\`\`\`
</task_progress>`;
