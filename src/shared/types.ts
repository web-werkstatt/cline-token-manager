export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: number;
  model: string;
  cost?: number;
  taskId?: string;
  provider?: string;
}

export interface ContextWindow {
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  messages: ContextMessage[];
}

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens: number;
  timestamp: number;
  id: string;
}

export interface ApiProvider {
  name: string;
  makeRequest(messages: ContextMessage[], config: ApiConfig): Promise<ApiResponse>;
  countTokens(text: string): Promise<number>;
}

export interface ApiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface ApiResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  finishReason?: string;
}

export interface ClineConfig {
  apiProvider: 'anthropic' | 'openai' | 'custom';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  contextWindowSize?: number;
  temperature?: number;
  customEndpoint?: string;
  tokenManagement?: {
    maxTokensPerMessage?: number;
    preserveSystemPrompt?: boolean;
    compressionStrategy?: 'truncate' | 'summarize' | 'selective';
  };
  costTracking?: {
    enabled?: boolean;
    warningThreshold?: number;
    currency?: string;
  };
}

export interface ExtensionConfig extends ClineConfig {
  customConfigPath?: string;
  enableTokenTracking?: boolean;
  topP?: number;
  stopSequences?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tokenUsage: TokenUsage[];
  title?: string;
}