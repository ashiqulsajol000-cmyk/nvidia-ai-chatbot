"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ModelSelector from "./ModelSelector";
import Sidebar from "./Sidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  createdAt: number;
}

interface ModelInfo {
  id: string;
  owned_by: string;
}

const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

export default function Chat() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const messages = useMemo(
    () => activeConversation?.messages || [],
    [activeConversation?.messages]
  );

  const [initialized, setInitialized] = useState(false);

  if (!initialized) {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nvidia-chatbot-conversations");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setConversations(parsed);
          if (parsed.length > 0) setActiveConvId(parsed[0].id);
        } catch {
          // ignore parse errors
        }
      }
    }
    setInitialized(true);
  }

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        "nvidia-chatbot-conversations",
        JSON.stringify(conversations)
      );
    }
  }, [conversations]);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/models");
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const chatModels = data.data.filter(
            (m: ModelInfo) =>
              !m.id.includes("embed") &&
              !m.id.includes("rerank") &&
              !m.id.includes("vision") &&
              !m.id.includes("audio") &&
              !m.id.includes("grounding")
          );
          setModels(
            chatModels.length > 0
              ? chatModels
              : data.data
          );
        }
      } catch {
        // fallback models are already set in the API
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createConversation = useCallback(
    (firstMessage: string): string => {
      const id = crypto.randomUUID();
      const title =
        firstMessage.length > 40
          ? firstMessage.slice(0, 40) + "..."
          : firstMessage;
      const conv: Conversation = {
        id,
        title,
        model: selectedModel,
        messages: [],
        createdAt: Date.now(),
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(id);
      return id;
    },
    [selectedModel]
  );

  const handleSend = async (content: string) => {
    const convId = activeConvId || createConversation(content);

    const userMessage: Message = { role: "user", content };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage] }
          : c
      )
    );

    setIsStreaming(true);

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      model: selectedModel,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, assistantMessage] }
          : c
      )
    );

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const allMessages = [
        ...(currentConv?.messages || []),
        userMessage,
      ].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          model: selectedModel,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      const accumulatedRef = { current: "" };
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedRef.current += delta;
              const snapshot = accumulatedRef.current;
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  const msgs = [...c.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === "assistant") {
                    msgs[msgs.length - 1] = {
                      ...lastMsg,
                      content: snapshot,
                    };
                  }
                  return { ...c, messages: msgs };
                })
              );
            }
          } catch {
            // skip malformed data
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const msgs = [...c.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...lastMsg,
              content: `**Error:** ${errorMessage}`,
            };
          }
          return { ...c, messages: msgs };
        })
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <Sidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => {
          setActiveConvId(id);
          setSidebarOpen(false);
        }}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold hidden sm:block">NVIDIA AI Chat</h1>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              loading={modelsLoading}
            />
          </div>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-200">Settings</h3>
                <div>
                  <label className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Temperature</span>
                    <span className="text-emerald-400 font-mono">{temperature}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Max Tokens</span>
                    <span className="text-emerald-400 font-mono">{maxTokens}</span>
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="4096"
                    step="128"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                NVIDIA AI Chat
              </h2>
              <p className="text-zinc-400 text-center max-w-md mb-8">
                Test all free NVIDIA NIM models. Select a model from the dropdown
                above and start chatting.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  { icon: "💡", text: "Explain quantum computing in simple terms" },
                  { icon: "📝", text: "Write a Python function to sort a list" },
                  { icon: "🔍", text: "What are the differences between REST and GraphQL?" },
                  { icon: "🎨", text: "Help me design a database schema for an e-commerce app" },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => handleSend(suggestion.text)}
                    disabled={isStreaming}
                    className="text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-sm text-zinc-300 disabled:opacity-50"
                  >
                    <span className="mr-2">{suggestion.icon}</span>
                    {suggestion.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  model={msg.model}
                />
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                      AI
                    </div>
                    <div className="bg-zinc-800 rounded-2xl rounded-bl-sm border border-zinc-700 px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isStreaming} />
            <p className="text-center text-[10px] text-zinc-600 mt-2">
              Powered by NVIDIA NIM API &middot; Responses may be inaccurate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
