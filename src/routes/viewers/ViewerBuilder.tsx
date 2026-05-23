import React, { useState, useEffect } from "react";
import { Viewer, ViewerBlock } from "@src/context/ViewerContext";
import { useViewerBuilderState } from "./builder-hooks/useViewerBuilderState";
import { useAtom } from "jotai";
import { titleBarContentAtom } from "@src/utils/trafficAtoms";
import { useSettingsContext } from "@src/context/SettingsProvider";

// Components
import { BuilderHeader } from "./builder-components/BuilderHeader";
import { Canvas } from "./builder-components/Canvas";
import { Toolbox } from "./builder-components/Toolbox";
import { SourceDialog } from "./builder-components/SourceDialog";
import { FullSourceEditor } from "./builder-components/FullSourceEditor";
import { JsonSourceEditor } from "./builder-components/JsonSourceEditor";
import { AiBuilderSidebar } from "./builder-components/AiBuilderSidebar";
import { TestContextOverlay } from "./builder-components/TestContextOverlay";

interface ViewerBuilderProps {
    viewer: Viewer;
    onBack?: () => void;
}

const ViewerBuilder: React.FC<ViewerBuilderProps> = ({ viewer: initialViewer, onBack }) => {
    const { autosave } = useSettingsContext();

    const {
        viewerName, setViewerName,
        isEditingName, setIsEditingName,
        blocks, setBlocks,
        testSource, setTestSource,
        selectedSessionId, setSelectedSessionId,
        selectedTrafficId, setSelectedTrafficId,
        filter, setFilter,
        isToolboxVisible, setIsToolboxVisible,
        maximizedBlockId, setMaximizedBlockId,
        testResults,
        matchers, setMatchers,
        isRunning,
        isSourceDialogOpen, setIsSourceDialogOpen,
        viewMode, setViewMode,
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
        isAiAssistantVisible,
        setIsAiAssistantVisible,
        canvasPadding,
        setCanvasPadding,
        gridGap,
        setGridGap,
        isSaving,
        saveSuccess,
        isSessionLoading
    } = useViewerBuilderState(initialViewer, autosave);

    const [, setTitleBarContent] = useAtom(titleBarContentAtom);

    useEffect(() => {
        setTitleBarContent(
            <BuilderHeader
                viewerName={viewerName}
                setViewerName={setViewerName}
                isEditingName={isEditingName}
                setIsEditingName={setIsEditingName}
                isToolboxVisible={isToolboxVisible}
                setIsToolboxVisible={setIsToolboxVisible}
                isAiAssistantVisible={isAiAssistantVisible}
                setIsAiAssistantVisible={setIsAiAssistantVisible}
                handleSave={handleSave}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
                blocks={blocks}
                testResults={testResults}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onBack={onBack}
                autosave={autosave}
            />
        );
        return () => setTitleBarContent(null);
    }, [
        viewerName, isEditingName, isToolboxVisible, 
        isAiAssistantVisible, viewMode, blocks, testResults,
        onBack, handleSave, setViewerName, setIsEditingName, 
        setIsToolboxVisible, setIsAiAssistantVisible, setViewMode, setTitleBarContent,
        autosave
    ]);

    const mainContent = () => {
        switch (viewMode) {
            case 'preview':
                return (
                    <Canvas
                        blocks={blocks}
                        maximizedBlockId={maximizedBlockId}
                        setMaximizedBlockId={setMaximizedBlockId}
                        testResults={testResults}
                        updateBlock={updateBlock}
                        deleteBlock={deleteBlock}
                        onDebugWithAi={handleDebugWithAi}
                        canvasPadding={canvasPadding}
                        gridGap={gridGap}
                    />
                );
            case 'json':
                return (
                    <JsonSourceEditor
                        blocks={blocks}
                        matchers={matchers}
                        previewConfig={{
                            testSource,
                            selectedSessionId,
                            selectedTrafficId,
                            filter
                        }}
                        onUpdate={(data) => {
                            setBlocks(data.blocks);
                            setMatchers(data.matchers);
                        }}
                    />
                );
            case 'source':
                return (
                    <FullSourceEditor
                        viewerName={viewerName}
                        blocks={blocks}
                        testResults={testResults}
                    />
                );
        }
    };

    const [aiIncomingMessage, setAiIncomingMessage] = useState<string | undefined>(undefined);

    const handleDebugWithAi = (blockId: string, error: string) => {
        setIsAiAssistantVisible(true);
        const block = blocks.find(b => b.id === blockId);
        setAiIncomingMessage(`I'm getting an error in my block "${block?.title || blockId}": \n\n\`\`\`\n${error}\n\`\`\`\n\nCan you analyze the current traffic and help me fix this?`);

        // Reset the incoming message after a delay so it can be re-triggered
        setTimeout(() => setAiIncomingMessage(undefined), 1000);
    };

    const reorderBlocks = (ids: string[]) => {
        setBlocks(prev => {
            if (!prev) return prev;
            const newBlocks = ids.map(id => prev.find(b => b.id === id)).filter(Boolean) as ViewerBlock[];
            const remainingBlocks = prev.filter(b => !ids.includes(b.id));
            return [...newBlocks, ...remainingBlocks];
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#050505]">
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 flex overflow-hidden">
                        {mainContent()}
                    </div>

                    {viewMode === 'preview' && (
                        <TestContextOverlay
                            selectedTraffic={selectedTraffic}
                            testSource={testSource}
                            setIsSourceDialogOpen={setIsSourceDialogOpen}
                            goPrev={goPrev}
                            goNext={goNext}
                            currentIndex={currentIndex}
                            totalTraffic={filteredTraffic.length}
                            runPreview={runPreview}
                            isRunning={isRunning}
                        />
                    )}
                </div>

                <Toolbox
                    isVisible={isToolboxVisible}
                    maximizedBlockId={maximizedBlockId}
                    addBlock={addBlock}
                    matchers={matchers}
                    setMatchers={setMatchers}
                    canvasPadding={canvasPadding}
                    setCanvasPadding={setCanvasPadding}
                    gridGap={gridGap}
                    setGridGap={setGridGap}
                />

                <AiBuilderSidebar
                    isVisible={isAiAssistantVisible}
                    onClose={() => setIsAiAssistantVisible(false)}
                    blocks={blocks}
                    onInjectBlock={injectBlock}
                    onRemoveBlock={deleteBlock}
                    onUpdateBlock={updateBlock}
                    onClearBlocks={clearBlocks}
                    onReorderBlocks={reorderBlocks}
                    onSetTestSource={setTestSource}
                    onSetSelectedTrafficId={setSelectedTrafficId}
                    onSetSelectedSessionId={setSelectedSessionId}
                    selectedTrafficId={selectedTrafficId}
                    testSource={testSource}
                    selectedSessionId={selectedSessionId}
                    testResults={testResults}
                    incomingMessage={aiIncomingMessage}
                />
            </div>

            <SourceDialog
                isOpen={isSourceDialogOpen}
                onClose={() => setIsSourceDialogOpen(false)}
                testSource={testSource}
                setTestSource={setTestSource}
                selectedSessionId={selectedSessionId}
                setSelectedSessionId={setSelectedSessionId}
                selectedTrafficId={selectedTrafficId}
                setSelectedTrafficId={setSelectedTrafficId}
                filter={filter}
                setFilter={setFilter}
                filteredTraffic={filteredTraffic}
                sessions={sessions}
                isSessionLoading={isSessionLoading}
            />
        </div>
    );
};

export default ViewerBuilder;
