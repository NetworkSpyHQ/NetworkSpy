import React, { useState, useEffect, useRef, useCallback } from "react";
import { ToolBaseHeader } from "@src/packages/ui/ToolBaseHeader";
import { FiSend, FiMaximize2, FiSidebar } from "react-icons/fi";
import { invoke } from "@tauri-apps/api/core";
import { twMerge } from "tailwind-merge";
import { Tabs } from "./components/Tabs";
import { UrlBar } from "./components/UrlBar";
import type { HttpMethod } from "./components/UrlBar";
import { RequestView } from "./components/RequestView";
import type { Header } from "./components/RequestView";
import { ResponseView } from "./components/ResponseView";
import type { ComposerResponse } from "./components/ResponseView";
import { parseCurl } from "./components/curlParser";
import RequestList from "./components/RequestList";
import type { SavedRequest } from "./components/RequestList";

let headerIdCounter = 0;
const newHeaderId = () => `hdr_${++headerIdCounter}`;
let requestIdCounter = 0;
const newRequestId = () => `req_${Date.now()}_${++requestIdCounter}`;

const defaultHeaders = (): Header[] => [{ id: newHeaderId(), key: "", value: "" }];

const createEmptyRequest = (): SavedRequest => ({
  id: newRequestId(),
  name: "",
  method: "GET",
  url: "",
  headers: [],
  body: null,
  bodyType: "none",
  timestamp: Date.now(),
});

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

  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(() => {
    const initial = createEmptyRequest();
    return [initial];
  });
  const [activeRequestId, setActiveRequestId] = useState<string>(savedRequests[0].id);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);

  const activeRequestRef = useRef(activeRequestId);
  activeRequestRef.current = activeRequestId;

  const updateActiveRequest = useCallback((updater: (req: SavedRequest) => SavedRequest) => {
    setSavedRequests(prev =>
      prev.map(r => r.id === activeRequestRef.current ? updater(r) : r)
    );
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadRequest = useCallback((req: SavedRequest) => {
    setMethod(req.method);
    setUrl(req.url);
    setUrlError(null);
    setHeaders(req.headers.length > 0
      ? req.headers.map(h => ({ id: newHeaderId(), key: h.key, value: h.value }))
      : defaultHeaders()
    );
    setBodyType(req.bodyType);
    setBodyText(req.body ?? "");
    setActiveRequestId(req.id);
    setResponse(null);
    setError(null);
    setActiveMainTab("request");
  }, []);

  const handleNewRequest = () => {
    const req = createEmptyRequest();
    setSavedRequests(prev => [...prev, req]);
    loadRequest(req);
  };

  const handleSelectRequest = (req: SavedRequest) => {
    if (req.id === activeRequestId) return;
    loadRequest(req);
  };

  const handleDeleteRequest = (id: string) => {
    setSavedRequests(prev => {
      const remaining = prev.filter(r => r.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyRequest();
        loadRequest(fresh);
        return [fresh];
      }
      if (id === activeRequestId) {
        loadRequest(remaining[0]);
      }
      return remaining;
    });
  };

  const handleAddHeader = () => {
    setHeaders(prev => {
      const next = [...prev, { id: newHeaderId(), key: "", value: "" }];
      updateActiveRequest(r => ({ ...r, headers: next.map(h => ({ key: h.key, value: h.value })) }));
      return next;
    });
  };

  const handleRemoveHeader = (id: string) => {
    setHeaders(prev => {
      const next = prev.filter(h => h.id !== id);
      updateActiveRequest(r => ({ ...r, headers: next.map(h => ({ key: h.key, value: h.value })) }));
      return next;
    });
  };

  const handleHeaderChange = (id: string, field: "key" | "value", val: string) => {
    setHeaders(prev => {
      const next = prev.map(h => h.id === id ? { ...h, [field]: val } : h);
      updateActiveRequest(r => ({ ...r, headers: next.map(h => ({ key: h.key, value: h.value })) }));
      return next;
    });
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
    updateActiveRequest(r => ({ ...r, url: value }));

    if (value.trim().toLowerCase().startsWith("curl ")) {
      try {
        const parsed = parseCurl(value.trim());
        if (parsed.url) {
          const upperMethod = parsed.method.toUpperCase() as HttpMethod;
          setMethod(upperMethod);
          setUrl(parsed.url);
          setUrlError(null);
          updateActiveRequest(r => ({ ...r, method: upperMethod, url: parsed.url }));

          if (parsed.headers.length > 0) {
            const newHeaders = parsed.headers.map(h => ({ id: newHeaderId(), key: h.key, value: h.value }));
            setHeaders(newHeaders);
            updateActiveRequest(r => ({ ...r, headers: parsed.headers }));
          }

          if (parsed.body) {
            const isJson = parsed.headers.some(h => h.key.toLowerCase() === "content-type" && h.value.toLowerCase().includes("json"));
            const bt = isJson ? "json" as const : "text" as const;
            setBodyType(bt);
            let displayBody: string;
            try {
              displayBody = JSON.stringify(JSON.parse(parsed.body), null, 2);
            } catch {
              displayBody = parsed.body;
            }
            setBodyText(displayBody);
            setActiveRequestTab("body");
            updateActiveRequest(r => ({ ...r, body: displayBody, bodyType: bt }));
          }

          const name = `${upperMethod} ${parsed.url.length > 60 ? parsed.url.slice(0, 57) + "..." : parsed.url}`;
          updateActiveRequest(r => ({ ...r, name: r.name || name }));

          showCurlToast("cURL imported — " + upperMethod + " " + parsed.url);
        }
      } catch {
        // parse failed, just keep the raw text
      }
    }
  };

  const handleMethodChange = (m: HttpMethod) => {
    setMethod(m);
    updateActiveRequest(r => ({ ...r, method: m }));
  };

  const handleBodyTypeChange = (bt: "none" | "text" | "json") => {
    setBodyType(bt);
    updateActiveRequest(r => ({ ...r, bodyType: bt }));
  };

  const handleBodyTextChange = (value: string) => {
    setBodyText(value);
    updateActiveRequest(r => ({ ...r, body: value }));
  };

  const handleSend = async () => {
    if (!url.trim() || urlError) return;
    setIsSending(true);
    setError(null);
    setResponse(null);

    const validHeaders = headers.filter(h => h.key.trim());

    const name = `${method} ${url.trim().length > 60 ? url.trim().slice(0, 57) + "..." : url.trim()}`;
    updateActiveRequest(r => ({
      ...r,
      name: r.name || name,
      headers: validHeaders.map(h => ({ key: h.key, value: h.value })),
      body: bodyType !== "none" ? bodyText : null,
      bodyType,
      method,
      url: url.trim(),
      timestamp: Date.now(),
    }));

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

  const sidebarToggle = (
    <button
      onClick={() => setIsSidebarCompact(v => !v)}
      className={twMerge(
        "p-1.5 rounded-lg transition-all",
        isSidebarCompact
          ? "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
          : "text-blue-500 bg-blue-600/10 hover:bg-blue-600/20"
      )}
      title={isSidebarCompact ? "Show request list" : "Hide request list"}
    >
      <FiSidebar size={16} />
    </button>
  );

  return (
    <div className="flex h-full bg-[#050505] relative overflow-hidden">
      <div className={twMerge(
        "border-r border-zinc-900 flex flex-col h-full bg-[#080808] transition-all duration-300",
        isSidebarCompact ? "w-14" : "w-64"
      )}>
        <RequestList
          requests={savedRequests}
          activeRequestId={activeRequestId}
          onSelect={handleSelectRequest}
          onDelete={handleDeleteRequest}
          onNewRequest={handleNewRequest}
          isCompact={isSidebarCompact}
          onToggleCompact={() => setIsSidebarCompact(v => !v)}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
        <ToolBaseHeader
          title={<div className="flex items-center gap-3">{sidebarToggle}<span>Composer</span></div>}
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

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <UrlBar
            method={method}
            onMethodChange={handleMethodChange}
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
                onBodyTypeChange={handleBodyTypeChange}
                bodyText={bodyText}
                onBodyTextChange={handleBodyTextChange}
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
