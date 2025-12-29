export const ACTION_NAMES: Record<string, string> = {
  replace_in_file: "replace_in_file",
  write_to_file: "write_to_file",
  execute_command: "Run Command",
};

export const TOOL_LABELS: Record<string, string> = {
  read_file: "Zen wants to read file:",
  write_to_file: "Zen wants to create/edit file:",
  replace_in_file: "Zen wants to edit file:",
  list_files: "Zen wants to list files in:",
  search_files: "Zen wants to search files:",
  execute_command: "Zen wants to execute command:",
  update_codebase_context: "Zen wants to update project context:",
  default: "Zen wants to perform action:",
};

export const TOOL_COLORS: Record<string, string> = {
  read_file: "#3b82f6", // blue
  write_to_file: "#10b981", // green
  replace_in_file: "#10b981", // green
  execute_command: "#f59e0b", // orange
  update_codebase_context: "#8b5cf6", // purple
  attempt_completion: "#22c55e", // success green
  default: "#6b7280", // gray
};

export const CLICKABLE_TOOLS = [
  "read_file",
  "write_to_file",
  "replace_in_file",
  "list_files",
  "search_files",
  "execute_command",
  "update_codebase_context",
];
