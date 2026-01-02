export interface TaskProgressItem {
  text: string;
  completed: boolean;
}

export interface ToolAction {
  type:
    | 'set_filter'
    | 'list_requests'
    | 'get_request_details'
    | 'get_values'
    | 'get_active_filters'
    | 'export_har'
    | 'generate_table'
    | 'ask_followup_question'
    | 'attempt_completion';
  params: Record<string, any>;
  rawXml: string;
  taskProgress?: TaskProgressItem[] | null;
}

export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language?: string }
  | { type: 'html'; content: string }
  | { type: 'table'; content: string } // New for Systema
  | { type: 'tool'; action: ToolAction };

export interface ParsedResponse {
  thinking: string | null;
  followupQuestion: string | null;
  followupOptions: string[] | null;
  attemptCompletion: string | null;
  taskProgress: TaskProgressItem[] | null;
  actions: ToolAction[];
  contentBlocks: ContentBlock[];
  displayText: string;
}

/**
 * Parse XML-like content to extract parameter value
 */
const extractParamValue = (content: string, paramName: string): string | null => {
  // Try standard XML tag first
  const standardRegex = new RegExp(`<${paramName}>([\\s\\S]*?)<\\/${paramName}>`, 'i');
  const standardMatch = content.match(standardRegex);
  if (standardMatch) {
    let value = standardMatch[1].trim();
    value = value.replace(/^```text\s*\n?|\n?```\s*$/g, '');
    return value;
  }

  // Try self-closing tag with content
  const selfClosingRegex = new RegExp(`<${paramName}\\s*>([\\s\\S]*?)(?=<[\\w_]+>|$)`, 'i');
  const selfClosingMatch = content.match(selfClosingRegex);
  if (selfClosingMatch) {
    let value = selfClosingMatch[1].trim();
    value = value.replace(/^```text\s*\n?|\n?```\s*$/g, '');
    return value;
  }
  return null;
};

/**
 * Parse task_progress content to extract checklist items
 */
const parseTaskProgress = (content: string): TaskProgressItem[] | null => {
  if (!content) return null;
  const cleanContent = content.replace(/^```text\s*\n?|\n?```\s*$/g, '').trim();
  const items: TaskProgressItem[] = [];
  const lines = cleanContent.split('\n');

  for (const line of lines) {
    const checkboxMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/);
    if (checkboxMatch) {
      items.push({
        completed: checkboxMatch[1].toLowerCase() === 'x',
        text: checkboxMatch[2].trim(),
      });
    }
  }

  return items.length > 0 ? items : null;
};

/**
 * Parse XML-like content to extract multiple parameter values for the same tag
 */
const extractParamArray = (content: string, itemTag: string): string[] => {
  // Simple regex to find all occurrences of <itemTag>value</itemTag> inside content
  // But wait, the structure is <tool><field>f1</field><value>v1</value><field>f2</field><value>v2</value></tool>
  // So we just need to extract all <itemTag> matches from the content.

  const matches = [
    ...content.matchAll(new RegExp(`<${itemTag}>([\\s\\S]*?)<\\/${itemTag}>`, 'gi')),
  ];
  return matches.map((m) => {
    let value = m[1].trim();
    value = value.replace(/^```text\s*\n?|\n?```\s*$/g, '');
    return value;
  });
};

/**
 * Extract tool actions from inner content
 */
const parseToolAction = (toolName: string, innerContent: string, rawXml: string): ToolAction => {
  const params: Record<string, any> = {};

  switch (toolName) {
    case 'set_filter': {
      // New format: <field>...</field><value>...</value><exclude>...</exclude> repeating
      const fields = extractParamArray(innerContent, 'field');
      const values = extractParamArray(innerContent, 'value');
      const excludes = extractParamArray(innerContent, 'exclude');
      const modes = extractParamArray(innerContent, 'mode');

      // Zip them
      if (fields.length > 0 && values.length > 0) {
        params.filters = fields.map((f, i) => ({
          field: f,
          value: values[i] || '',
          ...(excludes[i] ? { exclude: excludes[i] } : {}),
          mode: modes[i] || 'append',
        }));
      } else {
        // Fallback to old single way if needed, or strictly new way
        const type =
          extractParamValue(innerContent, 'type') || extractParamValue(innerContent, 'field');
        const value = extractParamValue(innerContent, 'value');
        const exclude = extractParamValue(innerContent, 'exclude');

        if (type && value) {
          params.filters = [{ field: type, value, exclude }];
        }
      }
      break;
    }

    // Unified list_requests handles searching and listing
    case 'list_requests': {
      // New format: <field>...</field><value>...</value> repeating + optional <limit> + <show_all_columns>
      const fields = extractParamArray(innerContent, 'field');
      const values = extractParamArray(innerContent, 'value');
      const limit = extractParamValue(innerContent, 'limit');
      const showAll = extractParamValue(innerContent, 'show_all_columns');

      params.criteria = fields.map((f, i) => ({
        field: f,
        value: values[i] || '',
      }));
      params.limit = limit;
      params.showAllColumns = showAll === 'true';
      break;
    }

    case 'get_request_details':
      params.requestId = extractParamValue(innerContent, 'requestId');
      break;

    case 'get_values':
      params.field = extractParamValue(innerContent, 'field');
      const ignore = extractParamValue(innerContent, 'ignore_filters');
      params.ignoreFilters = ignore === 'true';
      break;

    case 'ask_followup_question':
      params.question = extractParamValue(innerContent, 'question');
      const optionsStr = extractParamValue(innerContent, 'options');
      if (optionsStr) {
        try {
          params.options = JSON.parse(optionsStr);
        } catch {
          params.options = null;
        }
      }
      break;

    case 'attempt_completion':
      params.result = extractParamValue(innerContent, 'result');
      break;
  }

  return {
    type: toolName as any,
    params,
    rawXml,
    taskProgress: null,
  };
};

