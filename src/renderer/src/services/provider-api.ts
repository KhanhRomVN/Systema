// Provider API Service for fetching models and validating configurations

import {
  ProviderType,
  ProviderConfig,
  ModelInfo,
} from '../features/inspector/types/provider-types';

export class ProviderAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ProviderAPIError';
  }
}

/**
 * Fetch models from Elara FREE endpoint
 */
export async function fetchElaraModels(baseURL: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseURL}/v1/models/all`);
    if (!response.ok) {
      throw new ProviderAPIError(`Failed to fetch models: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }

    throw new ProviderAPIError('Invalid response format from Elara API');
  } catch (error) {
    if (error instanceof ProviderAPIError) throw error;
    throw new ProviderAPIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Fetch models based on provider type and configuration
 */
export async function fetchModels(config: Partial<ProviderConfig>): Promise<ModelInfo[]> {
  switch (config.type) {
    case ProviderType.ELARA_FREE:
      if (!config.baseURL) throw new ProviderAPIError('Base URL is required for Elara FREE');
      return fetchElaraModels(config.baseURL);

    case ProviderType.OLLAMA:
      return fetchOllamaModels(config.baseURL || 'http://localhost:11434');

    case ProviderType.LM_STUDIO:
      return fetchLMStudioModels(config.baseURL || 'http://localhost:1234');

    case ProviderType.OPENAI_COMPATIBLE:
      if (!config.baseURL) throw new ProviderAPIError('Base URL is required');
      return fetchOpenAICompatibleModels(config.baseURL, config.apiKey);

    // Static model providers
    case ProviderType.DEEPSEEK:
      return getDeepSeekModels();

    case ProviderType.ANTHROPIC:
    case ProviderType.CLAUDE_CODE:
      return getClaudeModels();

    case ProviderType.GOOGLE_GEMINI:
      return getGeminiModels();

    case ProviderType.OPENAI:
      return getOpenAIModels();

    case ProviderType.MISTRAL:
      return getMistralModels();

    case ProviderType.XAI:
      return getXAIModels();

    case ProviderType.ALIBABA_QWEN:
      return getQwenModels();

    case ProviderType.MOONSHOT:
      return getMoonshotModels();

    case ProviderType.MINIMAX:
      return getMiniMaxModels();

    // Dynamic providers that need API implementation
    case ProviderType.OPEN_ROUTER:
    case ProviderType.GROQ:
    case ProviderType.CEREBRAS:
    case ProviderType.FIREWORKS_AI:
    case ProviderType.TOGETHER:
    case ProviderType.SAMBANOVA:
      return []; // Will be implemented with actual API calls

    default:
      return [];
  }
}

/**
 * Fetch models from Ollama
 */
async function fetchOllamaModels(baseURL: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseURL}/api/tags`);
    if (!response.ok) throw new ProviderAPIError('Failed to fetch Ollama models');

    const data = await response.json();
    if (Array.isArray(data.models)) {
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
      }));
    }
    return [];
  } catch (error) {
    throw new ProviderAPIError(
      `Ollama error: ${error instanceof Error ? error.message : 'Unknown'}`,
    );
  }
}

/**
 * Fetch models from LM Studio
 */
async function fetchLMStudioModels(baseURL: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseURL}/v1/models`);
    if (!response.ok) throw new ProviderAPIError('Failed to fetch LM Studio models');

    const data = await response.json();
    if (Array.isArray(data.data)) {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
      }));
    }
    return [];
  } catch (error) {
    throw new ProviderAPIError(
      `LM Studio error: ${error instanceof Error ? error.message : 'Unknown'}`,
    );
  }
}

/**
 * Fetch models from OpenAI-compatible endpoint
 */
