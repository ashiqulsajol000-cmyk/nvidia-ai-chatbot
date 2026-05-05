"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  theme?: "dark" | "light";
}

export default function ChatInput({ onSend, disabled, theme = "dark" }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`flex items-end gap-3 border rounded-2xl px-4 py-3 transition-all ${
      isDark
        ? "bg-zinc-800 border-zinc-600 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
        : "bg-white border-gray-300 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
    }`}>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Shift+Enter for new line)"
        disabled={disabled}
        rows={1}
        className={`flex-1 bg-transparent resize-none focus:outline-none text-sm leading-relaxed disabled:opacity-50 max-h-[200px] ${
          isDark
            ? "text-zinc-100 placeholder-zinc-500"
            : "text-gray-900 placeholder-gray-400"
        }`}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !message.trim()}
        className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-all shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
