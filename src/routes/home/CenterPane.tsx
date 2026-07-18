import React, { useEffect, useRef, useState } from "react";
import SplitPane, { Pane, SashContent } from "@src/packages/ui/SplitPane";

import { BottomPaneProvider } from "@src/context/BottomPaneContext";
import { FilterProvider } from "@src/context/FilterContext";
import { BottomPaneOptions } from "@src/packages/bottom-pane/BottomPaneOptions";
import { FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { useSettingsContext } from "../../context/SettingsProvider";
import { usePaneContext } from "../../context/PaneProvider";
import { BottomPane } from "../../packages/bottom-pane/BottomPane";
import { FilterBar } from "../../packages/filter-bar/FilterBar";
import { MainContent } from "../../packages/main-content/MainContent";

export const CenterPane: React.FC<{ tabId: string }> = ({ tabId }) => {
  const { sizesCenterPane, setSizesCenterPane, bottomPaneTabPosition } = useSettingsContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const [restoredHeight, setRestoredHeight] = useState(() => {
    const saved = localStorage.getItem("ns_restored_center_height");
    return saved ? parseInt(saved) : 300;
  });

  useEffect(() => {
    localStorage.setItem("ns_restored_center_height", restoredHeight.toString());
  }, [restoredHeight]);

  useEffect(() => {
    const updateInitialSizes = () => {
      if (containerRef.current) {
        const totalHeight = containerRef.current.clientHeight;
        if (sizesCenterPane[0] === 0 && sizesCenterPane[1] === 0) {
          const topHeight = Math.floor(totalHeight * 0.6);
          const bottomHeight = totalHeight - topHeight;
          setSizesCenterPane([topHeight, bottomHeight]);
          setRestoredHeight(topHeight);
        }
      }
    };

    updateInitialSizes();

    const observer = new ResizeObserver(updateInitialSizes);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const toggleMaximize = () => {
    if (containerRef.current) {
      const totalHeight = containerRef.current.clientHeight;
      if (sizesCenterPane[0] === 0) {
        const topHeight = restoredHeight > 0 ? restoredHeight : Math.floor(totalHeight * 0.6);
        setSizesCenterPane([topHeight, totalHeight - topHeight]);
      } else {
        setRestoredHeight(sizesCenterPane[0]);
        setSizesCenterPane([0, totalHeight]);
      }
    }
  };

  const { isDisplayPane } = usePaneContext();
  const splitDirection = isDisplayPane.centerLayout === "horizontal" ? "vertical" : "horizontal";

  // React to global bottom pane toggle
  useEffect(() => {
    if (containerRef.current && isDisplayPane.bottom !== undefined) {
      const totalSize = splitDirection === "horizontal" 
        ? containerRef.current.clientHeight 
        : containerRef.current.clientWidth;

      if (totalSize === 0) return;

      if (!isDisplayPane.bottom) {
        // Hide bottom pane
        if (sizesCenterPane[1] !== 0) {
          setRestoredHeight(sizesCenterPane[0]); // Save for later
          setSizesCenterPane([totalSize, 0]);
        }
      } else {
        // Show bottom pane if it was hidden
        if (sizesCenterPane[1] === 0) {
          const restored = restoredHeight > 0 ? restoredHeight : Math.floor(totalSize * 0.6);
          setSizesCenterPane([restored, totalSize - restored]);
        }
      }
    }
  }, [isDisplayPane.bottom, splitDirection]);

  const isMaximized = sizesCenterPane[0] === 0;

  return (
    <FilterProvider tabId={tabId}>
      <div className="flex flex-col h-full">
        <div className="w-full">
          <FilterBar />
        </div>
        <div
          ref={containerRef}
          className="w-full flex-1 min-h-0 relative group/center-pane"
        >
          <SplitPane
            className="h-full"
            split={splitDirection}
            sashRender={() => <SashContent type="vscode" />}
            sizes={sizesCenterPane}
            onChange={setSizesCenterPane}
          >
            <Pane minSize="0%" maxSize="85%">
              <div className="w-full h-full bg-[#23262a] overflow-auto">
                <MainContent />
              </div>
            </Pane>
            <Pane>
              {isDisplayPane.bottom && (
                <BottomPaneProvider>
                    <div className={twMerge(
                      "flex relative w-full h-full",
                      bottomPaneTabPosition === "top" ? "flex-col" : "flex-col-reverse"
                    )}>
                      {splitDirection === "horizontal" && (
                        <button
                          onClick={toggleMaximize}
                          className={twMerge(
                            "absolute left-1/2 -translate-x-1/2 z-[1000] -top-3",
                            "flex flex-col items-center gap-0.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-2xl group/maximize-btn rounded-full border",
                            "backdrop-blur-md bg-[#1e1e1ea0] border-zinc-700/50 text-zinc-500",
                            "px-6 py-1 opacity-40 hover:opacity-100 hover:px-10 hover:py-1.5 hover:bg-blue-600 hover:border-blue-400 hover:text-white hover:shadow-blue-500/40 active:scale-95"
                          )}
                          title={isMaximized ? "Restore size" : "Maximize bottom pane"}
                        >
                          <div className="w-8 h-1 bg-zinc-600 rounded-full group-hover/maximize-btn:bg-white/40 transition-colors" />
                          <div className="flex flex-col items-center">
                            {isMaximized ? (
                              <FiChevronDown size={14} className="group-hover/maximize-btn:scale-110 transition-transform" />
                            ) : (
                              <FiChevronUp size={14} className="group-hover/maximize-btn:scale-110 transition-transform" />
                            )}
                          </div>
                        </button>
                      )}
                      <div className='w-full bg-[#1e1e1e] z-10'>
                        <BottomPaneOptions />
                      </div>
                      <div className="flex-1 min-h-0">
                        <BottomPane />
                      </div>
                    </div>
                </BottomPaneProvider>
              )}
            </Pane>
          </SplitPane>
        </div>
      </div>
    </FilterProvider>
  );
};
