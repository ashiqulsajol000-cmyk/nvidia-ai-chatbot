export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokenCount?: number;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
  pinned?: boolean;
  systemPrompt?: string;
}

export interface ModelInfo {
  id: string;
  owned_by: string;
}

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  isCustom?: boolean;
}

export interface AppSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  theme: "dark" | "light";
  apiKeys: ApiKeyConfig[];
  activeApiKeyId: string | null;
  favoriteModels: string[];
  customTemplates: PromptTemplate[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: "",
  theme: "dark",
  apiKeys: [],
  activeApiKeyId: null,
  favoriteModels: [],
  customTemplates: [],
};
