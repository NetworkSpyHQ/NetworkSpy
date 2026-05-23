import { Outlet, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { LeftSidebar } from "./packages/sidebar/LeftSidebar";
import { ProStatusDialog } from "./packages/sidebar/ProStatusDialog";
import { StatusInfoDialog } from "./packages/ui/StatusInfoDialog";
import { TitleBarTraffic, TitleBarViewerBuilder, TitleBarSetting } from "./packages/ui/TitleBar";


import { getCurrentWindow } from "@tauri-apps/api/window";
import { twMerge } from "tailwind-merge";
import { useAppUpdater } from "./hooks/useAppUpdater";

import { useAtom } from 'jotai';
import { titleBarContentAtom } from '@src/utils/trafficAtoms';

export default function Layout() {
  useAppUpdater();
  const [customContent] = useAtom(titleBarContentAtom);
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);
  const [isMainWindow] = useState(() => {
    try {
      return getCurrentWindow().label === "main";
    } catch (e) {
      return true;
    }
  });
  const [isMac] = useState(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);


  const location = useLocation();
  const isTrafficList = location.pathname === "/";
  const isSettings = location.pathname === "/settings";
  const showTitleBar = isTrafficList || isSettings || !!customContent;

  const renderTitleBar = () => {
    if (!!customContent) return <TitleBarViewerBuilder />;
    if (isTrafficList) return <TitleBarTraffic />;
    if (isSettings) return <TitleBarSetting />;
    return null;
  };

  return (
    <div className={twMerge(
      "flex flex-col w-screen h-screen overflow-hidden rounded-[12px] border border-white/5 shadow-2xl",
      isMainWindow ? "bg-zinc-950/70 backdrop-blur-3xl" : "bg-black/90 backdrop-blur-2xl"
    )}>


      {showTitleBar ? (
        renderTitleBar()
      ) : (
        /* Ghost TitleBar for Mac to prevent overlapping native buttons */
        isMac && (
          <div className="h-8 shrink-0 flex items-center pointer-events-none" data-tauri-drag-region>
            <div className="w-20 shrink-0 h-full" data-tauri-drag-region />
          </div>
        )
      )}

      <div id="main-layout" className="flex flex-row flex-grow h-0 min-h-0 overflow-hidden">
        {isMainWindow && <LeftSidebar />}

        <div id="main-content-route" className="flex-grow min-h-0 overflow-hidden relative">
          <Outlet />
        </div>
      </div>

      <ProStatusDialog
        isOpen={isProDialogOpen}
        onClose={() => setIsProDialogOpen(false)}
      />
      <StatusInfoDialog />
    </div>


  );
}
