import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Viewer, ViewerBlock, ViewerContent, ViewerMatcher, useViewerContext } from "@src/context/ViewerContext";
import { useTrafficListContext } from "@src/packages/main-content/context/TrafficList";
import { useSessionContext } from "@src/context/SessionContext";
import { useAppProvider } from "@src/packages/app-env";
import { getDefaultCode, getDefaultHtml, getDefaultCss } from "../builder-utils/defaults";
import { executeViewerBlock } from "../builder-utils/viewerRunner";
import { useAtom } from "jotai";
import { 
    viewerBuilderBlocksAtom, 
    viewerBuilderMatchersAtom, 
    viewerBuilderNameAtom, 
    viewerBuilderTestSourceAtom, 
    viewerBuilderSelectedSessionIdAtom, 
    viewerBuilderSelectedTrafficIdAtom, 
    viewerBuilderFilterAtom,
    viewerBuilderViewModeAtom,
    viewerBuilderAiAssistantVisibleAtom,
    viewerBuilderToolboxVisibleAtom,
    viewerBuilderMaximizedBlockIdAtom,
    viewerBuilderCanvasPaddingAtom,
    viewerBuilderGridGapAtom
} from "@src/utils/viewerBuilderAtoms";

export const useViewerBuilderState = (initialViewer: Viewer, autosave: boolean = true) => {
    const { saveViewer } = useViewerContext();
    const { trafficList } = useTrafficListContext();
    const { sessions } = useSessionContext();
    const { provider } = useAppProvider();

    const [viewerName, setViewerName] = useAtom(viewerBuilderNameAtom(initialViewer.id));
    const [isEditingName, setIsEditingName] = useState(false);

    const parsedContent: ViewerContent = useMemo(() => {
        try {
            return JSON.parse(initialViewer.content);
        } catch (e) {
            return { blocks: [] };
        }
    }, [initialViewer.content]);

    const [blocks, setBlocks] = useAtom(viewerBuilderBlocksAtom(initialViewer.id));
    const [matchers, setMatchers] = useAtom(viewerBuilderMatchersAtom(initialViewer.id));
    
    const [testSource, setTestSource] = useAtom(viewerBuilderTestSourceAtom(initialViewer.id));
    const [selectedSessionId, setSelectedSessionId] = useAtom(viewerBuilderSelectedSessionIdAtom(initialViewer.id));
    const [selectedTrafficId, setSelectedTrafficId] = useAtom(viewerBuilderSelectedTrafficIdAtom(initialViewer.id));
    const [filter, setFilter] = useAtom(viewerBuilderFilterAtom(initialViewer.id));

    const [isToolboxVisible, setIsToolboxVisible] = useAtom(viewerBuilderToolboxVisibleAtom(initialViewer.id));
    const [maximizedBlockId, setMaximizedBlockId] = useAtom(viewerBuilderMaximizedBlockIdAtom(initialViewer.id));
    const [sessionTraffic, setSessionTraffic] = useState<any[]>([]);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [isRunning, setIsRunning] = useState(false);
    const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useAtom(viewerBuilderViewModeAtom(initialViewer.id));
    const [isAiAssistantVisible, setIsAiAssistantVisible] = useAtom(viewerBuilderAiAssistantVisibleAtom(initialViewer.id));
    
    const [canvasPadding, setCanvasPadding] = useAtom(viewerBuilderCanvasPaddingAtom(initialViewer.id));
    const [gridGap, setGridGap] = useAtom(viewerBuilderGridGapAtom(initialViewer.id));
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (testSource === 'session' && selectedSessionId) {
            setIsSessionLoading(true);
            invoke("get_session_traffic", { id: selectedSessionId })
                .then((data: any) => {
                    setSessionTraffic(data);
                    setIsSessionLoading(false);
                })
                .catch((err) => {
                    console.error(err);
                    setIsSessionLoading(false);
                });
        } else {
            setSessionTraffic([]);
            setIsSessionLoading(false);
        }
    }, [testSource, selectedSessionId]);

    const runPreview = useCallback(async () => {
        if (!selectedTrafficId) return;
        setIsRunning(true);
        const results: Record<string, any> = {};

        const executeBlock = async (block: ViewerBlock) => {
            return executeViewerBlock(block, {
                trafficId: selectedTrafficId,
                isReviewMode: testSource === 'session',
                reviewedSessionId: selectedSessionId || undefined,
                provider
            });
        };

        if (!blocks) return;

        const blockPromises = blocks.map(async (block) => {
            results[block.id] = await executeBlock(block);
        });
        
        await Promise.all(blockPromises);

        setTestResults(results);
        setIsRunning(false);
    }, [selectedTrafficId, blocks, testSource, selectedSessionId, provider]);

    useEffect(() => {
        if (selectedTrafficId && blocks && blocks.length > 0) {
            runPreview();
        }
    }, [selectedTrafficId, blocks, runPreview]);

    const [externalTrafficItem, setExternalTrafficItem] = useState<any | null>(null);
    const currentDataSource = testSource === 'live' ? trafficList : sessionTraffic;

    // Fetch traffic metadata if the ID is known but the item is missing from the current list
    useEffect(() => {
        if (selectedTrafficId && testSource === 'live') {
            const existsInList = trafficList.some(t => t.id === selectedTrafficId);
            if (!existsInList) {
                provider.getAllMetadata().then(all => {
                    const found = all.find(t => t.id === selectedTrafficId);
                    if (found) setExternalTrafficItem(found);
                });
            } else {
                setExternalTrafficItem(null);
            }
        } else {
            setExternalTrafficItem(null);
        }
    }, [selectedTrafficId, testSource, trafficList, provider]);

    const filteredTraffic = useMemo(() => {
        const baseItems = currentDataSource.filter((t: any) => t.intercepted);
        const activeFilter = filter || "";
        
        if (!activeFilter.trim()) return baseItems;
        const lowFilter = activeFilter.toLowerCase();
        return baseItems.filter((t: any) =>
            (t.method || "").toLowerCase().includes(lowFilter) ||
            (t.uri || t.url || "").toLowerCase().includes(lowFilter) ||
            t.id.includes(lowFilter)
        );
    }, [currentDataSource, filter]);

    const currentIndex = filteredTraffic.findIndex(t => t.id === selectedTrafficId);
    const selectedTraffic = useMemo(() => {
        const inList = currentDataSource.find(t => t.id === selectedTrafficId);
        return inList || externalTrafficItem;
    }, [currentDataSource, selectedTrafficId, externalTrafficItem]);

    const { selections } = useTrafficListContext();
    // lastActiveViewerIdAtom removed


    // Track the last loaded viewer ID to avoid redundant initializations
    const lastLoadedId = useRef<string | null>(null);

    useEffect(() => {
        // Initialize atoms only if they are null (uninitialized)
        if (viewerName === null) setViewerName(initialViewer.name);
        if (blocks === null) setBlocks(parsedContent.blocks);
        if (matchers === null) setMatchers(parsedContent.matchers || []);
        
        if (testSource === null || selectedTrafficId === null || filter === null) {
            const config = parsedContent.previewConfig;
            if (testSource === null) setTestSource(config?.testSource || 'live');
            if (selectedSessionId === null) setSelectedSessionId(config?.selectedSessionId || "");
            
            if (selectedTrafficId === null) {
                if (config?.selectedTrafficId) {
                    setSelectedTrafficId(config.selectedTrafficId);
                } else if (selections.firstSelected?.id) {
                    setSelectedTrafficId(String(selections.firstSelected.id));
                } else {
                    setSelectedTrafficId("");
                }
            }

            if (filter === null) {
                if (config?.filter && config.filter !== "create") {
                    setFilter(config.filter);
                } else {
                    setFilter("");
                }
            }
        }

        if (viewMode === null) setViewMode('preview');
        if (isAiAssistantVisible === null) setIsAiAssistantVisible(false);
        if (isToolboxVisible === null) setIsToolboxVisible(true);

        if (canvasPadding === null) setCanvasPadding(parsedContent.layoutConfig?.canvasPadding ?? 48);
        if (gridGap === null) setGridGap(parsedContent.layoutConfig?.gridGap ?? 48);
    }, [initialViewer.id, parsedContent]);

    const handleSave = async () => {
        const content: ViewerContent = {
            blocks: blocks || [],
            matchers: matchers || [],
            previewConfig: {
                testSource: testSource || 'live',
                selectedSessionId: selectedSessionId || "",
                filter: filter || "",
                selectedTrafficId: selectedTrafficId || ""
            },
            layoutConfig: {
                canvasPadding: canvasPadding ?? 48,
                gridGap: gridGap ?? 48
            }
        };
        setIsSaving(true);
        await saveViewer(viewerName || initialViewer.name, JSON.stringify(content), initialViewer.id, initialViewer.folderId);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!autosave) return;

        if (autoSaveTimer.current) {
            clearTimeout(autoSaveTimer.current);
        }

        autoSaveTimer.current = setTimeout(() => {
            const content: ViewerContent = {
                blocks: blocks || [],
                matchers: matchers || [],
                previewConfig: {
                    testSource: testSource || 'live',
                    selectedSessionId: selectedSessionId || "",
                    filter: filter || "",
                    selectedTrafficId: selectedTrafficId || ""
                },
                layoutConfig: {
                    canvasPadding: canvasPadding ?? 48,
                    gridGap: gridGap ?? 48
                }
            };
            saveViewer(viewerName || initialViewer.name, JSON.stringify(content), initialViewer.id, initialViewer.folderId);
        }, 2000);

        return () => {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current);
            }
        };
    }, [autosave, blocks, matchers, viewerName, testSource, selectedSessionId, selectedTrafficId, filter, canvasPadding, gridGap]);

    const addBlock = (type: ViewerBlock['type']) => {
        const newBlock: ViewerBlock = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            title: `New ${type.toUpperCase()} Block`,
            code: getDefaultCode(type),
            colSpan: 12,
            html: type === 'html' ? getDefaultHtml() : undefined,
            css: type === 'html' ? getDefaultCss() : undefined,
            padding: type === 'html' ? 0 : 4
        };
        setBlocks(prev => [...(prev || []), newBlock]);
    };

    const injectBlock = (block: ViewerBlock) => {
        setBlocks(prev => [...(prev || []), { ...block, id: block.id || Math.random().toString(36).substr(2, 9) }]);
    };

    const deleteBlock = (id: string) => {
        setBlocks(prev => (prev || []).filter(b => b.id !== id));
    };

    const updateBlock = (id: string, updates: Partial<ViewerBlock>) => {
        setBlocks(prev => (prev || []).map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const clearBlocks = () => {
        setBlocks([]);
    };

    const goNext = () => {
        if (currentIndex < filteredTraffic.length - 1) {
            setSelectedTrafficId(filteredTraffic[currentIndex + 1].id);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setSelectedTrafficId(filteredTraffic[currentIndex - 1].id);
        }
    };

    return {
        viewerName: viewerName || initialViewer.name, setViewerName,
        isEditingName, setIsEditingName,
        blocks: blocks || [], setBlocks,
        matchers: matchers || [], setMatchers,
        testSource: testSource || 'live', setTestSource,
        selectedSessionId: selectedSessionId || "", setSelectedSessionId,
        selectedTrafficId: selectedTrafficId || "", setSelectedTrafficId,
        filter: filter || "", setFilter,
        isToolboxVisible: isToolboxVisible ?? true, setIsToolboxVisible,
        maximizedBlockId, setMaximizedBlockId,
        testResults,
        isRunning,
        isSessionLoading,
        isSourceDialogOpen, setIsSourceDialogOpen,
        viewMode: viewMode || 'preview', setViewMode,
        filteredTraffic,
        currentIndex,
        selectedTraffic,
        handleSave,
        addBlock,
        injectBlock,
        deleteBlock,
        updateBlock,
        clearBlocks,
        runPreview,
        goNext,
        goPrev,
        sessions,
        isAiAssistantVisible: isAiAssistantVisible ?? false,
        setIsAiAssistantVisible,
        canvasPadding: canvasPadding ?? 48,
        setCanvasPadding,
        gridGap: gridGap ?? 48,
        setGridGap,
        isSaving,
        saveSuccess
    };
};
