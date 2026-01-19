// Provider Types and Interfaces for Multi-Provider Chat System

export enum ProviderType {
  ELARA_FREE = 'elara-free',
  CLINE = 'cline',
  OPEN_ROUTER = 'openrouter',
  GOOGLE_GEMINI = 'google-gemini',
  OPENAI_COMPATIBLE = 'openai-compatible',
  ANTHROPIC = 'anthropic',
  AMAZON_BEDROCK = 'bedrock',
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
  GCP_VERTEX_AI = 'gcp-vertex-ai',
  LITELM = 'litellm',
  CLAUDE_CODE = 'claude-code',
  SAP_AI_CORE = 'sap-ai-core',
  MISTRAL = 'mistral',
  Z_AI = 'z-ai',
  GROQ = 'groq',
  CEREBRAS = 'cerebras',
  VERCEL_AI_GATEWAY = 'vercel-ai-gateway',
  BASETEN = 'baseten',
  REQUESTY = 'requesty',
  FIREWORKS_AI = 'fireworks-ai',
  TOGETHER = 'together',
  ALIBABA_QWEN = 'alibaba-qwen',
  BYTEDANCE_DOUBAO = 'bytedance-doubao',
  LM_STUDIO = 'lm-studio',
  MOONSHOT = 'moonshot',
  HUGGING_FACE = 'huggingface',
  NEBIUS_AI_STUDIO = 'nebius-ai-studio',
  ASK_SAGE = 'asksage',
  XAI = 'xai',
  SAMBANOVA = 'sambanova',
  DIFY_AI = 'dify-ai',
  ORACLE_CODE_ASSIST = 'oracle-code-assist',
  MINIMAX = 'minimax',
  HICAP = 'hicap',
  AIHUBMIX = 'aihubmix',
  NOUS_RESEARCH = 'nous-research',
}

export interface ModelInfo {
  id: string;
  name: string;
  provider_id?: string;
  provider_name?: string;
  is_thinking?: boolean;
}

export interface BaseProviderConfig {
  type: ProviderType;
  name: string;
  model: string;
}

export interface ElaraFreeConfig extends BaseProviderConfig {
  type: ProviderType.ELARA_FREE;
  baseURL: string;
  accountId?: string;
}

export interface ClineConfig extends BaseProviderConfig {
  type: ProviderType.CLINE;
  apiKey: string;
}

export interface OpenRouterConfig extends BaseProviderConfig {
  type: ProviderType.OPEN_ROUTER;
  apiKey: string;
}

export interface GoogleGeminiConfig extends BaseProviderConfig {
  type: ProviderType.GOOGLE_GEMINI;
  apiKey: string;
}

export interface OpenAICompatibleConfig extends BaseProviderConfig {
  type: ProviderType.OPENAI_COMPATIBLE;
  baseURL: string;
  apiKey: string;
}

export interface AnthropicConfig extends BaseProviderConfig {
  type: ProviderType.ANTHROPIC;
  apiKey: string;
}

