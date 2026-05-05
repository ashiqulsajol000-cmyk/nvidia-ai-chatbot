"use client";

import { useState } from "react";
import type { AppSettings, PromptTemplate } from "@/lib/types";
import { DEFAULT_PROMPT_TEMPLATES } from "@/lib/nvidia";

interface PromptTemplatesProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onUseTemplate: (prompt: string) => void;
  theme: "dark" | "light";
}

export default function PromptTemplates({ settings, onUpdate, onUseTemplate, theme }: PromptTemplatesProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const isDark = theme === "dark";
  const bg = isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-gray-50/50 border-gray-200";
  const cardBg = isDark ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600" : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300";
  const textMuted = isDark ? "text-zinc-400" : "text-gray-500";
  const inputBg = isDark ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-white border-gray-300 text-gray-800";

  const allTemplates: PromptTemplate[] = [
    ...DEFAULT_PROMPT_TEMPLATES,
    ...settings.customTemplates,
  ];

  const addTemplate = () => {
    if (!newName || !newPrompt) return;
    const template: PromptTemplate = {
      id: crypto.randomUUID(),
      name: newName,
      icon: "📌",
      prompt: newPrompt,
      isCustom: true,
    };
    onUpdate({ customTemplates: [...settings.customTemplates, template] });
    setNewName("");
    setNewPrompt("");
    setShowAdd(false);
  };

  const removeTemplate = (id: string) => {
    onUpdate({
      customTemplates: settings.customTemplates.filter((t) => t.id !== id),
    });
  };

  return (
    <div className={`border-b ${bg} px-4 py-3`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Prompt Templates</h3>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Custom
          </button>
        </div>

        {showAdd && (
          <div className="mb-3 space-y-2">
            <input
              type="text"
              placeholder="Template name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500`}
            />
            <textarea
              placeholder="Template prompt... Use {placeholder} for variables"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              rows={3}
              className={`w-full ${inputBg} border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-emerald-500`}
            />
            <div className="flex gap-2">
              <button
                onClick={addTemplate}
                disabled={!newName || !newPrompt}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg"
              >
                Save
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-600"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allTemplates.map((template) => (
            <div
              key={template.id}
              className={`group relative p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${cardBg}`}
              onClick={() => onUseTemplate(template.prompt)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span>{template.icon}</span>
                <span className="font-medium truncate">{template.name}</span>
              </div>
              <p className={`${textMuted} text-[10px] line-clamp-2`}>
                {template.prompt}
              </p>
              {template.isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTemplate(template.id);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
