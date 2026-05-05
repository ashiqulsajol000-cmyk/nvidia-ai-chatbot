"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface ModelInfo {
  id: string;
  owned_by: string;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (model: string) => void;
  loading: boolean;
  favoriteModels?: string[];
  onToggleFavorite?: (modelId: string) => void;
  theme?: "dark" | "light";
}

function getProvider(id: string): string {
  return id.split("/")[0] || "other";
}

function getModelDisplayName(id: string): string {
  return id.split("/").pop() || id;
}

function getProviderColor(provider: string): string {
  const colors: Record<string, string> = {
    meta: "text-blue-400 border-blue-400/30",
    google: "text-red-400 border-red-400/30",
    mistralai: "text-orange-400 border-orange-400/30",
    microsoft: "text-cyan-400 border-cyan-400/30",
    nvidia: "text-emerald-400 border-emerald-400/30",
    "deepseek-ai": "text-purple-400 border-purple-400/30",
    qwen: "text-yellow-400 border-yellow-400/30",
    abacusai: "text-pink-400 border-pink-400/30",
    adept: "text-indigo-400 border-indigo-400/30",
    writer: "text-lime-400 border-lime-400/30",
  };
  return colors[provider] || "text-zinc-400 border-zinc-400/30";
}

export default function ModelSelector({
  models,
  selectedModel,
  onSelect,
  loading,
  favoriteModels = [],
  onToggleFavorite,
  theme = "dark",
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const m of models) {
      const p = getProvider(m.id);
      if (!map.has(p)) map.set(p, []);
      map.get(p)!.push(m);
    }
    return map;
  }, [models]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    const entries: [string, ModelInfo[]][] = [];
    for (const [provider, items] of grouped) {
      const filtered = items.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          provider.toLowerCase().includes(q)
      );
      if (filtered.length > 0) entries.push([provider, filtered]);
    }
    return entries;
  }, [grouped, search]);

  const isFavorite = (id: string) => favoriteModels.includes(id);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors max-w-[280px] ${
          isDark
            ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
        }`}
      >
        <span className="truncate">
          {loading ? "Loading models..." : getModelDisplayName(selectedModel)}
        </span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute top-full mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden border ${
          isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
        }`}>
          <div className="p-3">
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
                isDark
                  ? "bg-zinc-800 border-zinc-600 text-zinc-200 placeholder-zinc-500"
                  : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400"
              }`}
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Favorites section */}
            {favoriteModels.length > 0 && !search && (
              <div className="px-3 py-1.5">
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Favorites
                </div>
                {favoriteModels.map((favId, idx) => {
                  const m = models.find((model) => model.id === favId);
                  if (!m) return null;
                  const provider = getProvider(m.id);
                  return (
                    <button
                      key={`fav-${favId}-${idx}`}
                      onClick={() => {
                        onSelect(m.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                        m.id === selectedModel
                          ? isDark ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"
                          : isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{getModelDisplayName(m.id)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getProviderColor(provider)}`}>
                        {provider}
                      </span>
                    </button>
                  );
                })}
                <div className={`border-b my-1 ${isDark ? "border-zinc-800" : "border-gray-100"}`} />
              </div>
            )}

            {filteredGroups.map(([provider, providerModels]) => (
              <div key={provider} className="px-3 py-1.5">
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                  {provider}
                </div>
                {providerModels.map((m, idx) => (
                  <div
                    key={`${m.id}-${idx}`}
                    className={`flex items-center w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      m.id === selectedModel
                        ? isDark ? "bg-zinc-800 text-emerald-400" : "bg-gray-100 text-emerald-600"
                        : isDark ? "text-zinc-300 hover:bg-zinc-800" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(m.id);
                        }}
                        className={`mr-2 shrink-0 ${
                          isFavorite(m.id) ? "text-amber-400" : isDark ? "text-zinc-600 hover:text-amber-400" : "text-gray-300 hover:text-amber-500"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill={isFavorite(m.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="flex-1 flex items-center justify-between min-w-0"
                      onClick={() => {
                        onSelect(m.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="truncate">{getModelDisplayName(m.id)}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getProviderColor(provider)}`}>
                        {provider}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <div className={`px-4 py-8 text-center text-sm ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                No models found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