async function fetchOpenAICompatibleModels(baseURL: string, apiKey?: string): Promise<ModelInfo[]> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseURL}/v1/models`, { headers });
    if (!response.ok) throw new ProviderAPIError('Failed to fetch models');

    const data = await response.json();
    if (Array.isArray(data.data)) {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
      }));
    }
    return [];
  } catch (error) {
    throw new ProviderAPIError(`API error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

// Static model lists

function getDeepSeekModels(): ModelInfo[] {
  return [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ];
}

function getClaudeModels(): ModelInfo[] {
  return [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ];
}

function getGeminiModels(): ModelInfo[] {
  return [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B' },
  ];
}

function getOpenAIModels(): ModelInfo[] {
  return [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o1', name: 'o1' },
    { id: 'o1-mini', name: 'o1 Mini' },
  ];
}

function getMistralModels(): ModelInfo[] {
  return [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-medium-latest', name: 'Mistral Medium' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'open-mistral-7b', name: 'Mistral 7B' },
    { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B' },
    { id: 'open-mixtral-8x22b', name: 'Mixtral 8x22B' },
  ];
}

function getXAIModels(): ModelInfo[] {
  return [
    { id: 'grok-beta', name: 'Grok Beta' },
    { id: 'grok-vision-beta', name: 'Grok Vision Beta' },
  ];
}

function getQwenModels(): ModelInfo[] {
  return [
    { id: 'qwen-turbo', name: 'Qwen Turbo' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
    { id: 'qwen-max', name: 'Qwen Max' },
    { id: 'qwen-max-longcontext', name: 'Qwen Max Long Context' },
  ];
}

function getMoonshotModels(): ModelInfo[] {
  return [
    { id: 'moonshot-v1-8k', name: 'Moonshot v1 8K' },
    { id: 'moonshot-v1-32k', name: 'Moonshot v1 32K' },
    { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K' },
  ];
}

function getMiniMaxModels(): ModelInfo[] {
  return [
    { id: 'abab6.5-chat', name: 'abab6.5 Chat' },
    { id: 'abab6.5s-chat', name: 'abab6.5s Chat' },
    { id: 'abab5.5-chat', name: 'abab5.5 Chat' },
  ];
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: Partial<ProviderConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.type) {
    errors.push('Provider type is required');
    return { valid: false, errors };
  }

  if (!config.model) {
    errors.push('Model selection is required');
  }

  // Type-specific validation
  switch (config.type) {
    case ProviderType.ELARA_FREE:
      if (!config.baseURL) errors.push('Base URL is required');
      break;

    case ProviderType.OPENAI:
    case ProviderType.ANTHROPIC:
    case ProviderType.GOOGLE_GEMINI:
    case ProviderType.DEEPSEEK:
    case ProviderType.MISTRAL:
    case ProviderType.XAI:
    case ProviderType.GROQ:
    case ProviderType.OPEN_ROUTER:
      if (!config.apiKey) errors.push('API key is required');
      break;

    case ProviderType.OPENAI_COMPATIBLE:
    case ProviderType.LITELM:
    case ProviderType.DIFY_AI:
      if (!config.baseURL) errors.push('Base URL is required');
      if (!config.apiKey) errors.push('API key is required');
      break;

    case ProviderType.AMAZON_BEDROCK:
      if (!config.accessKeyId) errors.push('Access Key ID is required');
      if (!config.secretAccessKey) errors.push('Secret Access Key is required');
      if (!config.region) errors.push('Region is required');
      break;

    case ProviderType.GCP_VERTEX_AI:
      if (!config.projectId) errors.push('Project ID is required');
      if (!config.location) errors.push('Location is required');
      if (!config.apiKey) errors.push('API key is required');
      break;

    case ProviderType.SAP_AI_CORE:
      if (!config.apiKey) errors.push('API key is required');
      if (!config.resourceGroup) errors.push('Resource group is required');
      break;

    case ProviderType.MINIMAX:
      if (!config.apiKey) errors.push('API key is required');
      if (!config.groupId) errors.push('Group ID is required');
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
