import React, { useState, useEffect, useRef } from "react";
import { ToolBaseHeader } from "@src/packages/ui/ToolBaseHeader";
import { FiSend, FiMaximize2 } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { Tabs } from "./components/Tabs";
import { UrlBar } from "./components/UrlBar";
import type { HttpMethod } from "./components/UrlBar";
import { RequestView } from "./components/RequestView";
import type { Header } from "./components/RequestView";
import { ResponseView } from "./components/ResponseView";
import type { ComposerResponse } from "./components/ResponseView";
import { parseCurl } from "./components/curlParser";

let headerIdCounter = 0;
const newHeaderId = () => `hdr_${++headerIdCounter}`;

const Composer: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<Header[]>([{ id: newHeaderId(), key: "", value: "" }]);
  const [bodyType, setBodyType] = useState<"none" | "text" | "json">("none");
  const [bodyText, setBodyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<ComposerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"request" | "response">("request");
  const [activeRequestTab, setActiveRequestTab] = useState<"headers" | "body">("headers");
  const [activeResponseTab, setActiveResponseTab] = useState<"headers" | "body" | "hex">("body");
  const [curlToast, setCurlToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleAddHeader = () => {
    setHeaders(prev => [...prev, { id: newHeaderId(), key: "", value: "" }]);
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders(prev => prev.filter(h => h.id !== id));
  };

  const handleHeaderChange = (id: string, field: "key" | "value", val: string) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  const validateUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      return "URL must start with http:// or https://";
    }
    try {
      new URL(trimmed);
      return null;
    } catch {
      return "Invalid URL format";
    }
  };

  const showCurlToast = (message: string) => {
    setCurlToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setCurlToast(null), 3000);
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setUrlError(validateUrl(value));

    if (value.trim().toLowerCase().startsWith("curl ")) {
      try {
        const parsed = parseCurl(value.trim());
        if (parsed.url) {
          const upperMethod = parsed.method.toUpperCase() as HttpMethod;
          setMethod(upperMethod);
          setUrl(parsed.url);
          setUrlError(null);

          if (parsed.headers.length > 0) {
            setHeaders(parsed.headers.map(h => ({ id: newHeaderId(), key: h.key, value: h.value })));
          }

          if (parsed.body) {
            const isJson = parsed.headers.some(h => h.key.toLowerCase() === "content-type" && h.value.toLowerCase().includes("json"));
            setBodyType(isJson ? "json" : "text");
            try {
              setBodyText(JSON.stringify(JSON.parse(parsed.body), null, 2));
            } catch {
              setBodyText(parsed.body);
            }
            setActiveRequestTab("body");
          }

          showCurlToast("cURL imported — " + upperMethod + " " + parsed.url);
        }
      } catch {
        // parse failed, just keep the raw text
      }
    }
  };

  const handleSend = async () => {
    if (!url.trim() || urlError) return;
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
      setActiveMainTab("response");
    } catch (e) {
      setError(typeof e === "string" ? e : "Failed to send request");
      setActiveMainTab("response");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && url.trim() && !urlError) {
      e.preventDefault();
      handleSend();
    }
  };

  const responseBodyString = response
    ? response.body.length > 0
      ? new TextDecoder().decode(new Uint8Array(response.body))
      : ""
    : "";

  const isJSONResponse = response?.content_type.toLowerCase().includes("json") ?? false;

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
      <ToolBaseHeader
        title="Composer"
        description="Build and send HTTP requests"
        icon={<FiSend size={22} className="text-blue-500" />}
        actions={
          <button
            onClick={() => window.open("/composer", "_blank")}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all active:scale-95"
            title="Open in new window"
          >
            <FiMaximize2 size={16} />
          </button>
        }
      />

      <div className="flex flex-col flex-grow min-h-0 overflow-hidden">
        <UrlBar
          method={method}
          onMethodChange={setMethod}
          url={url}
          urlError={urlError}
          onUrlChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          isSending={isSending}
        />

        <div className="flex-shrink-0 px-3 pt-2">
          <Tabs
            tabs={[
              { key: "request", label: "Request" },
              { key: "response", label: "Response" },
            ]}
            activeKey={activeMainTab}
            onChange={setActiveMainTab}
            size="md"
          />
        </div>

        <div className="flex-1 min-h-0 px-3 py-2">
          {activeMainTab === "request" && (
            <RequestView
              activeRequestTab={activeRequestTab}
              onRequestTabChange={setActiveRequestTab}
              headers={headers}
              onAddHeader={handleAddHeader}
              onRemoveHeader={handleRemoveHeader}
              onHeaderChange={handleHeaderChange}
              bodyType={bodyType}
              onBodyTypeChange={setBodyType}
              bodyText={bodyText}
              onBodyTextChange={setBodyText}
            />
          )}

          {activeMainTab === "response" && (
            <ResponseView
              response={response}
              error={error}
              activeResponseTab={activeResponseTab}
              onResponseTabChange={setActiveResponseTab}
              responseBodyString={responseBodyString}
              isJSONResponse={isJSONResponse}
            />
          )}
        </div>
      </div>

      {curlToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-3 py-2 bg-emerald-950/40 backdrop-blur-md border border-emerald-500/30 rounded-lg shadow-[0_0_30px_-6px_rgba(16,185,129,0.15)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-emerald-400 text-[11px] font-mono">{curlToast}</p>
        </div>
      )}

      {urlError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] px-3 py-2 bg-red-950/40 backdrop-blur-md border border-red-500/30 rounded-lg shadow-[0_0_30px_-6px_rgba(239,68,68,0.15)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-red-400 text-[11px] font-mono">{urlError}</p>
        </div>
      )}
    </div>
  );
};

export default Composer;
