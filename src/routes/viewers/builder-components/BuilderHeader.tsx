import React, { useState } from "react";
import { FiCheck, FiEdit2, FiLayers, FiColumns, FiSave, FiCode, FiEye, FiZap, FiChevronLeft } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { ViewerBlock } from "@src/context/ViewerContext";

interface BuilderHeaderProps {
    viewerName: string;
    setViewerName: (name: string) => void;
    isEditingName: boolean;
    setIsEditingName: (editing: boolean) => void;
    isToolboxVisible: boolean;
    setIsToolboxVisible: (visible: boolean) => void;
    isAiAssistantVisible: boolean;
    setIsAiAssistantVisible: (visible: boolean) => void;
    handleSave: () => void;
    isSaving?: boolean;
    saveSuccess?: boolean;
    blocks: ViewerBlock[];
    testResults: Record<string, any>;
    viewMode: 'preview' | 'source' | 'json';
    setViewMode: (mode: 'preview' | 'source' | 'json') => void;
    onBack?: () => void;
    autosave?: boolean;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
    viewerName, setViewerName, isEditingName, setIsEditingName,
    isToolboxVisible, setIsToolboxVisible, 
    isAiAssistantVisible, setIsAiAssistantVisible,
    handleSave, isSaving = false, saveSuccess = false,
    viewMode, setViewMode,
    onBack,
    autosave = true
}) => {
    return (
        <div className="flex items-center gap-2 h-full flex-1">
            <div className="flex items-center gap-2 flex-1">
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90"
                        title="Back to Viewer List"
                    >
                        <FiChevronLeft size={18} />
                    </button>
                )}

                {!autosave && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={twMerge(
                            "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold transition-all active:scale-95 border border-white/10 mr-2",
                            saveSuccess 
                                ? "bg-emerald-600 text-white" 
                                : "bg-blue-600 hover:bg-blue-500 text-white",
                            isSaving ? "opacity-50 cursor-wait" : ""
                        )}
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saveSuccess ? (
                            <FiCheck size={12} />
                        ) : (
                            <FiSave size={12} />
                        )}
                        {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save"}
                    </button>
                )}
                
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm">
                        <FiLayers size={14} />
                    </div>
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={viewerName}
                                onChange={(e) => setViewerName(e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                onBlur={() => setIsEditingName(false)}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                            <span className="text-[11px] font-black text-white italic tracking-tighter">{viewerName}</span>
                            <FiEdit2 size={10} className="opacity-0 group-hover:opacity-100 text-zinc-600 transition-all" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-zinc-900/50 p-0.5 rounded-lg border border-white/5 mr-2">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={twMerge(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                            viewMode === 'preview' 
                                ? "bg-white/10 text-white" 
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <FiEye size={12} />
                        Preview
                    </button>
                    <button
                        onClick={() => setViewMode('json')}
                        className={twMerge(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                            viewMode === 'json' 
                                ? "bg-white/10 text-blue-400" 
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <FiLayers size={12} />
                        JSON
                    </button>
                    <button
                        onClick={() => setViewMode('source')}
                        className={twMerge(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black transition-all",
                            viewMode === 'source' 
                                ? "bg-white/10 text-amber-500" 
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <FiCode size={12} />
                        Source
                    </button>
                </div>

                <div className="h-4 w-px bg-white/10 mx-1"></div>

                <button
                    onClick={() => setIsToolboxVisible(!isToolboxVisible)}
                    className={twMerge(
                        "p-1.5 rounded-lg transition-all border border-transparent active:scale-95",
                        !isToolboxVisible ? "bg-blue-600 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
                    )}
                    title="Toggle Toolbox"
                >
                    <FiColumns size={14} />
                </button>

                <button
                    onClick={() => setIsAiAssistantVisible(!isAiAssistantVisible)}
                    className={twMerge(
                        "p-1.5 rounded-lg transition-all border border-transparent active:scale-95",
                        isAiAssistantVisible ? "bg-purple-600 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
                    )}
                    title="AI Assistant"
                >
                    <FiZap size={14} />
                </button>
            </div>
        </div>
    );
};
