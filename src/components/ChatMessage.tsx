"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokenCount?: number;
  onRegenerate?: () => void;
  theme?: "dark" | "light";
}

export default function ChatMessage({ role, content, model, tokenCount, onRegenerate, theme = "dark" }: ChatMessageProps) {
  const isUser = role === "user";
  const isDark = theme === "dark";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            isUser
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
          }`}
        >
          {isUser ? "U" : "AI"}
        </div>
        <div>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-blue-600 text-white rounded-br-sm"
                : isDark
                  ? "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700"
                  : "bg-white text-gray-900 rounded-bl-sm border border-gray-200 shadow-sm"
            }`}
          >
            {!isUser && model && (
              <div className={`text-[10px] mb-1 font-mono ${isDark ? "text-zinc-400" : "text-gray-400"}`}>
                {model}
              </div>
            )}
            <div className={`prose prose-sm max-w-none break-words [&_pre]:my-2 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 ${isDark ? "prose-invert" : ""}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (match) {
                      return (
                        <CodeBlock language={match[1]} code={codeString} theme={theme} />
                      );
                    }

                    return (
                      <code
                        className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                          isDark ? "bg-zinc-700 text-emerald-300" : "bg-gray-100 text-emerald-700"
                        }`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        {children}
                      </a>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table className={`border-collapse border text-sm ${isDark ? "border-zinc-600" : "border-gray-300"}`}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className={`border px-3 py-1.5 text-left font-semibold ${
                        isDark ? "border-zinc-600 bg-zinc-700" : "border-gray-300 bg-gray-50"
                      }`}>
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className={`border px-3 py-1.5 ${isDark ? "border-zinc-600" : "border-gray-300"}`}>
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer: token count & regenerate */}
          {!isUser && (tokenCount || onRegenerate) && (
            <div className={`flex items-center gap-3 mt-1.5 px-2 text-[10px] ${isDark ? "text-zinc-500" : "text-gray-400"}`}>
              {tokenCount && tokenCount > 0 && (
                <span>~{tokenCount} tokens</span>
              )}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className={`flex items-center gap-1 transition-colors ${
                    isDark ? "hover:text-zinc-300" : "hover:text-gray-600"
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ language, code, theme = "dark" }: { language: string; code: string; theme?: string }) {
  const [copied, setCopied] = useState(false);
  const isDark = theme === "dark";

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className={`flex items-center justify-between rounded-t-lg px-4 py-1.5 text-xs border border-b-0 ${
        isDark ? "bg-zinc-900 text-zinc-400 border-zinc-700" : "bg-gray-50 text-gray-500 border-gray-200"
      }`}>
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className={`transition-colors ${isDark ? "hover:text-zinc-200" : "hover:text-gray-800"}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
          border: `1px solid ${isDark ? "rgb(63 63 70)" : "rgb(229 231 235)"}`,
          fontSize: "0.8rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
