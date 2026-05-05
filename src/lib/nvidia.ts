export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }
  return key;
}

export interface NvidiaModel {
  id: string;
  object: string;
  owned_by: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const FREE_MODELS: NvidiaModel[] = [
  { id: "meta/llama-3.1-8b-instruct", object: "model", owned_by: "meta" },
  { id: "meta/llama-3.1-70b-instruct", object: "model", owned_by: "meta" },
  { id: "meta/llama-3.1-405b-instruct", object: "model", owned_by: "meta" },
  { id: "meta/llama-3.2-1b-instruct", object: "model", owned_by: "meta" },
  { id: "meta/llama-3.2-3b-instruct", object: "model", owned_by: "meta" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", object: "model", owned_by: "nvidia" },
  { id: "google/gemma-2-2b-it", object: "model", owned_by: "google" },
  { id: "google/gemma-2-9b-it", object: "model", owned_by: "google" },
  { id: "google/gemma-2-27b-it", object: "model", owned_by: "google" },
  { id: "mistralai/mistral-7b-instruct-v0.3", object: "model", owned_by: "mistralai" },
  { id: "mistralai/mixtral-8x7b-instruct-v0.1", object: "model", owned_by: "mistralai" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1", object: "model", owned_by: "mistralai" },
  { id: "mistralai/mistral-large-2-instruct", object: "model", owned_by: "mistralai" },
  { id: "microsoft/phi-3-mini-128k-instruct", object: "model", owned_by: "microsoft" },
  { id: "microsoft/phi-3-small-128k-instruct", object: "model", owned_by: "microsoft" },
  { id: "microsoft/phi-3-medium-128k-instruct", object: "model", owned_by: "microsoft" },
  { id: "qwen/qwen2-7b-instruct", object: "model", owned_by: "qwen" },
  { id: "deepseek-ai/deepseek-coder-6.7b-instruct", object: "model", owned_by: "deepseek-ai" },
  { id: "nvidia/nemotron-4-340b-instruct", object: "model", owned_by: "nvidia" },
  { id: "nvidia/usdcode-llama3.1-70b-instruct", object: "model", owned_by: "nvidia" },
];
