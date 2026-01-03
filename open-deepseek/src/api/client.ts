import { net, session } from 'electron';
import crypto from 'crypto';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatPayload {
  model: string;
  messages: ChatMessage[];
  stream: true;
  temperature?: number;
}

export async function chatCompletionStream(
  token: string,
  payload: ChatPayload,
  userAgent: string | undefined,
  callbacks: {
    onContent: (content: string) => void;
    onThinking: (content: string) => void;
    onDone: () => void;
    onError: (error: Error) => void;
  },
) {
  // Use useSessionCookies: true to match Open Claude's architecture
  // This automatically attaches cookies from the default session (where Auth Window logged in)
  const request = net.request({
    method: 'POST',
    url: 'https://chat.deepseek.com/api/v0/chat/completion', // Corrected: singular 'completion'
    useSessionCookies: true,
  });

  const origin = 'https://chat.deepseek.com';

  request.setHeader('Content-Type', 'application/json');
  request.setHeader('Authorization', token); // Token captured from main process
  request.setHeader('Origin', origin);
  request.setHeader('Referer', `${origin}/`);
  // Explicitly request stream
  request.setHeader('Accept', 'text/event-stream');
  request.setHeader('Accept-Language', 'en-US,en;q=0.9');

  if (userAgent) {
    request.setHeader('User-Agent', userAgent);
  }

  // Generate necessary IDs
  const chatSessionsId = crypto.randomUUID(); // New session every time for now

  // Format: YYYYMMDD-random
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(8).toString('hex');
  const clientStreamId = `${dateStr}-${randomHex}`;

  // Private API often uses different payload structure.
  // We mimic what the browser sends.
  const webPayload = {
    chat_session_id: chatSessionsId,
    parent_message_id: null,
    prompt: payload.messages[payload.messages.length - 1].content,
    ref_file_ids: [],
    thinking_enabled: false, // Can expose this to UI later
    search_enabled: false,
    client_stream_id: clientStreamId,
  };

  request.on('response', (response) => {
    console.log(`[API] Response Status: ${response.statusCode} ${response.statusMessage}`);
    console.log('[API] Response Headers:', JSON.stringify(response.headers, null, 2));

    if (response.statusCode !== 200) {
      // Capture error body
      let errorBody = '';
      response.on('data', (chunk) => {
        errorBody += chunk.toString();
      });
      response.on('end', () => {
        console.error(`[API] Error Body: ${errorBody}`);
        // Try to parse error
        try {
          const errorJson = JSON.parse(errorBody);
          callbacks.onError(
            new Error(`API Error ${response.statusCode}: ${JSON.stringify(errorJson)}`),
          );
        } catch {
          callbacks.onError(new Error(`API Error ${response.statusCode}: ${errorBody}`));
        }
      });
      return;
    }

    let buffer = '';

    response.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      console.log(`[API Debug] Chunk received (${chunk.length} bytes): ${chunkStr}`);
      buffer += chunkStr;

      const lines = buffer.split('\n');
      // If the new chunk finishes a line, we process it.
      // But we always keep the last part in buffer unless it was empty/newline
      if (chunkStr.endsWith('\n')) {
        // If ends with newline, the last element of split is empty string, which is fine
      }

      buffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line);
      }
    });

    response.on('end', () => {
      console.log('[API] Response Ended (Stream closed)');
      if (buffer.trim()) {
        console.log('[API Debug] Processing remaining buffer:', buffer);
        processLine(buffer);
      }
      callbacks.onDone();
    });

    function processLine(line: string) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) {
        // Try parsing as JSON error if small enough
        if (trimmed.startsWith('{')) {
          try {
            console.log('[API Debug] Possible JSON body:', trimmed);
            const err = JSON.parse(trimmed);
            if (err.detail) console.error('[API Error Detail] ', err.detail);
          } catch {}
        }
        return;
      }

      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') {
        return; // Don't call onDone here, wait for 'end'
      }

      try {
        const data = JSON.parse(dataStr);

        if (typeof data.v === 'string') {
          callbacks.onContent(data.v);
          return;
        }

        if (data.choices?.[0]?.delta?.content) {
          callbacks.onContent(data.choices[0].delta.content);
        }
      } catch (e) {
        console.error('[API Debug] JSON Parse Error:', e, dataStr.substring(0, 50));
      }
    }

    response.on('error', (err) => {
      console.error('[API] Response Error:', err);
      callbacks.onError(err);
    });
  });

  request.on('error', (err) => {
    console.error('[API] Request Error:', err);
    callbacks.onError(err);
  });

  console.log('[API] Sending Payload:', JSON.stringify(webPayload, null, 2));
  request.write(JSON.stringify(webPayload));
  request.end();
}
