import SplitPane, { Pane, SashContent } from "@src/packages/ui/SplitPane";
import { useAppProvider } from "@src/packages/app-env";
import { RequestTab } from "../../RequestTab";
import { ResponseTab } from "../../ResponseTab";
import { useIsMobile } from "../../../../hooks/useMobile";
import { useState } from "react";
import { FiColumns, FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { useTrafficListContext } from "@src/packages/main-content/context/TrafficList";

export const RequestResponseMode = ({
  sizes,
  setSizes,
}: {
  sizes: any[];
  setSizes: (sizes: any[]) => void;
}) => {
  const { provider } = useAppProvider();
  const { selections, trafficSet } = useTrafficListContext();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"both" | "request" | "response">("both");

  const renderRequest = () => (
    <div className="h-full no-scrollbar flex items-center justify-center overflow-auto">
      <RequestTab
        loadData={(traffic) =>
          provider.getRequestPairData(traffic.id as string)
        }
      />
    </div>
  );

  const renderResponse = () => (
    <div className="h-full no-scrollbar flex items-center justify-center overflow-auto">
      <ResponseTab
        loadData={(traffic) =>
          provider.getResponsePairData(traffic.id as string)
        }
      />
    </div>
  );

  const selectedId = selections.firstSelected?.id as string;
  const traffic = trafficSet[selectedId];

  const getHeader = (headers: { [key: string]: string } | undefined, key: string) => {
    if (!headers) return null;
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(headers).find(k => k.toLowerCase() === lowerKey);
    return foundKey ? headers[foundKey] : null;
  };

  const reqHeaders = traffic?.request?.header;
  const resHeaders = traffic?.response?.header;

  const reqType = getHeader(reqHeaders, "content-type")?.split(";")[0];
  const reqLen = getHeader(reqHeaders, "content-length");
  const origin = getHeader(reqHeaders, "origin");

  const resType = getHeader(resHeaders, "content-type")?.split(";")[0];
  const resLen = getHeader(resHeaders, "content-length");
  const server = getHeader(resHeaders, "server");

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Header Controls */}
      <div className="flex flex-col border-b border-zinc-900 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-4 overflow-hidden flex-1 mr-4">
            {traffic ? (
              <>
                <div className="flex items-center gap-4 text-[10px] overflow-hidden">
                  {/* Request Metadata */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] text-zinc-600 font-black tracking-tighter">REQ</span>
                    <span className="text-zinc-400 font-mono">{reqLen || '0'} B</span>
                    <span className="text-zinc-500 opacity-70 italic truncate max-w-[100px]">{reqType}</span>
                    {origin && <span className="text-blue-500/50 font-mono truncate max-w-[150px]" title={origin}>({origin})</span>}
                  </div>

                  {/* Response Metadata */}
                  {traffic.response && (
                    <div className="flex items-center gap-1.5 shrink-0 border-l border-zinc-800/50 pl-4">
                      <span className="text-[9px] text-zinc-600 font-black tracking-tighter">RES</span>
                      <span className="text-zinc-400 font-mono">{resLen || '0'} B</span>
                      <span className="text-zinc-500 opacity-70 italic truncate max-w-[100px]">{resType}</span>
                      {server && <span className="text-purple-500/50 font-mono truncate max-w-[150px]" title={server}>({server})</span>}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-[10px] text-zinc-600 font-black tracking-widest">Inspection</span>
            )}
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