export interface AmazonBedrockConfig extends BaseProviderConfig {
  type: ProviderType.AMAZON_BEDROCK;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface DeepSeekConfig extends BaseProviderConfig {
  type: ProviderType.DEEPSEEK;
  apiKey: string;
}

export interface OpenAIConfig extends BaseProviderConfig {
  type: ProviderType.OPENAI;
  apiKey: string;
}

export interface OllamaConfig extends BaseProviderConfig {
  type: ProviderType.OLLAMA;
  baseURL: string;
}

export interface GCPVertexAIConfig extends BaseProviderConfig {
  type: ProviderType.GCP_VERTEX_AI;
  projectId: string;
  location: string;
  apiKey: string;
}

export interface LiteLLMConfig extends BaseProviderConfig {
  type: ProviderType.LITELM;
  baseURL: string;
  apiKey: string;
}

export interface ClaudeCodeConfig extends BaseProviderConfig {
  type: ProviderType.CLAUDE_CODE;
  apiKey: string;
}

export interface SAPAICoreConfig extends BaseProviderConfig {
  type: ProviderType.SAP_AI_CORE;
  apiKey: string;
  resourceGroup: string;
}

export interface MistralConfig extends BaseProviderConfig {
  type: ProviderType.MISTRAL;
  apiKey: string;
}

export interface ZAIConfig extends BaseProviderConfig {
  type: ProviderType.Z_AI;
  apiKey: string;
}

export interface GroqConfig extends BaseProviderConfig {
  type: ProviderType.GROQ;
  apiKey: string;
}

export interface CerebrasConfig extends BaseProviderConfig {
  type: ProviderType.CEREBRAS;
  apiKey: string;
}

export interface VercelAIGatewayConfig extends BaseProviderConfig {
  type: ProviderType.VERCEL_AI_GATEWAY;
  apiKey: string;
}

export interface BasetenConfig extends BaseProviderConfig {
  type: ProviderType.BASETEN;
  apiKey: string;
}

export interface RequestyConfig extends BaseProviderConfig {
  type: ProviderType.REQUESTY;
  apiKey: string;
}

export interface FireworksAIConfig extends BaseProviderConfig {
  type: ProviderType.FIREWORKS_AI;
  apiKey: string;
}

export interface TogetherConfig extends BaseProviderConfig {
  type: ProviderType.TOGETHER;
  apiKey: string;
}

export interface AlibabaQwenConfig extends BaseProviderConfig {
  type: ProviderType.ALIBABA_QWEN;
  apiKey: string;
}

export interface BytedanceDoubaoConfig extends BaseProviderConfig {
  type: ProviderType.BYTEDANCE_DOUBAO;
  apiKey: string;
}

export interface LMStudioConfig extends BaseProviderConfig {
  type: ProviderType.LM_STUDIO;
  baseURL: string;
}

export interface MoonshotConfig extends BaseProviderConfig {
  type: ProviderType.MOONSHOT;
  apiKey: string;
}

export interface HuggingFaceConfig extends BaseProviderConfig {
  type: ProviderType.HUGGING_FACE;
  apiKey: string;
}

export interface NebiusAIStudioConfig extends BaseProviderConfig {
  type: ProviderType.NEBIUS_AI_STUDIO;
  apiKey: string;
}

export interface AskSageConfig extends BaseProviderConfig {
  type: ProviderType.ASK_SAGE;
  apiKey: string;
}

export interface XAIConfig extends BaseProviderConfig {
  type: ProviderType.XAI;
  apiKey: string;
}

export interface SambaNovaConfig extends BaseProviderConfig {
  type: ProviderType.SAMBANOVA;
  apiKey: string;
}

export interface DifyAIConfig extends BaseProviderConfig {
  type: ProviderType.DIFY_AI;
  apiKey: string;
  baseURL: string;
}

export interface OracleCodeAssistConfig extends BaseProviderConfig {
  type: ProviderType.ORACLE_CODE_ASSIST;
  apiKey: string;
}

export interface MiniMaxConfig extends BaseProviderConfig {
  type: ProviderType.MINIMAX;
  apiKey: string;
  groupId: string;
}

export interface HicapConfig extends BaseProviderConfig {
  type: ProviderType.HICAP;
  apiKey: string;
}

export interface AIhubmixConfig extends BaseProviderConfig {
  type: ProviderType.AIHUBMIX;
  apiKey: string;
}

export interface NousResearchConfig extends BaseProviderConfig {
  type: ProviderType.NOUS_RESEARCH;
  apiKey: string;
}

export type ProviderConfig =
  | ElaraFreeConfig
  | ClineConfig
  | OpenRouterConfig
  | GoogleGeminiConfig
  | OpenAICompatibleConfig
  | AnthropicConfig
  | AmazonBedrockConfig
  | DeepSeekConfig
  | OpenAIConfig
  | OllamaConfig
  | GCPVertexAIConfig
  | LiteLLMConfig
  | ClaudeCodeConfig
  | SAPAICoreConfig
  | MistralConfig
  | ZAIConfig
  | GroqConfig
  | CerebrasConfig
  | VercelAIGatewayConfig
  | BasetenConfig
  | RequestyConfig
  | FireworksAIConfig
  | TogetherConfig
  | AlibabaQwenConfig
  | BytedanceDoubaoConfig
  | LMStudioConfig
  | MoonshotConfig
  | HuggingFaceConfig
  | NebiusAIStudioConfig
  | AskSageConfig
  | XAIConfig
  | SambaNovaConfig
  | DifyAIConfig
  | OracleCodeAssistConfig
  | MiniMaxConfig
  | HicapConfig
  | AIhubmixConfig
  | NousResearchConfig;

export interface ProviderMetadata {
  type: ProviderType;
  name: string;
  description: string;
  category: 'free' | 'paid' | 'self-hosted' | 'enterprise';
  logo?: string;
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  modelFetchStrategy: 'static' | 'dynamic' | 'manual';
}
