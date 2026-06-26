import React from "react";
import { FiPlus, FiTrash2, FiSend } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import type { HttpMethod } from "./UrlBar";

export interface SavedRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body: string | null;
  bodyType: "none" | "text" | "json";
  timestamp: number;
}

interface RequestListProps {
  requests: SavedRequest[];
  activeRequestId: string | null;
  onSelect: (request: SavedRequest) => void;
  onDelete: (id: string) => void;
  onNewRequest: () => void;
  isCompact: boolean;
  onToggleCompact: () => void;
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PATCH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  HEAD: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  OPTIONS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const RequestList: React.FC<RequestListProps> = ({
  requests,
  activeRequestId,
  onSelect,
  onDelete,
  onNewRequest,
  isCompact,
  onToggleCompact,
}) => {
  return (
    <div className="flex flex-col h-full select-none">
      <div className="px-4 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
        {!isCompact && (
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Requests</h2>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={onNewRequest}
            className={twMerge(
              "flex items-center gap-1 rounded-md border transition-all active:scale-95",
              isCompact
                ? "p-1.5 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                : "px-2.5 py-1.5 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
            )}
            title="New request"
          >
            <FiPlus size={12} />
            {!isCompact && <span className="text-[10px] font-bold">New</span>}
          </button>
          <button
            onClick={onToggleCompact}
            className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all"
            title={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={twMerge("transition-transform", isCompact ? "rotate-180" : "")}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
        {requests.map((req) => (
          <div
            key={req.id}
            onClick={() => onSelect(req)}
            className={twMerge(
              "group flex items-center rounded-md cursor-pointer transition-all",
              isCompact ? "px-0 py-2 justify-center" : "px-3 py-2 justify-between",
              activeRequestId === req.id
                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                : "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
            )}
          >
            <div className={twMerge("flex items-center gap-2 truncate", isCompact && "justify-center overflow-visible")}>
              <span
                className={twMerge(
                  "text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border",
                  methodColors[req.method] || "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
                )}
              >
                {isCompact ? req.method.charAt(0) : req.method}
              </span>
              {!isCompact && (
                <span className="text-[11px] font-mono truncate">{req.name || req.url || "Untitled"}</span>
              )}
            </div>

            {!isCompact && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(req.id); }}
                className="p-1 hover:bg-rose-500/10 text-zinc-700 hover:text-rose-500 rounded transition-all opacity-0 group-hover:opacity-100"
              >
                <FiTrash2 size={12} />
              </button>
            )}
          </div>
        ))}

        {requests.length === 0 && !isCompact && (
          <div className="px-3 py-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600">
              <FiSend size={16} />
            </div>
            <p className="text-[10px] text-zinc-600">No requests yet. Start composing!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestList;
