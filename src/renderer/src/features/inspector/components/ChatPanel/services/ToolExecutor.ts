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
          newFilter.host.blacklist = [];
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

    case 'get_values': {
      const field = (action.params.field || '').toLowerCase();
      const ignoreFilters = action.params.ignoreFilters === true;

      if (!field) return 'Field name required for get_values.';

      // Determine source: filteredRequests or all requests
      // If ignoreFilters is true, use the FULL list (context.requests).
      // If ignoreFilters is false (default), use the FILTERED list (context.filteredRequests).
      // Fallback to full list if filtered is not available.
      const source = ignoreFilters
        ? context.requests
        : context.filteredRequests || context.requests;

      const values = new Set<string>();
      source.forEach((req) => {
        let val: any = '';
        if (field === 'host') val = req.host;
        else if (field === 'path') val = req.path;
        else if (field === 'method') val = req.method;
        else if (field === 'status') val = req.status;
        else if (field === 'type') val = req.type || 'xhr';

        if (val) values.add(String(val));
      });

      const sorted = Array.from(values).sort().slice(0, 50); // Cap at 50
      return `Unique values for '${field}' (${sorted.length} found):\n- ${sorted.join('\n- ')}`;
    }

    case 'get_active_filters': {
      const f = context.filter;
      const getEnabled = (obj: Record<string, boolean>) =>
        Object.keys(obj)
          .filter((k) => obj[k])
          .join(',');

      const getStatusEnabled = (obj: Record<string, boolean>) => {
        const mapping: Record<string, string> = {
          success: '2xx',
          redirect: '3xx',
          clientError: '4xx',
          serverError: '5xx',
          other: 'other',
        };
        return Object.keys(obj)
          .filter((k) => obj[k])
          .map((k) => mapping[k] || k)
          .join(',');
      };

      const parts: string[] = [];
      parts.push(`method: ${getEnabled(f.methods)}`);
      parts.push(`status: ${getStatusEnabled(f.status)}`);
      parts.push(`type: ${getEnabled(f.type)}`);
      parts.push(`host (exclude):      parts.push(`host (exclude): ${f.host.blacklist.length ? f.host.blacklist.join(',') : 'none'}`);
      parts.push(`path (exclude): ${f.path.blacklist.length ? f.path.blacklist.join(',') : 'none'}`);
      parts.push(`size: ${f.size.min || f.size.max ? `${f.size.min}-${f.size.max}` : 'any'}`);
      parts.push(`time: ${f.time.min || f.time.max ? `${f.time.min}-${f.time.max}` : 'any'}`);

      return parts.join('\n');
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
