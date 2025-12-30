import { InspectorContext } from '../../ChatContainer';
import { initialFilterState, InspectorFilter } from '../../FilterPanel';
import { ToolAction } from '../../../../../services/ResponseParser';

export async function executeTool(action: ToolAction, context: InspectorContext): Promise<string> {
  console.log('[ToolExecutor] Executing:', action);

  switch (action.type) {
    case 'set_filter': {
      const { type, value } = action.params;
      const currentFilter = context.filter;
      const newFilter = { ...currentFilter };

      // Example: <set_filter type="method" value="POST" />
      // Example: <set_filter type="status" value="success" />
      if (type === 'method') {
        const allowedMethods: Array<keyof InspectorFilter['methods']> = [
          'GET',
          'POST',
          'PUT',
          'DELETE',
          'OPTIONAL',
        ];
        // Cast to unknown first if needed, or just string to specific key
        const methodValue = value as keyof InspectorFilter['methods'];

        if (allowedMethods.includes(methodValue)) {
          // Reset all methods to false
          (Object.keys(newFilter.methods) as Array<keyof InspectorFilter['methods']>).forEach(
            (k) => (newFilter.methods[k] = false),
          );
          // Set selected method to true
          newFilter.methods[methodValue] = true;
        }
      } else if (type === 'status') {
        const statusValue = value as keyof InspectorFilter['status'];
        const validStatuses = Object.keys(initialFilterState.status);

        if (validStatuses.includes(value)) {
          (Object.keys(newFilter.status) as Array<keyof InspectorFilter['status']>).forEach(
            (k) => (newFilter.status[k] = false),
          );
          newFilter.status[statusValue] = true;
        }
      } else if (type === 'reset') {
        newFilter.host.whitelist = [];
        newFilter.host.blacklist = [];
        newFilter.path.whitelist = [];
        newFilter.path.blacklist = [];
        newFilter.methods = { ...initialFilterState.methods };
        newFilter.status = { ...initialFilterState.status };
        newFilter.type = { ...initialFilterState.type };
      }

      context.onSetFilter(newFilter);
      return `Filter updated: Set ${type} to ${value}`;
    }

    case 'search_requests': {
      const { query } = action.params;
      // Search usually implies filtering by path/host?
      // Or if we have a search bar.
      // Let's implement as "filter path whitelist" or similar.
      const currentFilter = context.filter;
      const newFilter = { ...currentFilter };
      // Add to whitelist? Or just log.
      // If we had a 'text search' field in filter, we'd set it.
      // Assuming path whitelist for now effectively searches.
      if (query) {
        newFilter.path.whitelist = [query];
        context.onSetFilter(newFilter);
        return `Searching requests for '${query}'`;
      }
      return 'No query provided';
    }

    case 'list_requests': {
      // Return list of requests formatted as table
      // We can grab them from context.requests
      const limit = action.params.limit ? parseInt(action.params.limit) : 10;
      const subset = context.requests.slice(0, limit);

      const header = '| ID | Method | URL | Status | Size | Time |\n|---|---|---|---|---|---|';
      const rows = subset
        .map(
          (r) =>
            `| ${r.id} | ${r.method} | ${r.host}${r.path.substring(0, 20)}... | ${r.status} | ${r.size} | ${r.time} |`,
        )
        .join('\n');

      return `Here are the top ${subset.length} requests:\n\n${header}\n${rows}`;
    }

    case 'get_request_details': {
      const { requestId } = action.params;
      const req = context.requests.find((r) => r.id === requestId);
      if (req) {
        context.onSelectRequest(req.id); // Auto-select in UI
        return JSON.stringify(req, null, 2);
      }
      return `Request ${requestId} not found.`;
    }

    case 'export_har': {
      // In a real implementation we would fetch all requests from context.requests
      // and convert them to HAR format.
      return `HAR export generated for ${context.requests.length} requests (Mock).`;
    }

    case 'ask_followup_question': {
      // Just pass through the question to be displayed?
      // The AI usually outputs text anyway. This might be for specific UI prompt?
      return `[User Question Required]: ${action.params.question}`;
    }

    case 'attempt_completion': {
      return `[Task Completed]: ${action.params.result}`;
    }

    default:
      return `Tool ${action.type} not implemented yet in InspectorState.`;
  }
}
