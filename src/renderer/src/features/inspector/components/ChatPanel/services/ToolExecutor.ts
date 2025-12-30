import { InspectorContext } from '../../ChatContainer';
import { initialFilterState, InspectorFilter } from '../../FilterPanel';
import { ToolAction } from '../../../../../services/ResponseParser';

export async function executeTool(action: ToolAction, context: InspectorContext): Promise<string> {
  console.log('[ToolExecutor] Executing:', action);

  switch (action.type) {
    case 'set_filter': {
      // Expecting params.filters array = [{field, value}]
      // Fallback to single type/value if parser fallback kicked in
      const filters = action.params.filters || [];

      if (filters.length === 0) return 'No filters provided.';

      const newFilter = { ...context.filter };
      const updates: string[] = [];

      for (const { field, value } of filters) {
        if (field === 'reset') {
          newFilter.host.whitelist = [];
          newFilter.host.blacklist = [];
          newFilter.path.whitelist = [];
          newFilter.path.blacklist = [];
          newFilter.methods = { ...initialFilterState.methods };
          newFilter.status = { ...initialFilterState.status };
          newFilter.type = { ...initialFilterState.type };
          updates.push('Reset all filters');
          continue;
        }

        if (field === 'method') {
          const allowedMethods: Array<keyof InspectorFilter['methods']> = [
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'OPTIONAL',
          ];
          const val = value as keyof InspectorFilter['methods'];
          if (allowedMethods.includes(val)) {
            // Reset methods first if we want exclusive selection?
            // Or additive?
            // User usage usually implies "Show me POST".
            // If they do <field>method</field><value>POST</value> <field>method</field><value>GET</value>
            // Then we should enable both.
            // But let's assume additive for this session if multi-field.
            // BUT for single field logic, we often cleared others.
            // Let's implement additive logic for multi-field:
            // Actually, safer to clear all methods IF it's the first method in this batch?
            // No, simply set to true.

            // If we want exact match, user might want to clear others.
            // For now, let's just SET to true.
            newFilter.methods[val] = true;
            updates.push(`Method ${val}`);
          }
        } else if (field === 'status') {
          const validStatuses = Object.keys(initialFilterState.status);
          if (validStatuses.includes(value)) {
            newFilter.status[value as keyof InspectorFilter['status']] = true;
            updates.push(`Status ${value}`);
          }
        }
      }

      context.onSetFilter(newFilter);
      return `Filters updated: ${updates.join(', ')}`;
    }

    case 'list_requests': {
      // Unified listing and searching
      const criteria: { field: string; value: string }[] = action.params.criteria || [];
      const limit = action.params.limit ? parseInt(action.params.limit) : 10;
      const showAllColumns = action.params.showAllColumns === true;

      let subset = context.requests;

      // Apply filtering if criteria exists
      if (criteria.length > 0) {
        subset = subset.filter((req) => {
          return criteria.every((c) => {
            const field = c.field.toLowerCase();
            const rawVal = c.value.toLowerCase();
            if (!rawVal) return true;

            // Support comma-separated values (OR logic)
            const values = rawVal
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean);
            if (values.length === 0) return true;

            if (field === 'method') {
              return values.includes(req.method.toLowerCase());
            }
            if (field === 'status') {
              return values.includes(String(req.status));
            }
            if (field === 'host') {
              return values.some((v: string) => req.host.toLowerCase().includes(v));
            }
            if (field === 'path') {
              return values.some((v: string) => req.path.toLowerCase().includes(v));
            }
            if (field === 'type') {
              return values.includes((req.type || '').toLowerCase());
            }
            if (field === 'size') {
              return values.some((v: string) => String(req.size).includes(v));
            }
            if (field === 'text') {
              return values.some((v: string) => req.host.includes(v) || req.path.includes(v));
            }
            return true;
          });
        });
      }

      const totalFound = subset.length;
      subset = subset.slice(0, limit);

      if (totalFound === 0) return 'No requests found.';

      const rows = subset
        .map((r, index) => {
          let row = `${index + 1}. ${r.id} | ${r.method} | ${r.host} | ${r.path} | ${r.status} | ${r.type || 'xhr'}`;
          if (showAllColumns) {
            row += ` | ${r.size} | ${r.time}`;
          }
          return row;
        })
        .join('\n');

      const title =
        criteria.length > 0
          ? `Found ${totalFound} matches. Showing top ${subset.length}:`
          : `Recent requests (${subset.length}/${totalFound}):`;

      return `${title}\n\n${rows}`;
    }

    case 'get_request_details': {
      const { requestId } = action.params;
      const req = context.requests.find((r) => r.id === requestId);
      if (req) {
        context.onSelectRequest(req.id);
        return JSON.stringify(req, null, 2);
      }
      return `Request ${requestId} not found.`;
    }

    case 'ask_followup_question': {
      return `[User Question Required]: ${action.params.question}`;
    }

    case 'attempt_completion': {
      return `[Task Completed]: ${action.params.result}`;
    }

    default:
      return `Tool ${action.type} not implemented yet in InspectorState.`;
  }
}
