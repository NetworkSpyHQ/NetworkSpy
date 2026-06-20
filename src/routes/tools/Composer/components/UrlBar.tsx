import React from "react";
import { FiSend } from "react-icons/fi";
import { twMerge } from "tailwind-merge";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
  POST: "text-blue-400 bg-blue-950/30 border-blue-900/50",
  PUT: "text-amber-400 bg-amber-950/30 border-amber-900/50",
  DELETE: "text-red-400 bg-red-950/30 border-red-900/50",
  PATCH: "text-purple-400 bg-purple-950/30 border-purple-900/50",
  HEAD: "text-zinc-400 bg-zinc-900/50 border-zinc-800",
  OPTIONS: "text-zinc-400 bg-zinc-900/50 border-zinc-800",
};

interface UrlBarProps {
  method: HttpMethod;
  onMethodChange: (method: HttpMethod) => void;
  url: string;
  urlError: string | null;
  onUrlChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  isSending: boolean;
}

export const UrlBar: React.FC<UrlBarProps> = ({
  method,
  onMethodChange,
  url,
  urlError,
  onUrlChange,
  onKeyDown,
  onSend,
  isSending,
}) => {
  return (
    <div className="flex-shrink-0 p-3 pb-0">
      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
          className={twMerge(
            "px-2.5 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider outline-none appearance-none cursor-pointer min-w-[90px]",
            METHOD_COLORS[method]
          )}
        >
          {METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="https://api.example.com/endpoint — or paste a curl command"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={twMerge(
              "w-full px-3 py-1.5 bg-zinc-900/80 border rounded-lg text-zinc-200 text-xs font-mono outline-none transition-all placeholder:text-zinc-700",
              urlError ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-blue-500/50"
            )}
          />

        </div>

        <button
          onClick={onSend}
          disabled={isSending || !url.trim() || !!urlError}
          className={twMerge(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95",
            isSending || !url.trim() || !!urlError
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
          )}
        >
          <FiSend size={14} className={isSending ? "animate-pulse" : ""} />
          {isSending ? "Sending..." : !!urlError ? "Invalid URL" : "Send"}
        </button>
      </div>
    </div>
  );
};
