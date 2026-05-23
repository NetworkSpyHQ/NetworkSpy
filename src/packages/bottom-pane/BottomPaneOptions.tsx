import { useEffect, useState, useMemo, useRef } from "react";
import { useTrafficListContext } from "../main-content/context/TrafficList";
import { BottomPaneMode, useBottomPaneContext, builtinMatchers } from "@src/context/BottomPaneContext";
import { FiSearch } from "react-icons/fi";
import { BsPinAngleFill } from "react-icons/bs";
import { twMerge } from "tailwind-merge";
import { useViewerContext } from "@src/context/ViewerContext";
import { useAnalytics } from "@src/context/AnalyticsProvider";
import { useSettingsContext } from "@src/context/SettingsProvider";
import { useAppProvider } from "@src/packages/app-env";
import { SmartViewerMatching } from "./SmartViewerMatching";

interface ViewerOption {
  id: string;
  title: string;
  isCustom?: boolean;
  divider?: boolean;
}

export const BottomPaneOptions = () => {
  const { setMode, selectionType, setSelectionType, mode: currentMode } = useBottomPaneContext();
  const { selections } = useTrafficListContext();
  const { viewers } = useViewerContext();
  const { smartViewerMatch } = useSettingsContext();
  const { provider } = useAppProvider();
  const analytics = useAnalytics();
  const [lastMatchedId, setLastMatchedId] = useState<string | null>(null);
  const [viewerScores, setViewerScores] = useState<Record<string, number>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const { pinnedBottomPaneModes: pinnedModes, setPinnedBottomPaneModes: setPinnedModes } = useSettingsContext();

  useEffect(() => {
    if (!selections.firstSelected) {
      setSelectionType("none");
    } else if (selections.others && selections.others.length > 1) {
      setSelectionType("multiple");
    } else {
      setSelectionType("single");
    }
  }, [selections, setSelectionType]);

  const matchingRef = useRef<SmartViewerMatching | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    const traffic = selections.firstSelected;
    if (!traffic) return;

    const trafficId = String(traffic.id);
    if (trafficId !== lastMatchedId) {
      setLastMatchedId(trafficId);

      if (smartViewerMatch) {
        cancelRef.current = true;

        const matcher = new SmartViewerMatching(provider, builtinMatchers, viewers);
        matchingRef.current = matcher;
        let isCancelled = false;

        (async () => {
          const scores = await matcher.matchTraffic(trafficId, traffic);
          if (!isCancelled) {
            setViewerScores(scores);
          }
        })();

        return () => { isCancelled = true; };
      } else {
        setViewerScores({});
      }
    }
  }, [selections.firstSelected, smartViewerMatch, lastMatchedId, viewers, provider]);

  // Centralized click handler
  const handleModeSelection = (opt: ViewerOption) => {
    analytics.track("select_viewer", {
      viewerId: opt.id,
      viewerTitle: opt.title,
      isCustom: opt.isCustom || false,
      selectionType: selectionType,
      trafficId: selections.firstSelected?.id
    });

    if (opt.isCustom) {
      setMode({ type: "viewer", id: opt.id });
    } else {
      setMode(opt.id as BottomPaneMode);
    }
  };

  const togglePin = (modeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedModes.includes(modeId)) {
      setPinnedModes(pinnedModes.filter(m => m !== modeId));
    } else {
      setPinnedModes([...pinnedModes, modeId]);
    }
  };

  const optionsBySelection: Record<string, ViewerOption[]> = {
    none: [
      { id: "summary", title: "Summary" },
      { id: "health_timeline", title: "Health History" },
      { id: "status_distribution", title: "Status Map" },
      { id: "method_distribution", title: "Method Usage" },
    ],
    single: [
      { id: "request_response", title: "Request Response" },
      { id: "raw_viewer", title: "Raw Text" },
      { id: "query_params", title: "Query Params" },
      { id: "cookies", title: "Cookies" },
      { id: "header_explainer", title: "Header Explainer" },
      { id: "json_tree", title: "JSON Tree" },
      { id: "curl", title: "cURL" },
      { id: "code_snippet", title: "Code Snippet" },
      { id: "sensitive_data", title: "Sensitive Data" },
      { id: "auth_analysis", title: "Auth Analysis" },
      { id: "jwt_decoder", title: "JWT Decoder" },
      { id: "ai_debug", title: "AI Debug" },
      { id: "ai_test", title: "AI Test" },
      { id: "graphql", title: "GraphQL" },
      { id: "llm_prompt", title: "LLM Prompt" },
      { id: "llm_response", title: "LLM Response" },
      { id: "llm_streaming", title: "LLM Streaming" },
      { id: "llm_token_analyzer", title: "LLM Token Analyzer" },
      { id: "sep1", title: "divider", divider: true },
      { id: "security_owasp", title: "OWASP Top 10" },
      { id: "security_mobsf", title: "MobSF Mobile" },
      { id: "security_static", title: "Fast Static Check" },
      { id: "sep2", title: "divider", divider: true },
      { id: "hex_viewer", title: "HEX Viewer" },
      { id: "image_viewer", title: "Image Viewer" },
      { id: "html_viewer", title: "Browser Preview" },
      { id: "xml_viewer", title: "XML Viewer" },
      { id: "audio_viewer", title: "Audio Stream" },
      { id: "video_viewer", title: "Video Viewer" },
      { id: "js_viewer", title: "JavaScript Viewer" },
      { id: "css_viewer", title: "CSS Viewer" },
      { id: "ts_viewer", title: "TypeScript Viewer" },
      { id: "sep3", title: "divider", divider: true },
      { id: "json_transformer", title: "JSON Transformer" },
      { id: "json_schema", title: "JSON Schema" },
      { id: "soap_viewer", title: "SOAP Inspector" },
      { id: "protobuf_viewer", title: "Protobuf Decoder" },
      { id: "urlencoded", title: "Form URL Encoded" },
      { id: "multipart_form", title: "Multipart Form" },
    ],
    multiple: [
      { id: "timeline", title: "Timeline" },
      { id: "waterfall", title: "Waterfall" },
      { id: "diff", title: "Diff (Compare)" },
      { id: "compare", title: "Compare Table" },
      { id: "performance", title: "Performance" },
      { id: "endpoint_summary", title: "Endpoint Summary" },
      { id: "batch_analyze", title: "Batch Analyze" },
      { id: "security_scan", title: "Security Scan" },
      { id: "ai_security", title: "AI Security" },
      { id: "ai_summary", title: "AI Summary" },
      { id: "ai_investigate", title: "AI Investigate" },
      { id: "swagger", title: "Swagger API" },
      { id: "graphql_doc", title: "GraphQL Documentation" },
    ],
  };

  const filteredAndSortedOptions = useMemo(() => {
    let base = optionsBySelection[selectionType] || [];

    if (selectionType === "single") {
      const customViewers: ViewerOption[] = viewers.map(v => ({
        id: v.id,
        title: v.name,
        isCustom: true
      }));

      if (customViewers.length > 0) {
        base = [...customViewers, { id: "custom-sep", title: "divider", divider: true }, ...base];
      }
    }

    return base
      .filter(opt => {
        if (opt.divider) return !searchTerm;
        return opt.title.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (a.divider || b.divider) return 0;
        const aPinned = pinnedModes.includes(a.id);
        const bPinned = pinnedModes.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        const aScore = viewerScores[a.id] || 0;
        const bScore = viewerScores[b.id] || 0;
        if (aScore > bScore) return -1;
        if (aScore < bScore) return 1;

        return 0;
      });
  }, [selectionType, viewers, searchTerm, pinnedModes, viewerScores]);

  return (
    <div className="flex items-center border-y border-black bg-[#0c0c0c] h-9 relative">
      <div className="flex items-center px-3 border-r border-zinc-800 h-full group">
        <FiSearch className="text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={14} />
        <input
          type="text"
          placeholder="Search viewer..."
          className="bg-transparent border-none outline-none text-[11px] text-zinc-300 ml-2 w-24 focus:w-40 transition-all duration-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 flex items-center px-1 gap-1 overflow-x-auto no-scrollbar scroll-smooth h-full">
        {filteredAndSortedOptions.map((opt) => {
          if (opt.divider) {
            return <div key={opt.id} className="h-4 w-px bg-white/10 mx-1 shrink-0" />;
          }

          const isPinned = pinnedModes.includes(opt.id);
          const isActive = typeof currentMode === 'object' && currentMode?.type === 'viewer'
            ? currentMode.id === opt.id
            : currentMode === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleModeSelection(opt)}
              className={twMerge(
                "group relative flex items-center h-6 px-3 rounded-md transition-all duration-200 whitespace-nowrap text-[11px] font-medium shrink-0",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/50"
              )}
            >
              {opt.title}
              <BsPinAngleFill
                onClick={(e: React.MouseEvent) => togglePin(opt.id, e)}
                className={twMerge(
                  "ml-2 cursor-pointer hidden group-hover:block transition-all duration-200",
                  isPinned ? "text-blue-300 scale-110" : "text-zinc-600 hover:text-zinc-100"
                )}
                size={10}
              />
            </button>
          );
        })}

        {filteredAndSortedOptions.length === 0 && (
          <span className="text-[10px] text-zinc-600 italic px-4">No viewer match your search...</span>
        )}
      </div>
      <div className="w-8 h-full bg-gradient-to-l from-[#0c0c0c] to-transparent pointer-events-none absolute right-0" />
    </div>
  );
};