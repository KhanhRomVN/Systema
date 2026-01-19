// Provider Registry - Configuration for all supported providers

import { ProviderType, ProviderMetadata } from '../../types/provider-types';

export interface ProviderFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
}

export interface ProviderRegistryEntry extends ProviderMetadata {
  fields: ProviderFieldConfig[];
  icon?: string;
}

export const PROVIDER_REGISTRY: Record<ProviderType, ProviderRegistryEntry> = {
  [ProviderType.ELARA_FREE]: {
    type: ProviderType.ELARA_FREE,
    name: 'Elara (FREE)',
    description: 'Free AI provider with multiple models',
    category: 'free',
    requiresApiKey: false,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Elara URL',
        type: 'url',
        placeholder: 'http://localhost:11434',
        required: true,
        defaultValue: 'http://localhost:11434',
      },
    ],
  },

  [ProviderType.CLINE]: {
    type: ProviderType.CLINE,
    name: 'Cline',
    description: 'Cline AI assistant',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Cline API key',
        required: true,
      },
    ],
  },

  [ProviderType.OPEN_ROUTER]: {
    type: ProviderType.OPEN_ROUTER,
    name: 'OpenRouter',
    description: 'Access multiple AI models through one API',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-or-...',
        required: true,
      },
    ],
  },

  [ProviderType.GOOGLE_GEMINI]: {
    type: ProviderType.GOOGLE_GEMINI,
    name: 'Google Gemini',
    description: "Google's advanced AI models",
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Google AI API key',
        required: true,
      },
    ],
  },

  [ProviderType.OPENAI_COMPATIBLE]: {
    type: ProviderType.OPENAI_COMPATIBLE,
    name: 'OpenAI Compatible',
    description: 'Any OpenAI-compatible API endpoint',
    category: 'self-hosted',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Base URL',
        type: 'url',
        placeholder: 'https://api.example.com',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true,
      },
    ],
  },

  [ProviderType.ANTHROPIC]: {
    type: ProviderType.ANTHROPIC,
    name: 'Anthropic',
    description: 'Claude AI models by Anthropic',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        required: true,
      },
    ],
  },

  [ProviderType.AMAZON_BEDROCK]: {
    type: ProviderType.AMAZON_BEDROCK,
    name: 'Amazon Bedrock',
    description: 'AWS managed AI service',
    category: 'enterprise',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'accessKeyId',
        label: 'Access Key ID',
        type: 'text',
        placeholder: 'AKIA...',
        required: true,
      },
      {
        name: 'secretAccessKey',
        label: 'Secret Access Key',
        type: 'password',
        placeholder: 'Enter your secret key',
        required: true,
      },
      {
        name: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'EU (Ireland)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        ],
      },
    ],
  },

  [ProviderType.DEEPSEEK]: {
    type: ProviderType.DEEPSEEK,
    name: 'DeepSeek',
    description: 'DeepSeek AI models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your DeepSeek API key',
        required: true,
      },
    ],
  },

  [ProviderType.OPENAI]: {
    type: ProviderType.OPENAI,
    name: 'OpenAI',
    description: 'GPT models by OpenAI',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true,
      },
    ],
  },

  [ProviderType.OLLAMA]: {
    type: ProviderType.OLLAMA,
    name: 'Ollama',
    description: 'Run LLMs locally with Ollama',
    category: 'self-hosted',
    requiresApiKey: false,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Base URL',
        type: 'url',
        placeholder: 'http://localhost:11434',
        required: true,
        defaultValue: 'http://localhost:11434',
      },
    ],
  },

  [ProviderType.GCP_VERTEX_AI]: {
    type: ProviderType.GCP_VERTEX_AI,
    name: 'GCP Vertex AI',
    description: 'Google Cloud Vertex AI',
    category: 'enterprise',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'projectId',
        label: 'Project ID',
        type: 'text',
        placeholder: 'your-project-id',
        required: true,
      },
      {
        name: 'location',
        label: 'Location',
        type: 'text',
        placeholder: 'us-central1',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true,
      },
    ],
  },

  [ProviderType.LITELM]: {
    type: ProviderType.LITELM,
    name: 'LiteLLM',
    description: 'Unified interface for 100+ LLMs',
    category: 'self-hosted',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Base URL',
        type: 'url',
        placeholder: 'http://localhost:4000',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true,
      },
    ],
  },

  [ProviderType.CLAUDE_CODE]: {
    type: ProviderType.CLAUDE_CODE,
    name: 'Claude Code',
    description: 'Claude optimized for coding',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        required: true,
      },
    ],
  },

  [ProviderType.SAP_AI_CORE]: {
    type: ProviderType.SAP_AI_CORE,
    name: 'SAP AI Core',
    description: 'SAP AI Core service',
    category: 'enterprise',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true,
      },
      {
        name: 'resourceGroup',
        label: 'Resource Group',
        type: 'text',
        placeholder: 'default',
        required: true,
      },
    ],
  },

  [ProviderType.MISTRAL]: {
    type: ProviderType.MISTRAL,
    name: 'Mistral AI',
    description: 'Mistral AI models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Mistral API key',
        required: true,
      },
    ],
  },

  [ProviderType.Z_AI]: {
    type: ProviderType.Z_AI,
    name: 'Z AI',
    description: 'Z AI platform',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Z AI API key',
        required: true,
      },
    ],
  },

  [ProviderType.GROQ]: {
    type: ProviderType.GROQ,
    name: 'Groq',
    description: 'Ultra-fast AI inference',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'gsk_...',
        required: true,
      },
    ],
  },

  [ProviderType.CEREBRAS]: {
    type: ProviderType.CEREBRAS,
    name: 'Cerebras',
    description: 'Cerebras AI inference',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Cerebras API key',
        required: true,
      },
    ],
  },

  [ProviderType.VERCEL_AI_GATEWAY]: {
    type: ProviderType.VERCEL_AI_GATEWAY,
    name: 'Vercel AI Gateway',
    description: 'Vercel AI Gateway',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your API key',
        required: true,
      },
    ],
  },

  [ProviderType.BASETEN]: {
    type: ProviderType.BASETEN,
    name: 'Baseten',
    description: 'Baseten ML platform',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Baseten API key',
        required: true,
      },
    ],
  },

  [ProviderType.REQUESTY]: {
    type: ProviderType.REQUESTY,
    name: 'Requesty',
    description: 'Requesty AI service',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Requesty API key',
        required: true,
      },
    ],
  },

  [ProviderType.FIREWORKS_AI]: {
    type: ProviderType.FIREWORKS_AI,
    name: 'Fireworks AI',
    description: 'Fast AI model inference',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Fireworks AI API key',
        required: true,
      },
    ],
  },

  [ProviderType.TOGETHER]: {
    type: ProviderType.TOGETHER,
    name: 'Together AI',
    description: 'Together AI platform',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Together AI API key',
        required: true,
      },
    ],
  },

  [ProviderType.ALIBABA_QWEN]: {
    type: ProviderType.ALIBABA_QWEN,
    name: 'Alibaba Qwen',
    description: 'Alibaba Qwen models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Qwen API key',
        required: true,
      },
    ],
  },

  [ProviderType.BYTEDANCE_DOUBAO]: {
    type: ProviderType.BYTEDANCE_DOUBAO,
    name: 'Bytedance Doubao',
    description: 'Bytedance Doubao AI',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Doubao API key',
        required: true,
      },
    ],
  },

  [ProviderType.LM_STUDIO]: {
    type: ProviderType.LM_STUDIO,
    name: 'LM Studio',
    description: 'Run LLMs locally with LM Studio',
    category: 'self-hosted',
    requiresApiKey: false,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Base URL',
        type: 'url',
        placeholder: 'http://localhost:1234',
        required: true,
        defaultValue: 'http://localhost:1234',
      },
    ],
  },

  [ProviderType.MOONSHOT]: {
    type: ProviderType.MOONSHOT,
    name: 'Moonshot AI',
    description: 'Moonshot AI models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Moonshot API key',
        required: true,
      },
    ],
  },

  [ProviderType.HUGGING_FACE]: {
    type: ProviderType.HUGGING_FACE,
    name: 'Hugging Face',
    description: 'Hugging Face Inference API',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'manual',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'hf_...',
        required: true,
      },
    ],
  },

  [ProviderType.NEBIUS_AI_STUDIO]: {
    type: ProviderType.NEBIUS_AI_STUDIO,
    name: 'Nebius AI Studio',
    description: 'Nebius AI Studio platform',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Nebius API key',
        required: true,
      },
    ],
  },

  [ProviderType.ASK_SAGE]: {
    type: ProviderType.ASK_SAGE,
    name: 'AskSage',
    description: 'AskSage AI assistant',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your AskSage API key',
        required: true,
      },
    ],
  },

  [ProviderType.XAI]: {
    type: ProviderType.XAI,
    name: 'xAI',
    description: 'xAI Grok models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your xAI API key',
        required: true,
      },
    ],
  },

  [ProviderType.SAMBANOVA]: {
    type: ProviderType.SAMBANOVA,
    name: 'SambaNova',
    description: 'SambaNova AI platform',
    category: 'enterprise',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your SambaNova API key',
        required: true,
      },
    ],
  },

  [ProviderType.DIFY_AI]: {
    type: ProviderType.DIFY_AI,
    name: 'Dify.ai',
    description: 'Dify.ai LLMOps platform',
    category: 'self-hosted',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'baseURL',
        label: 'Base URL',
        type: 'url',
        placeholder: 'https://api.dify.ai',
        required: true,
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'app-...',
        required: true,
      },
    ],
  },

  [ProviderType.ORACLE_CODE_ASSIST]: {
    type: ProviderType.ORACLE_CODE_ASSIST,
    name: 'Oracle Code Assist',
    description: 'Oracle Code Assist AI',
    category: 'enterprise',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Oracle API key',
        required: true,
      },
    ],
  },

  [ProviderType.MINIMAX]: {
    type: ProviderType.MINIMAX,
    name: 'MiniMax',
    description: 'MiniMax AI models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'static',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your MiniMax API key',
        required: true,
      },
      {
        name: 'groupId',
        label: 'Group ID',
        type: 'text',
        placeholder: 'Enter your group ID',
        required: true,
      },
    ],
  },

  [ProviderType.HICAP]: {
    type: ProviderType.HICAP,
    name: 'Hicap',
    description: 'Hicap AI service',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your Hicap API key',
        required: true,
      },
    ],
  },

  [ProviderType.AIHUBMIX]: {
    type: ProviderType.AIHUBMIX,
    name: 'AIhubmix',
    description: 'AIhubmix platform',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your AIhubmix API key',
        required: true,
      },
    ],
  },

  [ProviderType.NOUS_RESEARCH]: {
    type: ProviderType.NOUS_RESEARCH,
    name: 'NousResearch',
    description: 'NousResearch AI models',
    category: 'paid',
    requiresApiKey: true,
    supportsStreaming: true,
    modelFetchStrategy: 'dynamic',
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Enter your NousResearch API key',
        required: true,
      },
    ],
  },
};

// Helper function to get provider by type
export function getProviderConfig(type: ProviderType): ProviderRegistryEntry | undefined {
  return PROVIDER_REGISTRY[type];
}

// Get all providers
export function getAllProviders(): ProviderRegistryEntry[] {
  return Object.values(PROVIDER_REGISTRY);
}

// Get providers by category
export function getProvidersByCategory(
  category: 'free' | 'paid' | 'self-hosted' | 'enterprise',
): ProviderRegistryEntry[] {
  return getAllProviders().filter((p) => p.category === category);
}
