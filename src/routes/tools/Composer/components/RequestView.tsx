import React from "react";
import { FiPlus, FiTrash2, FiCode, FiType, FiMinimize2, FiAlignLeft } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { MonacoEditor } from "@src/packages/ui/MonacoEditor";
import { Tabs } from "./Tabs";

export interface Header {
  id: string;
  key: string;
  value: string;
}

interface RequestViewProps {
  activeRequestTab: "headers" | "body";
  onRequestTabChange: (tab: "headers" | "body") => void;
  headers: Header[];
  onAddHeader: () => void;
  onRemoveHeader: (id: string) => void;
  onHeaderChange: (id: string, field: "key" | "value", val: string) => void;
  bodyType: "none" | "text" | "json";
  onBodyTypeChange: (type: "none" | "text" | "json") => void;
  bodyText: string;
  onBodyTextChange: (value: string) => void;
}

const HeadersEditor: React.FC<{
  headers: Header[];
  onAddHeader: () => void;
  onRemoveHeader: (id: string) => void;
  onHeaderChange: (id: string, field: "key" | "value", val: string) => void;
}> = ({ headers, onAddHeader, onRemoveHeader, onHeaderChange }) => (
  <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
    {headers.map((header) => (
      <div key={header.id} className="flex items-center gap-2">
        <input
          type="text"
          value={header.key}
          onChange={(e) => onHeaderChange(header.id, "key", e.target.value)}
          placeholder="Header name"
          className="flex-1 px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-300 text-[11px] font-mono outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
        />
        <input
          type="text"
          value={header.value}
          onChange={(e) => onHeaderChange(header.id, "value", e.target.value)}
          placeholder="Value"
          className="flex-[2] px-2.5 py-1 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-300 text-[11px] font-mono outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
        />
        <button
          onClick={() => onRemoveHeader(header.id)}
          className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    ))}
    <button
      onClick={onAddHeader}
      className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg text-[11px] transition-all"
    >
      <FiPlus size={12} />
      Add Header
    </button>
  </div>
);

const prettifyJSON = (text: string): string => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

const BodyEditor: React.FC<{
  bodyType: "none" | "text" | "json";
  onBodyTypeChange: (type: "none" | "text" | "json") => void;
  bodyText: string;
  onBodyTextChange: (value: string) => void;
}> = ({ bodyType, onBodyTypeChange, bodyText, onBodyTextChange }) => {
  const handlePrettify = () => {
    const formatted = prettifyJSON(bodyText);
    if (formatted !== bodyText) {
      onBodyTextChange(formatted);
    }
  };

  return (
  <div className="flex flex-col flex-1 min-h-0 gap-2">
    <div className="flex items-center gap-2 flex-shrink-0">
      {(["none", "text", "json"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onBodyTypeChange(type)}
          className={twMerge(
            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
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
      {bodyType === "json" && (
        <button
          onClick={handlePrettify}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
        >
          <FiAlignLeft size={11} />
          Prettify
        </button>
      )}
    </div>
    {bodyType !== "none" && (
      <div className="flex-1 min-h-0 border border-zinc-800 rounded-lg overflow-hidden">
        <MonacoEditor
          height="100%"
          language={bodyType === "json" ? "json" : "plaintext"}
          theme="vs-dark"
          value={bodyText}
          onChange={(val) => onBodyTextChange(val ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 11,
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            padding: { top: 6, bottom: 12 },
          }}
        />
      </div>
    )}
  </div>
  );
};

export const RequestView: React.FC<RequestViewProps> = ({
  activeRequestTab,
  onRequestTabChange,
  headers,
  onAddHeader,
  onRemoveHeader,
  onHeaderChange,
  bodyType,
  onBodyTypeChange,
  bodyText,
  onBodyTextChange,
}) => {
  return (
    <div className="flex flex-col h-full">
      <Tabs
        tabs={[
          { key: "headers", label: "Headers" },
          { key: "body", label: "Body" },
        ]}
        activeKey={activeRequestTab}
        onChange={onRequestTabChange}
        className="mb-2"
      />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeRequestTab === "headers" && (
          <HeadersEditor
            headers={headers}
            onAddHeader={onAddHeader}
            onRemoveHeader={onRemoveHeader}
            onHeaderChange={onHeaderChange}
          />
        )}

        {activeRequestTab === "body" && (
          <BodyEditor
            bodyType={bodyType}
            onBodyTypeChange={onBodyTypeChange}
            bodyText={bodyText}
            onBodyTextChange={onBodyTextChange}
          />
        )}
      </div>
    </div>
  );
};
