"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
}

export default function ChatMessage({ role, content, model }: ChatMessageProps) {
  const isUser = role === "user";

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
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-zinc-800 text-zinc-100 rounded-bl-sm border border-zinc-700"
          }`}
        >
          {!isUser && model && (
            <div className="text-[10px] text-zinc-400 mb-1 font-mono">
              {model}
            </div>
          )}
          <div className="prose prose-invert prose-sm max-w-none break-words [&_pre]:my-2 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeString = String(children).replace(/\n$/, "");

                  if (match) {
                    return (
                      <CodeBlock language={match[1]} code={codeString} />
                    );
                  }

                  return (
                    <code
                      className="bg-zinc-700 px-1.5 py-0.5 rounded text-sm font-mono text-emerald-300"
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
                      <table className="border-collapse border border-zinc-600 text-sm">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="border border-zinc-600 px-3 py-1.5 bg-zinc-700 text-left font-semibold">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="border border-zinc-600 px-3 py-1.5">
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
      </div>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-zinc-900 rounded-t-lg px-4 py-1.5 text-xs text-zinc-400 border border-zinc-700 border-b-0">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="hover:text-zinc-200 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: "0.5rem",
          borderBottomRightRadius: "0.5rem",
          border: "1px solid rgb(63 63 70)",
          fontSize: "0.8rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
