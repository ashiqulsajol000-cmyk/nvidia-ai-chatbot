"use client";

import { useState, useRef, useEffect } from "react";

interface Model {
  id: string;
  owned_by: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  loading: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  meta: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  google: "bg-red-500/20 text-red-300 border-red-500/30",
  mistralai: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  microsoft: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  nvidia: "bg-green-500/20 text-green-300 border-green-500/30",
  qwen: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "deepseek-ai": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
}

function getModelDisplayName(id: string): string {
  return id.split("/").pop() || id;
}

export default function ModelSelector({
  models,
  selectedModel,
  onSelect,
  loading,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const grouped = models.reduce<Record<string, Model[]>>((acc, m) => {
    const provider = m.owned_by || m.id.split("/")[0];
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(m);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped)
    .map(([provider, providerModels]) => ({
      provider,
      models: providerModels.filter((m) =>
        m.id.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g) => g.models.length > 0)
    .sort((a, b) => a.provider.localeCompare(b.provider));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-xl px-4 py-2.5 text-sm text-zinc-200 transition-all disabled:opacity-50 min-w-[200px] max-w-[400px]"
      >
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="truncate font-medium">
          {loading ? "Loading models..." : getModelDisplayName(selectedModel)}
        </span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[380px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-700">
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {filteredGroups.map(({ provider, models: providerModels }) => (
              <div key={provider}>
                <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-800/50 sticky top-0">
                  {provider}
                </div>
                {providerModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelect(m.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                      m.id === selectedModel ? "bg-zinc-800 text-emerald-400" : "text-zinc-300"
                    }`}
                  >
                    <span className="truncate">{getModelDisplayName(m.id)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getProviderColor(provider)}`}>
                      {provider}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
