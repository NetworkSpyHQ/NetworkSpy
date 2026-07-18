import SplitPane, { Pane, SashContent } from "@src/packages/ui/SplitPane";
import { useAppProvider } from "@src/packages/app-env";
import { useIsMobile } from "../../../../hooks/useMobile";
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { useTrafficListContext } from "@src/packages/main-content/context/TrafficList";
import { decodeBody } from "../../utils/bodyUtils";
import { RequestPairData } from "../../RequestTab";

const STATUS_TEXT: Record<number, string> = {
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
  301: "Moved Permanently", 302: "Found", 304: "Not Modified",
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
  405: "Method Not Allowed", 409: "Conflict", 429: "Too Many Requests",
  500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout"
};

export const RawMode = () => {
  const { provider } = useAppProvider();
  const { selections, trafficSet } = useTrafficListContext();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"both" | "request" | "response">("both");
  const [reqData, setReqData] = useState<RequestPairData | null>(null);
  const [resData, setResData] = useState<RequestPairData | null>(null);
  const [sizes, setSizes] = useState<(string | number)[]>(["50%", "auto"]);

  const selectedId = selections.firstSelected?.id as string;
  const traffic = trafficSet[selectedId];

  useEffect(() => {
    if (!selectedId) return;
    provider.getRequestPairData(selectedId).then(setReqData);
    provider.getResponsePairData(selectedId).then(setResData);
  }, [selectedId, provider]);

  const renderRequest = () => (
    <div className="h-full bg-[#1e1e1e] flex flex-col relative group">
      <div className="absolute top-0 right-0 bg-blue-600/80 text-white text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-bl-md z-10 shadow-lg group-hover:opacity-100 opacity-50 transition-opacity">Request</div>
      <div className="flex-grow overflow-auto p-4 font-mono text-[11px] whitespace-pre-wrap break-words leading-relaxed select-text">
        {traffic && reqData ? (
          <>
            <div>
              <span className="text-pink-400 font-bold">{traffic.method}</span>{" "}
              <span className="text-blue-400">{traffic.uri}</span>{" "}
              <span className="text-zinc-500">{traffic.request.version}</span>
            </div>
            {reqData.headers.map((h, i) => (
              <div key={i}>
                <span className="text-[#9cdcfe]">{h.key}</span>
                <span className="text-zinc-500">: </span>
                <span className="text-[#ce9178]">{h.value}</span>
              </div>
            ))}
            <div className="h-4" />
            {reqData.body && (
              <div className="text-zinc-300">
                {decodeBody(reqData.body, reqData.content_type)}
              </div>
            )}
          </>
        ) : (
          <div className="text-zinc-500 italic">No request data...</div>
        )}
      </div>
    </div>
  );

  const renderResponse = () => (
    <div className="h-full bg-[#1e1e1e] flex flex-col relative group">
      <div className="absolute top-0 right-0 bg-green-600/80 text-white text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-bl-md z-10 shadow-lg group-hover:opacity-100 opacity-50 transition-opacity">Response</div>
      <div className="flex-grow overflow-auto p-4 font-mono text-[11px] whitespace-pre-wrap break-words leading-relaxed select-text">
        {traffic && resData && traffic.response ? (
          <>
            <div>
              <span className="text-zinc-500">{traffic.response.version}</span>{" "}
              <span className={twMerge("font-bold", traffic.response.status_code < 400 ? "text-emerald-400" : "text-red-400")}>{traffic.response.status_code}</span>{" "}
              <span className="text-zinc-400">{STATUS_TEXT[traffic.response.status_code] || ""}</span>
            </div>
            {resData.headers.map((h, i) => (
              <div key={i}>
                <span className="text-[#9cdcfe]">{h.key}</span>
                <span className="text-zinc-500">: </span>
                <span className="text-[#ce9178]">{h.value}</span>
              </div>
            ))}
            <div className="h-4" />
            {resData.body && (
              <div className="text-zinc-300">
                {decodeBody(resData.body, resData.content_type)}
              </div>
            )}
          </>
        ) : (
          <div className="text-zinc-500 italic">No response data...</div>
        )}
      </div>
    </div>
  );

  if (!traffic) return null;

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Header Controls */}
      <div className="flex flex-col border-b border-zinc-900 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-4 overflow-hidden flex-1 mr-4">
             <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Raw HTTP Viewer</span>
          </div>

          <div className="flex items-center gap-0.5 bg-black/40 rounded-md p-0.5 border border-zinc-800/50">
            <button
              onClick={() => setViewMode("request")}
              className={twMerge(
                "px-2 py-1 rounded text-[9px] font-black tracking-tighter transition-all duration-300",
                viewMode === "request"
                  ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              Req
            </button>
            <button
              onClick={() => setViewMode("both")}
              className={twMerge(
                "px-2 py-1 rounded text-[9px] font-black tracking-tighter transition-all duration-300",
                viewMode === "both"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode("response")}
              className={twMerge(
                "px-2 py-1 rounded text-[9px] font-black tracking-tighter transition-all duration-300",
                viewMode === "response"
                  ? "bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.2)]"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              Res
            </button>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-hidden">
        {viewMode === "request" ? (
          renderRequest()
        ) : viewMode === "response" ? (
          renderResponse()
        ) : (
          <SplitPane
            split={isMobile ? "horizontal" : "vertical"}
            sashRender={() => <SashContent type="vscode" />}
            sizes={sizes}
            onChange={setSizes}
          >
            <Pane minSize={isMobile ? "30%" : "20%"} maxSize={isMobile ? "70%" : "80%"}>
              {renderRequest()}
            </Pane>

            <div className="h-full overflow-hidden border-l border-zinc-900 border-t @sm:border-t-0 @sm:border-l">
              {renderResponse()}
            </div>
          </SplitPane>
        )}
      </div>
    </div>
  );
};
