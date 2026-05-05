"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ModelSelector from "./ModelSelector";
import Sidebar from "./Sidebar";
import SettingsPanel from "./SettingsPanel";
import PromptTemplates from "./PromptTemplates";
import CompareView from "./CompareView";
import type { Message, Conversation, ModelInfo, AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";

const DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";

function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem("nvidia-chatbot-settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function loadConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem("nvidia-chatbot-conversations");
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

export default function Chat() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    const convs = loadConversations();
    return convs.length > 0 ? convs[0].id : null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareModels, setCompareModels] = useState<[string, string]>([DEFAULT_MODEL, "google/gemma-2-2b-it"]);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId);
  const messages = useMemo(
    () => activeConversation?.messages || [],
    [activeConversation?.messages]
  );

  // Persist conversations
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(
        "nvidia-chatbot-conversations",
        JSON.stringify(conversations)
      );
    } else {
      localStorage.removeItem("nvidia-chatbot-conversations");
    }
  }, [conversations]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem("nvidia-chatbot-settings", JSON.stringify(settings));
  }, [settings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("light", settings.theme === "light");
    document.documentElement.classList.toggle("dark", settings.theme !== "light");
  }, [settings.theme]);

  // Get active API key
  const getActiveApiKey = useCallback((): string | undefined => {
    if (settings.activeApiKeyId) {
      const key = settings.apiKeys.find((k) => k.id === settings.activeApiKeyId);
      if (key) return key.key;
    }
    return undefined;
  }, [settings.apiKeys, settings.activeApiKeyId]);

  // Fetch models
  useEffect(() => {
    async function fetchModels() {
      try {
        const customKey = getActiveApiKey();
        const url = customKey ? `/api/models?apiKey=${encodeURIComponent(customKey)}` : "/api/models";
        const res = await fetch(url);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          const chatModels = data.data.filter(
            (m: ModelInfo) =>
              !m.id.includes("embed") &&
              !m.id.includes("rerank") &&
              !m.id.includes("audio") &&
              !m.id.includes("grounding")
          );
          setModels(chatModels.length > 0 ? chatModels : data.data);
        }
      } catch {
        // fallback models are already set in the API
      } finally {
        setModelsLoading(false);
      }
    }
    fetchModels();
  }, [getActiveApiKey]);

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
        systemPrompt: settings.systemPrompt || undefined,
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(id);
      return id;
    },
    [selectedModel, settings.systemPrompt]
  );

  const handleSend = async (content: string) => {
    const convId = activeConvId || createConversation(content);

    const userMessage: Message = {
      role: "user",
      content,
    };

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

    setIsStreaming(true);

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const sysPrompt = currentConv?.systemPrompt || settings.systemPrompt;
      const allMessages: { role: string; content: string }[] = [];

      if (sysPrompt) {
        allMessages.push({ role: "system", content: sysPrompt });
      }

      allMessages.push(
        ...(currentConv?.messages || []).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content }
      );

      const customKey = getActiveApiKey();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          model: selectedModel,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          ...(customKey ? { apiKey: customKey } : {}),
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
      let tokenCount = 0;

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
            if (parsed.usage) {
              tokenCount = parsed.usage.total_tokens || parsed.usage.completion_tokens || tokenCount;
            }
            if (delta) {
              tokenCount++;
              accumulatedRef.current += delta;
              const snapshot = accumulatedRef.current;
              const tc = tokenCount;
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  const msgs = [...c.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === "assistant") {
                    msgs[msgs.length - 1] = {
                      ...lastMsg,
                      content: snapshot,
                      tokenCount: tc,
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

  const handleRegenerate = async (messageIndex: number) => {
    if (!activeConvId || isStreaming) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;

    const userMsgIndex = messageIndex - 1;
    if (userMsgIndex < 0 || conv.messages[userMsgIndex]?.role !== "user") return;

    const userContent = conv.messages[userMsgIndex].content;
    const model = conv.messages[messageIndex]?.model || selectedModel;

    // Remove the old assistant message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c;
        const msgs = c.messages.slice(0, messageIndex);
        return { ...c, messages: msgs };
      })
    );

    // Re-send with the same model
    const prevModel = selectedModel;
    setSelectedModel(model);
    await handleSend(userContent);
    setSelectedModel(prevModel);
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

  const handlePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      )
    );
  };

  const handleExportConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;

    let md = `# ${conv.title}\n\n`;
    md += `**Model:** ${conv.model}\n`;
    md += `**Date:** ${new Date(conv.createdAt).toLocaleString()}\n\n---\n\n`;

    for (const msg of conv.messages) {
      if (msg.role === "user") {
        md += `## You\n\n${msg.content}\n\n`;
      } else {
        md += `## AI (${msg.model || conv.model})\n\n${msg.content}\n\n`;
        if (msg.tokenCount) {
          md += `*Tokens: ~${msg.tokenCount}*\n\n`;
        }
      }
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    setConversations([]);
    setActiveConvId(null);
    localStorage.removeItem("nvidia-chatbot-conversations");
  };

  const handleImportConversations = (data: string) => {
    try {
      const imported = JSON.parse(data);
      if (Array.isArray(imported)) {
        setConversations((prev) => [...imported, ...prev]);
      }
    } catch {
      // invalid import
    }
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nvidia-chatbot-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const toggleFavorite = (modelId: string) => {
    setSettings((prev) => {
      const favs = prev.favoriteModels.includes(modelId)
        ? prev.favoriteModels.filter((m) => m !== modelId)
        : [...prev.favoriteModels, modelId];
      return { ...prev, favoriteModels: favs };
    });
  };

  // Sort models: favorites first
  const sortedModels = useMemo(() => {
    const favs = settings.favoriteModels;
    return [...models].sort((a, b) => {
      const aFav = favs.includes(a.id) ? 0 : 1;
      const bFav = favs.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [models, settings.favoriteModels]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Sort: pinned first
  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [filteredConversations]);

  const activeApiKey = settings.apiKeys.find((k) => k.id === settings.activeApiKeyId);

  const themeClasses = settings.theme === "light"
    ? "bg-gray-50 text-gray-900"
    : "bg-zinc-950 text-white";

  const headerClasses = settings.theme === "light"
    ? "border-gray-200 bg-white/80"
    : "border-zinc-800 bg-zinc-900/80";

  const inputAreaClasses = settings.theme === "light"
    ? "border-gray-200 bg-white/80"
    : "border-zinc-800 bg-zinc-900/80";

  if (compareMode) {
    return (
      <CompareView
        models={sortedModels}
        compareModels={compareModels}
        onChangeModels={setCompareModels}
        settings={settings}
        getActiveApiKey={getActiveApiKey}
        onExit={() => setCompareMode(false)}
        theme={settings.theme}
      />
    );
  }

  return (
    <div className={`flex h-screen ${themeClasses}`}>
      <Sidebar
        conversations={sortedConversations}
        activeId={activeConvId}
        onSelect={(id) => {
          setActiveConvId(id);
          setSidebarOpen(false);
        }}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onPin={handlePinConversation}
        onExport={handleExportConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onClearAll={handleClearAll}
        onExportAll={handleExportAll}
        onImport={handleImportConversations}
        theme={settings.theme}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`flex items-center gap-3 px-4 py-3 border-b ${headerClasses} backdrop-blur-sm`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`lg:hidden p-1.5 rounded-lg transition-colors ${
              settings.theme === "light"
                ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
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
              models={sortedModels}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              loading={modelsLoading}
              favoriteModels={settings.favoriteModels}
              onToggleFavorite={toggleFavorite}
              theme={settings.theme}
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Compare mode toggle */}
            <button
              onClick={() => setCompareMode(true)}
              title="Compare Models"
              className={`p-2 rounded-lg transition-colors ${
                settings.theme === "light"
                  ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>

            {/* Templates toggle */}
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              title="Prompt Templates"
              className={`p-2 rounded-lg transition-colors ${
                showTemplates ? "text-emerald-400" : ""
              } ${
                settings.theme === "light"
                  ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
              title={settings.theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className={`p-2 rounded-lg transition-colors ${
                settings.theme === "light"
                  ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {settings.theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Settings */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  settings.theme === "light"
                    ? "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <SettingsPanel
                  settings={settings}
                  onUpdate={updateSettings}
                  activeApiKey={activeApiKey}
                  theme={settings.theme}
                />
              )}
            </div>
          </div>

          {activeApiKey && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {activeApiKey.name}
            </div>
          )}
        </header>

        {/* Templates panel */}
        {showTemplates && (
          <PromptTemplates
            settings={settings}
            onUpdate={updateSettings}
            onUseTemplate={(prompt) => {
              handleSend(prompt);
              setShowTemplates(false);
            }}
            theme={settings.theme}
          />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">NVIDIA AI Chat</h2>
              <p className={`text-center max-w-md mb-8 ${settings.theme === "light" ? "text-gray-500" : "text-zinc-400"}`}>
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
                    className={`text-left p-3.5 rounded-xl border transition-all text-sm disabled:opacity-50 ${
                      settings.theme === "light"
                        ? "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700"
                        : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300"
                    }`}
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
                  tokenCount={msg.tokenCount}
                  onRegenerate={
                    msg.role === "assistant" && !isStreaming
                      ? () => handleRegenerate(i)
                      : undefined
                  }
                  theme={settings.theme}
                />
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                      AI
                    </div>
                    <div className={`rounded-2xl rounded-bl-sm border px-4 py-3 ${
                      settings.theme === "light"
                        ? "bg-white border-gray-200"
                        : "bg-zinc-800 border-zinc-700"
                    }`}>
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
        <div className={`border-t ${inputAreaClasses} backdrop-blur-sm px-4 py-4`}>
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isStreaming} theme={settings.theme} />
            <p className={`text-center text-[10px] mt-2 ${settings.theme === "light" ? "text-gray-400" : "text-zinc-600"}`}>
              Powered by NVIDIA NIM API &middot; Responses may be inaccurate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
