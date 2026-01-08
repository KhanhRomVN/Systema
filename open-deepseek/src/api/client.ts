import { net } from 'electron';
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

interface PoWChallenge {
  algorithm: string;
  challenge: string;
  salt: string;
  difficulty: number;
  signature: string;
  expire_at: number;
  expire_after: number;
  target_path: string;
}

interface PoWResponse {
  algorithm: string;
  challenge: string;
  salt: string;
  answer: number;
  signature: string;
  target_path: string;
}

// TODO: Replace with actual implementation from user
function solvePoW(challenge: PoWChallenge): PoWResponse {
  console.log('[PoW] Solving challenge:', challenge);

  // PLACEHOLDER: This needs the real "DeepSeekHashV1" algorithm.
  // We will ask the user for this logic.
  // For now, we return a dummy answer to verify the flow structure.

  return {
    algorithm: challenge.algorithm,
    challenge: challenge.challenge,
    salt: challenge.salt,
    answer: 0, // DUMMY VALUE
    signature: challenge.signature,
    target_path: challenge.target_path,
  };
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
  try {
    const apiBase = 'https://chat.deepseek.com/api/v0';
    const origin = 'https://chat.deepseek.com';

    // Helper for requests
    const makeRequest = (
      url: string,
      method: string,
      body?: any,
      additionalHeaders: Record<string, string> = {},
    ) => {
      return new Promise<any>((resolve, reject) => {
        const req = net.request({ method, url, useSessionCookies: true });
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', token);
        req.setHeader('Origin', origin);
        req.setHeader('Referer', `${origin}/`);
        if (userAgent) req.setHeader('User-Agent', userAgent);

        Object.entries(additionalHeaders).forEach(([k, v]) => req.setHeader(k, v));

        req.on('response', (response) => {
          let data = '';
          response.on('data', (chunk) => (data += chunk.toString()));
          response.on('end', () => {
            if (response.statusCode >= 200 && response.statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                resolve(data);
              }
            } else {
              reject(new Error(`Request to ${url} failed: ${response.statusCode} ${data}`));
            }
          });
          response.on('error', reject);
        });

        req.on('error', reject);

        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });
    };

    // 1. Create Chat Session
    console.log('[API] Creating Chat Session...');
    const sessionRes = await makeRequest(`${apiBase}/chat_session/create`, 'POST', {
      character_id: null, // As usually seen in web
    });

    // Extract session ID (biz_data.id)
    const sessionId = sessionRes?.data?.biz_data?.id;
    if (!sessionId) {
      throw new Error('Failed to create chat session: No ID returned');
    }
    console.log('[API] Chat Session Created:', sessionId);

    // 2. Request PoW Challenge
    console.log('[API] Requesting PoW Challenge...');
    const challengeRes = await makeRequest(
      `${apiBase}/chat/create_pow_challenge`,
      'POST',
      { target_path: '/api/v0/chat/completion' },
      { Referer: `${origin}/a/chat/s/${sessionId}` }, // Important: Referer with session ID
    );

    const challengeData: PoWChallenge = challengeRes?.data?.biz_data?.challenge;
    if (!challengeData) {
      throw new Error('Failed to get PoW challenge');
    }

    // 3. Solve PoW
    console.log('[API] Solving PoW...');
    const powAnswer = solvePoW(challengeData);
    const powResponseBase64 = Buffer.from(JSON.stringify(powAnswer)).toString('base64');

    // 4. Send Chat Completion
    console.log('[API] Sending Completion Request...');

    const clientStreamId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(8).toString('hex')}`;

    const webPayload = {
      chat_session_id: sessionId,
      parent_message_id: null,
      prompt: payload.messages[payload.messages.length - 1].content,
      ref_file_ids: [],
      thinking_enabled: false,
      search_enabled: false,
      client_stream_id: clientStreamId,
    };

    const request = net.request({
      method: 'POST',
      url: `${apiBase}/chat/completion`,
      useSessionCookies: true,
    });

    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Authorization', token);
    request.setHeader('Origin', origin);
    request.setHeader('Referer', `${origin}/a/chat/s/${sessionId}`);
    request.setHeader('Accept', 'text/event-stream');
    request.setHeader('X-Ds-Pow-Response', powResponseBase64); // The magic header
    if (userAgent) request.setHeader('User-Agent', userAgent);

    request.on('response', (response) => {
      console.log(`[API] Completion Status: ${response.statusCode}`);

      if (response.statusCode !== 200) {
        let errBody = '';
        response.on('data', (c) => (errBody += c));
        response.on('end', () =>
          callbacks.onError(new Error(`API Error ${response.statusCode}: ${errBody}`)),
        );
        return;
      }

      let buffer = '';
      response.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      });

      response.on('end', () => {
        if (buffer.trim()) processLine(buffer);
        callbacks.onDone();
      });
    });

    function processLine(line: string) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) return;

      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') return;

      try {
        const data = JSON.parse(dataStr);
        // Handle stream format
        if (typeof data.v === 'string') {
          callbacks.onContent(data.v);
        } else if (data.choices?.[0]?.delta?.content) {
          callbacks.onContent(data.choices[0].delta.content);
        }
      } catch (e) {
        // Ignore parse errors for keep-alive messages
      }
    }

    request.on('error', (err) => callbacks.onError(err));
    request.write(JSON.stringify(webPayload));
    request.end();
  } catch (error: any) {
    console.error('[API] Fatal Error:', error);
    callbacks.onError(error);
  }
}
