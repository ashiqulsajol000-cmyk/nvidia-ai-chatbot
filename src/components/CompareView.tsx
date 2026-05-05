"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import type { ModelInfo, AppSettings } from "@/lib/types";

interface CompareViewProps {
  models: ModelInfo[];
  compareModels: [string, string];
  onChangeModels: (models: [string, string]) => void;
  settings: AppSettings;
  getActiveApiKey: () => string | undefined;
  onExit: () => void;
  theme: "dark" | "light";
}

interface CompareResponse {
  content: string;
  isStreaming: boolean;
  tokenCount: number;
  error?: string;
}

export default function CompareView({
  models,
  compareModels,
  onChangeModels,
  settings,
  getActiveApiKey,
  onExit,
  theme,
}: CompareViewProps) {
  const [prompt, setPrompt] = useState("");
  const [responses, setResponses] = useState<[CompareResponse, CompareResponse]>([
    { content: "", isStreaming: false, tokenCount: 0 },
    { content: "", isStreaming: false, tokenCount: 0 },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const streamModel = async (modelId: string, idx: 0 | 1, promptText: string) => {
    setResponses((prev) => {
      const next = [...prev] as [CompareResponse, CompareResponse];
      next[idx] = { content: "", isStreaming: true, tokenCount: 0 };
      return next;
    });

    try {
      const sysPrompt = settings.systemPrompt;
      const messages: { role: string; content: string }[] = [];
      if (sysPrompt) messages.push({ role: "system", content: sysPrompt });
      messages.push({ role: "user", content: promptText });

      const customKey = getActiveApiKey();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          model: modelId,
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
      let accumulated = "";
      let buffer = "";
      let tokens = 0;

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
              tokens++;
              accumulated += delta;
              const snapshot = accumulated;
              const tc = tokens;
              setResponses((prev) => {
                const next = [...prev] as [CompareResponse, CompareResponse];
                next[idx] = { content: snapshot, isStreaming: true, tokenCount: tc };
                return next;
              });
            }
          } catch {
            // skip
          }
        }
      }

      setResponses((prev) => {
        const next = [...prev] as [CompareResponse, CompareResponse];
        next[idx] = { ...next[idx], isStreaming: false };
        return next;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error";
      setResponses((prev) => {
        const next = [...prev] as [CompareResponse, CompareResponse];
        next[idx] = { content: `**Error:** ${msg}`, isStreaming: false, tokenCount: 0, error: msg };
        return next;
      });
    }
  };

  const handleCompare = async () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    await Promise.all([
      streamModel(compareModels[0], 0, prompt.trim()),
      streamModel(compareModels[1], 1, prompt.trim()),
    ]);
    setIsRunning(false);
  };

  const getModelName = (id: string) => id.split("/").pop() || id;

  return (
    <div className={`flex flex-col h-screen ${isDark ? "bg-zinc-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <header className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? "border-zinc-800 bg-zinc-900/80" : "border-gray-200 bg-white/80"} backdrop-blur-sm`}>
        <button
          onClick={onExit}
          className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h1 className="text-lg font-semibold">Compare Models</h1>
        </div>
      </header>

      {/* Model selectors */}
      <div className={`flex gap-4 px-4 py-3 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
        {[0, 1].map((idx) => (
          <div key={idx} className="flex-1">
            <label className={`text-xs ${isDark ? "text-zinc-400" : "text-gray-500"} mb-1 block`}>
              Model {idx + 1}
            </label>
            <select
              value={compareModels[idx]}
              onChange={(e) => {
                const next = [...compareModels] as [string, string];
                next[idx] = e.target.value;
                onChangeModels(next);
              }}
              className={`w-full text-sm rounded-lg px-3 py-2 border focus:outline-none focus:border-emerald-500 ${
                isDark ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {getModelName(m.id)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Responses */}
      <div className="flex-1 flex overflow-hidden">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className={`flex-1 overflow-y-auto p-4 ${idx === 0 ? `border-r ${isDark ? "border-zinc-800" : "border-gray-200"}` : ""}`}
          >
            <div className={`text-xs font-mono mb-3 px-2 py-1 rounded ${isDark ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"}`}>
              {getModelName(compareModels[idx])}
              {responses[idx].tokenCount > 0 && (
                <span className={`ml-2 ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                  ~{responses[idx].tokenCount} tokens
                </span>
              )}
            </div>
            {responses[idx].content ? (
              <ChatMessage
                role="assistant"
                content={responses[idx].content}
                model={compareModels[idx]}
                theme={theme}
              />
            ) : responses[idx].isStreaming ? (
              <div className="flex gap-1.5 px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            ) : (
              <div className={`text-center py-12 text-sm ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                Send a prompt to compare
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className={`border-t ${isDark ? "border-zinc-800 bg-zinc-900/80" : "border-gray-200 bg-white/80"} backdrop-blur-sm px-4 py-4`}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCompare();
              }
            }}
            placeholder="Enter a prompt to compare both models..."
            rows={1}
            disabled={isRunning}
            className={`flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 border ${
              isDark ? "bg-zinc-800 border-zinc-600 text-zinc-100 placeholder-zinc-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
            } disabled:opacity-50`}
          />
          <button
            onClick={handleCompare}
            disabled={isRunning || !prompt.trim()}
            className="px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium text-sm transition-all"
          >
            {isRunning ? "Comparing..." : "Compare"}
          </button>
        </div>
      </div>
    </div>
  );
}
