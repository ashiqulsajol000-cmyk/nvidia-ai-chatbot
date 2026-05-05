export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export function getApiKey(customKey?: string): string {
  if (customKey) return customKey;
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

export const VISION_MODELS = [
  "microsoft/kosmos-2",
  "nvidia/neva-22b",
  "microsoft/phi-4-multimodal-instruct",
  "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
  "nvidia/nemotron-nano-12b-v2-vl",
];

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

export const DEFAULT_PROMPT_TEMPLATES = [
  { id: "explain", name: "Explain Concept", icon: "💡", prompt: "Explain {topic} in simple terms with examples." },
  { id: "code", name: "Write Code", icon: "💻", prompt: "Write a {language} function that {task}. Include comments and error handling." },
  { id: "debug", name: "Debug Code", icon: "🐛", prompt: "Debug the following code and explain what's wrong:\n\n{code}" },
  { id: "review", name: "Code Review", icon: "🔍", prompt: "Review this code for best practices, performance, and security:\n\n{code}" },
  { id: "translate", name: "Translate Code", icon: "🔄", prompt: "Translate the following code from {from_language} to {to_language}:\n\n{code}" },
  { id: "summarize", name: "Summarize", icon: "📋", prompt: "Summarize the following text in bullet points:\n\n{text}" },
  { id: "compare", name: "Compare", icon: "⚖️", prompt: "Compare {item1} and {item2}. Include pros, cons, and when to use each." },
  { id: "optimize", name: "Optimize Code", icon: "⚡", prompt: "Optimize this code for better performance:\n\n{code}" },
];
