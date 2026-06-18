import React, { useState } from "react";
import { ToolBaseHeader } from "@src/packages/ui/ToolBaseHeader";
import { FiSend, FiPlus, FiTrash2, FiCode, FiType, FiMinimize2, FiMaximize2 } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import MonacoEditor from "@monaco-editor/react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

interface Header {
  id: string;
  key: string;
  value: string;
}

interface ComposerResponse {
  status: number;
  status_text: string;
  headers: { key: string; value: string }[];
  body: number[];
  content_type: string;
  timing_ms: number;
  size_bytes: number;
}

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
  POST: "text-blue-400 bg-blue-950/30 border-blue-900/50",
  PUT: "text-amber-400 bg-amber-950/30 border-amber-900/50",
  DELETE: "text-red-400 bg-red-950/30 border-red-900/50",
  PATCH: "text-purple-400 bg-purple-950/30 border-purple-900/50",
  HEAD: "text-zinc-400 bg-zinc-900/50 border-zinc-800",
  OPTIONS: "text-zinc-400 bg-zinc-900/50 border-zinc-800",
};

let headerIdCounter = 0;
const newHeaderId = () => `hdr_${++headerIdCounter}`;

const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

const vscToHex = (v: number) => {
  const h = v.toString(16);
  return h.length === 1 ? "0" + h : h;
};

const bodyToHexString = (body: number[]): string => {
  let hex = "";
  for (let i = 0; i < body.length; i++) {
    if (i > 0 && i % 16 === 0) hex += "\n";
    else if (i > 0) hex += " ";
    hex += vscToHex(body[i]);
  }
  return hex;
};

