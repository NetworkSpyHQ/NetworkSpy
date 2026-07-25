import React, { useMemo, useState, useCallback } from "react";
import { useLicense } from "@src/hooks/useLicense";
import { useUpgradeDialog } from "@src/context/UpgradeContext";
import { FiChevronDown, FiChevronRight, FiEdit3, FiFolder, FiFolderPlus, FiPlus, FiSearch, FiTrash2, FiX, FiMove, FiEye, FiDownload, FiColumns, FiCopy } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { useViewerContext, Viewer, ViewerFolder } from "@src/context/ViewerContext";
import { createPortal } from "react-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

interface ViewerListProps {
    selectedViewerId?: string;
    onSelectViewer: (viewer: Viewer | null) => void;
}

const ViewerList: React.FC<ViewerListProps> = ({ selectedViewerId, onSelectViewer }) => {
    const { viewers, folders, deleteViewer, addFolder, deleteFolder, renameFolder, moveViewer, saveViewer, duplicateViewer } = useViewerContext();
    const { isPro } = useLicense();
    const { openUpgradeDialog } = useUpgradeDialog();
    const [searchTerm, setSearchTerm] = useState("");
    const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
    
    // Modals
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<ViewerFolder | null>(null);
    const [editingViewer, setEditingViewer] = useState<Viewer | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [newViewerName, setNewViewerName] = useState("");

    const toggleFolderCollapse = (folderId: string) => {
        setCollapsedFolderIds(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const handleCreateViewer = async () => {
        if (!isPro && viewers.length >= 1) {
            openUpgradeDialog();
            return;
        }
        const name = `New Viewer ${viewers.length + 1}`;
        const content = JSON.stringify({ blocks: [] });
        const viewer = await saveViewer(name, content);
        onSelectViewer(viewer);
    };

    const filteredViewers = useMemo(() => {
        return viewers.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [viewers, searchTerm]);

    return (
        <div className="flex flex-col h-full select-none">
            <div className="px-4 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Viewers</h2>
                <div className="flex gap-1">
                    <button 
                        onClick={() => setIsFolderModalOpen(true)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded transition-colors"
                        title="New Folder"
                    >
                        <FiFolderPlus size={14} />
                    </button>
                    <button 
                        onClick={handleCreateViewer}
                        className="p-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded transition-all"
                        title="New Viewer"
                    >
                        <FiPlus size={14} />
                    </button>
                    <button 
                        onClick={async () => {
                            const path = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
                            if (path && typeof path === 'string') {
                                try {
                                    const content = await readTextFile(path);
                                    const viewerData = JSON.parse(content);
                                    await saveViewer(viewerData.name || "Imported Viewer", JSON.stringify(viewerData.content || viewerData));
                                } catch (e) {
                                    alert("Failed to import viewer: " + e);
                                }
                            }
                        }}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 rounded transition-colors"
                        title="Import Viewer"
                    >
                        <FiDownload size={14} />
                    </button>
                </div>
            </div>

            <div className="px-3 py-3 border-b border-zinc-900">
                <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                    <input 
                        type="text"
                        placeholder="Search viewers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                {/* Root items */}
                {filteredViewers.filter(v => !v.folderId).map(viewer => (
                    <ViewerItem 
                        key={viewer.id} 
                        viewer={viewer} 
                        isActive={selectedViewerId === viewer.id}
                        onSelect={() => onSelectViewer(viewer)}
                        onRename={() => { setEditingViewer(viewer); setNewViewerName(viewer.name); }}
                        onDuplicate={() => duplicateViewer(viewer.id)}
                        onDelete={() => deleteViewer(viewer.id)}
                    />
                ))}

                {/* Folders */}
                {folders.map(folder => (
                    <FolderItem 
                        key={folder.id}
                        folder={folder}
                        isCollapsed={collapsedFolderIds.has(folder.id)}
                        onToggle={() => toggleFolderCollapse(folder.id)}
                        onRename={() => { setEditingFolder(folder); setNewFolderName(folder.name); setIsFolderModalOpen(true); }}
                        onDelete={() => confirm(`Delete folder "${folder.name}"?`) && deleteFolder(folder.id)}
                    >
                        {filteredViewers.filter(v => v.folderId === folder.id).map(viewer => (
                            <ViewerItem 
                                key={viewer.id} 
                                viewer={viewer} 
                                isNested
                                isActive={selectedViewerId === viewer.id}
                                onSelect={() => onSelectViewer(viewer)}
                                onRename={() => { setEditingViewer(viewer); setNewViewerName(viewer.name); }}
                                onDuplicate={() => duplicateViewer(viewer.id)}
                                onDelete={() => deleteViewer(viewer.id)}
                                    />
                        ))}
                    </FolderItem>
                ))}
            </div>

            {/* Rename Viewer Modal */}
            {editingViewer && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                <FiEdit3 className="text-blue-400" />
                                Rename Viewer
                            </h3>
                            <button onClick={() => setEditingViewer(null)} className="p-1 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input 
                                autoFocus
                                value={newViewerName}
                                onChange={(e) => setNewViewerName(e.target.value)}
                                placeholder="Viewer name"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newViewerName.trim()) {
                                        saveViewer(newViewerName, editingViewer.content, editingViewer.id, editingViewer.folderId);
                                        setEditingViewer(null);
                                    }
                                }}
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setEditingViewer(null)} className="px-4 py-2 text-xs font-bold text-zinc-500">Cancel</button>
                                <button 
                                    onClick={() => {
                                        saveViewer(newViewerName, editingViewer.content, editingViewer.id, editingViewer.folderId);
                                        setEditingViewer(null);
                                    }}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold"
                                >
                                    Rename
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Folder Modal */}
            {isFolderModalOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                <FiFolderPlus className="text-blue-400" />
                                {editingFolder ? "Rename Folder" : "New Folder"}
                            </h3>
                            <button onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); setNewFolderName(""); }} className="p-1 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <input 
                                autoFocus
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder name"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => { setIsFolderModalOpen(false); setEditingFolder(null); setNewFolderName(""); }} className="px-4 py-2 text-xs font-bold text-zinc-500">Cancel</button>
                                <button 
                                    onClick={() => {
                                        if (editingFolder) renameFolder(editingFolder.id, newFolderName);
                                        else addFolder(newFolderName);
                                        setIsFolderModalOpen(false);
                                        setEditingFolder(null);
                                        setNewFolderName("");
                                    }}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold"
                                >
                                    {editingFolder ? "Rename" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const ViewerItem = ({ viewer, isActive, onSelect, onRename, onDuplicate, onDelete, isNested }: { viewer: Viewer, isActive: boolean, onSelect: () => void, onRename: () => void, onDuplicate: () => void, onDelete: () => void, isNested?: boolean }) => (
    <div 
        onClick={onSelect}
        className={twMerge(
            "group flex items-center px-3 py-2 justify-between rounded-lg cursor-pointer transition-all",
            isActive ? "bg-blue-600/20 text-blue-400" : "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200",
            isNested && "ml-4"
        )}
    >
        <div className="flex items-center gap-2 truncate">
            <FiEye size={12} className={isActive ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400"} />
            <span className="text-[11px] font-medium truncate">{viewer.name}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button 
                onClick={(e) => { e.stopPropagation(); onRename(); }}
                className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-blue-400 rounded transition-all"
                title="Rename"
            >
                <FiEdit3 size={10} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-amber-400 rounded transition-all"
                title="Duplicate"
            >
                <FiCopy size={10} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); if(confirm(`Delete viewer "${viewer.name}"?`)) onDelete(); }}
                className="p-1 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded transition-all"
                title="Delete"
            >
                <FiTrash2 size={10} />
            </button>
        </div>
    </div>
);

const FolderItem = ({ folder, isCollapsed, onToggle, onRename, onDelete, children }: { folder: ViewerFolder, isCollapsed: boolean, onToggle: () => void, onRename: () => void, onDelete: () => void, children: React.ReactNode }) => (
    <div className="space-y-0.5">
        <div 
            onClick={onToggle}
            className="group flex items-center px-3 py-1.5 justify-between rounded-lg cursor-pointer hover:bg-zinc-900/50 transition-all"
        >
            <div className="flex items-center gap-2">
                {isCollapsed ? <FiChevronRight size={12} className="text-zinc-600" /> : <FiChevronDown size={12} className="text-blue-500" />}
                <FiFolder size={12} className={isCollapsed ? "text-zinc-700" : "text-amber-500"} />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300 transition-colors">{folder.name}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onRename(); }} className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-blue-400 rounded"><FiEdit3 size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-red-400 rounded"><FiTrash2 size={10} /></button>
            </div>
        </div>
        {!isCollapsed && children}
    </div>
);

export default ViewerList;