/**
 * Parse AI response to extract thinking, task_progress, and tool actions
 */
export const parseAIResponse = (content: string): ParsedResponse => {
  const result: ParsedResponse = {
    thinking: null,
    followupQuestion: null,
    followupOptions: null,
    attemptCompletion: null,
    taskProgress: null,
    actions: [],
    contentBlocks: [],
    displayText: '',
  };

  let remainingContent = content;

  // 1. Extract <thinking>
  const thinkingMatch = remainingContent.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkingMatch) {
    result.thinking = thinkingMatch[1].trim();
    remainingContent = remainingContent.replace(thinkingMatch[0], '');
  }

  // 2. Extract <task_progress>
  const taskProgressMatches = [
    ...remainingContent.matchAll(/<task_progress>([\s\S]*?)<\/task_progress>/g),
  ];
  if (taskProgressMatches.length > 0) {
    const lastMatch = taskProgressMatches[taskProgressMatches.length - 1];
    result.taskProgress = parseTaskProgress(lastMatch[1]);
    remainingContent = remainingContent.replace(/<task_progress>[\s\S]*?<\/task_progress>/g, '');
  }

  // 3. Scan for tools and text blocks
  const toolPatterns = [
    'set_filter',
    'list_requests',
    'get_request_details',
    'get_values',
    'get_active_filters',
    'export_har',
    'generate_table',
    'ask_followup_question',
    'attempt_completion',
    'text',
    'code',
    'table', // New explicit table tag support if agent uses it directly or via generate_table
  ];

  const findNextTag = (str: string) => {
    let minIndex = -1;
    let bestMatch: RegExpExecArray | null = null;
    let bestTool = '';

    for (const toolName of toolPatterns) {
      // Match either <tool>content</tool> OR <tool /> (self-closing)
      // We use a non-capturing group for the alternation, but we need to ensure group 1 is content or undefined
      const regex = new RegExp(`<${toolName}(?:>([\\s\\S]*?)<\\/${toolName}>|\\s*\\/>)`, 'i');
      const match = regex.exec(str);

      if (match) {
        if (minIndex === -1 || match.index < minIndex) {
          minIndex = match.index;
          bestMatch = match;
          bestTool = toolName;
        }
      }
    }
    return { index: minIndex, match: bestMatch, toolName: bestTool };
  };

  let scanStr = remainingContent;

  while (scanStr.length > 0) {
    const { index, match, toolName } = findNextTag(scanStr);

    if (index !== -1 && match) {
      const prefix = scanStr.substring(0, index);
      if (prefix.trim()) {
        result.contentBlocks.push({ type: 'text', content: prefix.trim() });
      }

      const rawXml = match[0];
      const innerContent = match[1] || ''; // If self-closing, match[1] is undefined, default to empty

      if (toolName === 'text') {
        if (innerContent.trim()) {
          result.contentBlocks.push({
            type: 'text',
            content: innerContent.trim(),
          });
        }
      } else if (toolName === 'code') {
        const languageFn = extractParamValue(innerContent, 'language');
        const contentFn = extractParamValue(innerContent, 'content');
        // Or if simple <code>...</code>
        const simpleContent = innerContent;

        result.contentBlocks.push({
          type: 'code',
          content: contentFn || simpleContent,
          language: languageFn || 'text',
        });
      } else if (toolName === 'table') {
        const headersContent = extractParamValue(innerContent, 'headers') || '';
        const rowsContent = extractParamValue(innerContent, 'rows') || '';

        // Parse rows: <row>...</row>
        const rowMatches = [...rowsContent.matchAll(/<row>([\s\S]*?)<\/row>/gi)];
        const rows = rowMatches.map((m) => m[1].trim());

        // Fallback if no <row> tags, assume just lines
        const finalRows =
          rows.length > 0 ? rows : rowsContent.split('\n').filter((l) => l.trim().length > 0);

        result.contentBlocks.push({
          type: 'table',
          content: '', // kept for compatibility if needed
          data: {
            headers: headersContent.split(',').map((h) => h.trim()),
            rows: finalRows.map((r) => r.split(',').map((c) => c.trim())),
          },
        } as any); // Cast because we are adding structure to content block
      } else {
        const action = parseToolAction(toolName, innerContent, rawXml);
        result.contentBlocks.push({ type: 'tool', action });
        result.actions.push(action);

        if (toolName === 'ask_followup_question') {
          result.followupQuestion = action.params.question;
          result.followupOptions = action.params.options;
        } else if (toolName === 'attempt_completion') {
          result.attemptCompletion = action.params.result;
        }
      }

      scanStr = scanStr.substring(index + rawXml.length);
    } else {
      if (scanStr.trim()) {
        result.contentBlocks.push({ type: 'text', content: scanStr.trim() });
      }
      break;
    }
  }

  result.displayText = result.contentBlocks
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).content)
    .join('\n\n');

  return result;
};
