import React from "react";
import { useAtom } from "jotai";
import { activeViewerBuilderAtom } from "@src/utils/viewerBuilderAtoms";
import { twMerge } from "tailwind-merge";

import ViewerList from "@src/routes/viewers/ViewerList";
import ViewerBuilder from "@src/routes/viewers/ViewerBuilder";
import { Viewer } from "@src/context/ViewerContext";
import { useLicense } from "@src/hooks/useLicense";
import { FiLock, FiZap, FiEye, FiCpu, FiLayers } from "react-icons/fi";

const ViewersPage: React.FC = () => {
    const [selectedViewer, setSelectedViewer] = useAtom(activeViewerBuilderAtom);
    const { isPro } = useLicense();



    return (
        <div className="flex h-full bg-[#050505] overflow-hidden">
            {!selectedViewer && (
                <div className="border-r border-zinc-900 flex flex-col h-full bg-[#080808] w-80 animate-in slide-in-from-left duration-300">
                    <ViewerList
                        onSelectViewer={setSelectedViewer}
                    />
                </div>
            )}

            <div className="flex-1 h-full overflow-hidden">
                {selectedViewer ? (
                    <ViewerBuilder
                        viewer={selectedViewer}
                        onBack={() => setSelectedViewer(null)}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-6 bg-[#050505] animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-blue-600/5 flex items-center justify-center border border-blue-500/10 shadow-[0_0_50px_rgba(37,99,235,0.05)]">
                                <FiLayers size={40} className="text-blue-500/20" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500 animate-bounce">
                                <FiZap size={16} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase italic">Viewer Builder</h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed mx-auto">
                                Select a viewer from the list to start crafting your custom inspection UI
                            </p>
                        </div>
                        <div className="w-px h-12 bg-gradient-to-b from-blue-500/20 to-transparent"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewersPage;
