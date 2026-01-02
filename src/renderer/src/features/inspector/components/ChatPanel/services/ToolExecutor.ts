import { InspectorContext } from '../../ChatContainer';
import { initialFilterState, InspectorFilter } from '../../FilterPanel';
import { ToolAction } from '../../../../../services/ResponseParser';

export async function executeTool(action: ToolAction, context: InspectorContext): Promise<string> {
  switch (action.type) {
    case 'set_filter': {
      // Expecting params.filters array = [{field, value}]
      // Fallback to single type/value if parser fallback kicked in
      const filters = action.params.filters || [];

      if (filters.length === 0) return 'No filters provided.';

      const newFilter = {
        ...context.filter,
        methods: { ...context.filter.methods },
        status: { ...context.filter.status },
        type: { ...context.filter.type },
        host: { ...context.filter.host, whitelist: [...(context.filter.host.whitelist || [])] },
        path: { ...context.filter.path, whitelist: [...(context.filter.path.whitelist || [])] },
        size: { ...context.filter.size },
        time: { ...context.filter.time },
      };
      const updates: string[] = [];

      for (const filterItem of filters) {
        const { field, value } = filterItem;
        const exclude = filterItem.exclude === true || filterItem.exclude === 'true';
        const mode = filterItem.mode || 'append';
        const shouldRemove = exclude || mode === 'remove';

        // Support comma-separated values
        const values = value
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean);

        if (field === 'reset') {
          newFilter.host.whitelist = [];
          newFilter.path.whitelist = [];
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
            'PATCH',
            'DELETE',
            'HEAD',
            'OPTIONS',
            'TRACE',
            'CONNECT',
          ];

          values.forEach((val: string) => {
            const methodVal = val as keyof InspectorFilter['methods'];
            if (allowedMethods.includes(methodVal)) {
              newFilter.methods[methodVal] = !shouldRemove;
              updates.push(`Method ${methodVal} ${shouldRemove ? 'excluded' : 'included'}`);
            }
          });
        } else if (field === 'status') {
          const validStatuses = Object.keys(initialFilterState.status);
          values.forEach((val: string | number) => {
            if (validStatuses.includes(String(val))) {
              newFilter.status[val as keyof InspectorFilter['status']] = !shouldRemove;
              updates.push(`Status ${val} ${shouldRemove ? 'excluded' : 'included'}`);
            }
          });
        } else if (field === 'type') {
          const validTypes = Object.keys(initialFilterState.type);
          values.forEach((val: string) => {
            const typeKey = val.toLowerCase();
            if (validTypes.includes(typeKey)) {
              newFilter.type[typeKey as keyof InspectorFilter['type']] = !shouldRemove;
              updates.push(`Type ${typeKey} ${shouldRemove ? 'excluded' : 'included'}`);
            }
          });
        } else if (field === 'host') {
          values.forEach((val: string) => {
            if (shouldRemove) {
              newFilter.host.whitelist = newFilter.host.whitelist.filter((h) => h !== val);
              updates.push(`Removed host ${val} from whitelist`);
            } else {
              if (!newFilter.host.whitelist.includes(val)) {
                newFilter.host.whitelist.push(val);
                updates.push(`Added host ${val} to whitelist`);
              }
            }
          });
        } else if (field === 'path') {
          values.forEach((val: string) => {
            if (shouldRemove) {
              newFilter.path.whitelist = newFilter.path.whitelist.filter((p) => p !== val);
              updates.push(`Removed path ${val} from whitelist`);
            } else {
              if (!newFilter.path.whitelist.includes(val)) {
                newFilter.path.whitelist.push(val);
                updates.push(`Added path ${val} to whitelist`);
              }
            }
          });
        } else if (field === 'size' || field === 'time') {
          // Parse range "min - max"
          const rangeStr = values[0] || '';
          const [minStr, maxStr] = rangeStr.split('-').map((s: string) => s.trim());
          const min = minStr && minStr !== 'any' ? Number(minStr) : 0;
          const max = maxStr && maxStr !== 'any' ? Number(maxStr) : Infinity;

          if (!isNaN(min)) newFilter[field as 'size' | 'time'].min = String(min);
          if (!isNaN(max)) newFilter[field as 'size' | 'time'].max = String(max);
          updates.push(`Updated ${field} range`);
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
        return Object.keys(obj)
          .filter((k) => obj[k] && !isNaN(Number(k))) // Only numeric keys
          .join(',');
      };

      const parts: string[] = [];
      parts.push(`method: ${getEnabled(f.methods)}`);
      parts.push(`status: ${getStatusEnabled(f.status)}`);
      parts.push(`type: ${getEnabled(f.type)}`);
      parts.push(
        `host (whitelist): ${(f.host.whitelist || []).length ? f.host.whitelist.join(',') : 'all'}`,
      );
      parts.push(
        `path (whitelist): ${(f.path.whitelist || []).length ? f.path.whitelist.join(',') : 'all'}`,
      );
      parts.push(`size: ${f.size.min || 'any'} - ${f.size.max || 'any'}`);
      parts.push(`time: ${f.time.min || 'any'} - ${f.time.max || 'any'}`);

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
