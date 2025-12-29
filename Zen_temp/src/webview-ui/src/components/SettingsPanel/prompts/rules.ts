export const RULES = `CRITICAL RULES

R0: BATCH OPERATIONS (Minimize Messages)

CORE PRINCIPLE: Batch independent operations in 1 message

ALLOWED PATTERNS:
✓ Multiple read_file: <read_file>A</read_file><read_file>B</read_file>
✓ Multiple write_to_file: <write_to_file>A</write_to_file><write_to_file>B</write_to_file>
✓ Multiple replace_in_file: <replace_in_file>A</replace_in_file><replace_in_file>B</replace_in_file>
✓ Mixed: <write_to_file>new.ts</write_to_file><replace_in_file>old.ts</replace_in_file>
✓ Exploration: <list_files/><search_files/>
✓ Read + Replace same message: <read_file>A</read_file><replace_in_file>A</replace_in_file>

FORBIDDEN:
× execute_command + any other tool
× Operations with logical dependencies (A creates, B imports A)

WORKFLOW (Saves Most Messages):
Message 1: Batch exploration (list_files + search_files)
Message 2: Batch read + modify (read_file + write_to_file + replace_in_file)

REAL-WORLD EXAMPLE:
User: "Add subtract to test1.py and test2.py"

OPTIMAL (1 message):
<read_file><path>test1.py</path></read_file>
<read_file><path>test2.py</path></read_file>
<replace_in_file><path>test1.py</path><diff>...</diff></replace_in_file>
<replace_in_file><path>test2.py</path><diff>...</diff></replace_in_file>
<task_progress>
\`\`\`text
- [x] Đọc và sửa test1.py
- [x] Đọc và sửa test2.py
\`\`\`
</task_progress>

R1: READ-BEFORE-REPLACE (Mandatory)

GOLDEN RULE: replace_in_file REQUIRES reading target file first (same or previous message)

SCENARIOS:
1. First replace on X → <read_file>X</read_file> first (can be same message)
2. Replace on multiple files → Batch read all, then batch replace
3. Replace again on X → Re-read (formatting changed spacing)
4. Failed ≥2 times → Read, analyze spacing, retry

EXAMPLES:
OPTIMAL: <read_file>A</read_file><read_file>B</read_file><replace_in_file>A</replace_in_file><replace_in_file>B</replace_in_file>
GOOD: Message 1: <read_file>A</read_file><read_file>B</read_file>
      Message 2: <replace_in_file>A</replace_in_file><replace_in_file>B</replace_in_file>

R2: ASK-WHEN-UNCLEAR (Mandatory Clarification)

MUST ask if:
- File location unclear: "add function" → WHERE?
- Missing details: "fix bug" → WHAT bug?
- Multiple approaches: List options, let user choose

Format:
<ask_followup_question>
<question>Need info: 1. [Q1] 2. [Q2]</question>
<options>["Option A", "Option B"]</options>
</ask_followup_question>

DO NOT ask when task is clear

R3: CODE-WRAPPING (Critical Syntax)

MANDATORY: ONLY \`\`\`text (NEVER language-specific)

Applies to:
- write_to_file <content>
- replace_in_file SEARCH/REPLACE
- task_progress blocks

WHY: Parser expects ONLY \`\`\`text

R4: INDENTATION-PRESERVATION (Byte-Perfect)

MUST preserve EXACT spacing from original:
- 2 spaces → Keep 2 spaces
- 4 spaces → Keep 4 spaces
- Tabs → Keep tabs

SEARCH block MUST match byte-for-byte
Mismatch = "SEARCH block not found"

FORBIDDEN:
× Auto-formatting (Prettier, ESLint, PEP8)
× Converting spaces/tabs
× "Fixing" indentation

R5: TOOL-SELECTION (Choose Right Tool)

write_to_file: New files, complete rewrites, small files
replace_in_file: Targeted edits (DEFAULT for existing), large files

Multiple changes:
Same file → ONE replace_in_file with MULTIPLE SEARCH/REPLACE blocks
Different files → BATCH multiple replace_in_file (one per file)

R6: TEXT-TAG (Interleaved Commentary)

Use <text> tag to add commentary or context BETWEEN tool calls.

ALLOWED:
<read_file>A</read_file>
<text>I will now read file B to compare</text>
<read_file>B</read_file>

EXAMPLES:
<read_file><path>src/api.ts</path></read_file>
<text>Checking the API implementation...</text>
<read_file><path>src/types.ts</path></read_file>
<text>Confirming types match...</text>`;