const Composer: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([{ id: newHeaderId(), key: "", value: "" }]);
  const [bodyType, setBodyType] = useState<"none" | "text" | "json">("none");
  const [bodyText, setBodyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<ComposerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRequestTab, setActiveRequestTab] = useState<"headers" | "body">("headers");
  const [activeResponseTab, setActiveResponseTab] = useState<"headers" | "body" | "hex">("headers");
  const [responseExpanded, setResponseExpanded] = useState(false);

  const handleAddHeader = () => {
    setHeaders(prev => [...prev, { id: newHeaderId(), key: "", value: "" }]);
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders(prev => prev.filter(h => h.id !== id));
  };

  const handleHeaderChange = (id: string, field: "key" | "value", val: string) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  const handleSend = async () => {
    if (!url.trim()) return;
    setIsSending(true);
    setError(null);
    setResponse(null);

    const validHeaders = headers.filter(h => h.key.trim());

    try {
      const res = await invoke<ComposerResponse>("send_composer_request", {
        request: {
          method,
          url: url.trim(),
          headers: validHeaders.map(h => ({ key: h.key, value: h.value })),
          body: bodyType !== "none" && bodyText ? bodyText : null,
        },
      });
      setResponse(res);
    } catch (e) {
      setError(typeof e === "string" ? e : "Failed to send request");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const responseBodyString = response
    ? response.body.length > 0
      ? new TextDecoder().decode(new Uint8Array(response.body))
      : ""
    : "";

  const isJSONResponse = response?.content_type.toLowerCase().includes("json");

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
      <ToolBaseHeader
        title="Composer"
        description="Build and send HTTP requests"
        icon={<FiSend size={22} className="text-blue-500" />}
        actions={
          <button
            onClick={() => window.open("/composer", "_blank")}
            className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all active:scale-95"
            title="Open in new window"
          >
            <FiMaximize2 size={16} />
          </button>
        }
      />

      <div className="flex flex-col flex-grow min-h-0 overflow-hidden">
        <div className="flex-shrink-0 p-4 pb-0">
          <div className="flex items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={twMerge(
                "px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider outline-none appearance-none cursor-pointer min-w-[90px]",
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
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 text-sm font-mono outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={isSending || !url.trim()}
              className={twMerge(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95",
                isSending
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
              )}
            >
              <FiSend size={14} className={isSending ? "animate-pulse" : ""} />
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 pt-4">
          <div className="flex items-center gap-1 border-b border-zinc-800">
            <button
              onClick={() => setActiveRequestTab("headers")}
              className={twMerge(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-t-lg",
                activeRequestTab === "headers"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Headers
            </button>
            <button
              onClick={() => setActiveRequestTab("body")}
              className={twMerge(
                "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-t-lg",
                activeRequestTab === "body"
                  ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Body
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-4 py-3">
          {activeRequestTab === "headers" && (
            <div className="h-full overflow-y-auto space-y-2">
              {headers.map((header) => (
                <div key={header.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => handleHeaderChange(header.id, "key", e.target.value)}
                    placeholder="Header name"
                    className="flex-1 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => handleHeaderChange(header.id, "value", e.target.value)}
                    placeholder="Value"
                    className="flex-[2] px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-300 text-xs font-mono outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  />
                  <button
                    onClick={() => handleRemoveHeader(header.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddHeader}
                className="flex items-center gap-2 px-3 py-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg text-xs transition-all"
              >
                <FiPlus size={12} />
                Add Header
              </button>
            </div>
          )}

          {activeRequestTab === "body" && (
            <div className="flex flex-col h-full gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                {(["none", "text", "json"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBodyType(type)}
                    className={twMerge(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                      bodyType === type
                        ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                        : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                    )}
                  >
                    {type === "none" && <FiMinimize2 size={12} />}
                    {type === "text" && <FiType size={12} />}
                    {type === "json" && <FiCode size={12} />}
                    {type}
                  </button>
                ))}
              </div>
              {bodyType !== "none" && (
                <div className="flex-1 min-h-0 border border-zinc-800 rounded-lg overflow-hidden">
                  <MonacoEditor
                    height="100%"
                    language={bodyType === "json" ? "json" : "plaintext"}
                    theme="vs-dark"
                    value={bodyText}
                    onChange={(val) => setBodyText(val ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "off",
                      scrollBeyondLastLine: false,
                      padding: { top: 8 },
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex-shrink-0 mx-4 mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded-lg">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        )}

        {response && (
          <div className={twMerge(
            "flex-shrink-0 border-t border-zinc-800 bg-[#0a0a0a] transition-all",
            responseExpanded ? "flex-1 min-h-0 overflow-hidden" : ""
          )}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={twMerge(
                  "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  response.status >= 200 && response.status < 300
                    ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/50"
                    : response.status >= 300 && response.status < 400
                    ? "bg-blue-950/30 text-blue-400 border border-blue-900/50"
                    : response.status >= 400 && response.status < 500
                    ? "bg-amber-950/30 text-amber-400 border border-amber-900/50"
                    : "bg-red-950/30 text-red-400 border border-red-900/50"
                )}>
                  {response.status} {response.status_text}
                </div>
                <span className="text-zinc-500 text-xs font-mono">{response.timing_ms}ms</span>
                <span className="text-zinc-500 text-xs font-mono">{formatSize(response.size_bytes)}</span>
              </div>
              <button
                onClick={() => setResponseExpanded(!responseExpanded)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
              >
                {responseExpanded ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
              </button>
            </div>

            <div className="flex items-center gap-1 border-b border-zinc-800 px-4">
              {(["headers", "body", "hex"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveResponseTab(tab)}
                  className={twMerge(
                    "px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-t-lg",
                    activeResponseTab === tab
                      ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: responseExpanded ? undefined : "240px" }}>
              {activeResponseTab === "headers" && (
                <div className="p-4 space-y-1">
                  {response.headers.map((h, i) => (
                    <div key={i} className="flex gap-2 text-xs font-mono">
                      <span className="text-blue-400 whitespace-nowrap">{h.key}:</span>
                      <span className="text-zinc-400 break-all">{h.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeResponseTab === "body" && (
                <div className="border-t border-zinc-800" style={{ minHeight: "150px" }}>
                  <MonacoEditor
                    height={responseExpanded ? "100%" : "200px"}
                    language={isJSONResponse ? "json" : "plaintext"}
                    theme="vs-dark"
                    value={responseBodyString}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: "off",
                      scrollBeyondLastLine: false,
                      readOnly: true,
                      padding: { top: 8 },
                    }}
                  />
                </div>
              )}
              {activeResponseTab === "hex" && (
                <div className="p-4">
                  <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed">
                    {bodyToHexString(response.body)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Composer;
