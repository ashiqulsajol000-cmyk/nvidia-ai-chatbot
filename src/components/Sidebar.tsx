"use client";

import { useRef } from "react";

interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  pinned?: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onExport: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onClearAll: () => void;
  onExportAll: () => void;
  onImport: (data: string) => void;
  theme: "dark" | "light";
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onPin,
  onExport,
  isOpen,
  onToggle,
  searchQuery,
  onSearch,
  onClearAll,
  onExportAll,
  onImport,
  theme,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === "dark";

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") onImport(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 border-r flex flex-col transition-transform duration-300 ${
          isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden"
        }`}
      >
        <div className={`p-4 border-b ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 px-4 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>

          {/* Search */}
          <div className="mt-3 relative">
            <svg className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-zinc-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 border ${
                isDark
                  ? "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500"
                  : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
              }`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
              {searchQuery ? "No matching conversations" : "No conversations yet"}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  conv.id === activeId
                    ? isDark ? "bg-zinc-800 text-white" : "bg-gray-100 text-gray-900"
                    : isDark ? "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
                onClick={() => onSelect(conv.id)}
              >
                {conv.pinned && (
                  <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
                <svg className={`w-4 h-4 shrink-0 ${conv.pinned ? "hidden" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{conv.title}</div>
                  <div className={`text-[10px] truncate font-mono ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
                    {conv.model.split("/").pop()}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); onPin(conv.id); }}
                    title={conv.pinned ? "Unpin" : "Pin"}
                    className={`p-1 transition-colors ${
                      conv.pinned ? "text-amber-400" : isDark ? "text-zinc-500 hover:text-amber-400" : "text-gray-400 hover:text-amber-500"
                    }`}
                  >
                    <svg className="w-3 h-3" fill={conv.pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onExport(conv.id); }}
                    title="Export as Markdown"
                    className={`p-1 transition-colors ${isDark ? "text-zinc-500 hover:text-zinc-300" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                    title="Delete"
                    className={`p-1 transition-colors ${isDark ? "text-zinc-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with memory management */}
        <div className={`p-3 border-t space-y-2 ${isDark ? "border-zinc-800" : "border-gray-200"}`}>
          <div className="flex gap-2">
            <button
              onClick={onExportAll}
              title="Export all conversations"
              className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import conversations"
              className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] py-1.5 rounded-lg border transition-colors ${
                isDark
                  ? "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0L16 8m4-4v12" />
              </svg>
              Restore
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            {conversations.length > 0 && (
              <button
                onClick={onClearAll}
                title="Clear all conversations"
                className={`flex items-center justify-center gap-1.5 text-[10px] py-1.5 px-3 rounded-lg border transition-colors ${
                  isDark
                    ? "border-red-900/50 text-red-400 hover:bg-red-900/20"
                    : "border-red-200 text-red-500 hover:bg-red-50"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                All
              </button>
            )}
          </div>

          <div className={`flex items-center gap-2 text-xs ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
            <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            Powered by NVIDIA NIM
          </div>
        </div>
      </aside>
    </>
  );
}
