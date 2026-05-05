"use client";

import { useState } from "react";
import type { AppSettings, ApiKeyConfig } from "@/lib/types";

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  activeApiKey?: ApiKeyConfig;
  theme: "dark" | "light";
}

export default function SettingsPanel({ settings, onUpdate, theme }: SettingsPanelProps) {
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [showAddKey, setShowAddKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "apikeys" | "system">("general");

  const isDark = theme === "dark";
  const bg = isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200";
  const textMuted = isDark ? "text-zinc-400" : "text-gray-500";
  const textPrimary = isDark ? "text-zinc-200" : "text-gray-800";
  const inputBg = isDark ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-gray-50 border-gray-300 text-gray-800";

  const addApiKey = () => {
    if (!newKeyName || !newKeyValue) return;
    const newKey: ApiKeyConfig = {
      id: crypto.randomUUID(),
      name: newKeyName,
      key: newKeyValue,
      isActive: settings.apiKeys.length === 0,
    };
    const keys = [...settings.apiKeys, newKey];
    onUpdate({
      apiKeys: keys,
      activeApiKeyId: keys.length === 1 ? newKey.id : settings.activeApiKeyId,
    });
    setNewKeyName("");
    setNewKeyValue("");
    setShowAddKey(false);
  };

  const removeApiKey = (id: string) => {
    const keys = settings.apiKeys.filter((k) => k.id !== id);
    onUpdate({
      apiKeys: keys,
      activeApiKeyId: settings.activeApiKeyId === id
        ? (keys.length > 0 ? keys[0].id : null)
        : settings.activeApiKeyId,
    });
  };

  const setActiveKey = (id: string) => {
    onUpdate({ activeApiKeyId: id });
  };

  const tabs = [
    { id: "general" as const, label: "General" },
    { id: "apikeys" as const, label: "API Keys" },
    { id: "system" as const, label: "System Prompt" },
  ];

  return (
    <div className={`absolute right-0 top-full mt-2 w-80 ${bg} border rounded-xl shadow-2xl z-50 overflow-hidden`}>
      {/* Tabs */}
      <div className={`flex border-b ${isDark ? "border-zinc-700" : "border-gray-200"}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : `${textMuted} hover:${textPrimary}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {activeTab === "general" && (
          <>
            <div>
              <label className={`flex items-center justify-between text-xs ${textMuted} mb-1.5`}>
                <span>Temperature</span>
                <span className="text-emerald-400 font-mono">{settings.temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className={`flex items-center justify-between text-xs ${textMuted} mb-1.5`}>
                <span>Max Tokens</span>
                <span className="text-emerald-400 font-mono">{settings.maxTokens}</span>
              </label>
              <input
                type="range"
                min="128"
                max="4096"
                step="128"
                value={settings.maxTokens}
                onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </>
        )}

        {activeTab === "apikeys" && (
          <>
            <p className={`text-xs ${textMuted}`}>
              Add multiple NVIDIA API keys and switch between them when one hits its limit.
            </p>

            {settings.apiKeys.map((key) => (
              <div
                key={key.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  settings.activeApiKeyId === key.id
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : isDark ? "border-zinc-700" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() => setActiveKey(key.id)}
                  className={`w-3 h-3 rounded-full border-2 ${
                    settings.activeApiKeyId === key.id
                      ? "border-emerald-400 bg-emerald-400"
                      : isDark ? "border-zinc-500" : "border-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium truncate ${textPrimary}`}>{key.name}</div>
                  <div className={`text-[10px] ${textMuted} font-mono`}>
                    {key.key.slice(0, 12)}...{key.key.slice(-4)}
                  </div>
                </div>
                <button
                  onClick={() => removeApiKey(key.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {settings.apiKeys.length === 0 && !showAddKey && (
              <div className={`text-xs text-center py-4 ${textMuted}`}>
                Using server default API key.
                <br />Add your own keys to switch between accounts.
              </div>
            )}

            {showAddKey ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Key name (e.g. Account 1)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500`}
                />
                <input
                  type="password"
                  placeholder="nvapi-..."
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addApiKey}
                    disabled={!newKeyName || !newKeyValue}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-xs py-1.5 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddKey(false)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                      isDark ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddKey(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 py-2 border border-dashed border-emerald-500/30 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add API Key
              </button>
            )}
          </>
        )}

        {activeTab === "system" && (
          <>
            <p className={`text-xs ${textMuted}`}>
              Set a system prompt that will be prepended to all conversations.
            </p>
            <textarea
              value={settings.systemPrompt}
              onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
              placeholder="You are a helpful assistant..."
              rows={6}
              className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-emerald-500`}
            />
            {settings.systemPrompt && (
              <button
                onClick={() => onUpdate({ systemPrompt: "" })}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear system prompt
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
