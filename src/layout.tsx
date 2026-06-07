import { Outlet, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { LeftSidebar } from "./packages/sidebar/LeftSidebar";
import { ProStatusDialog } from "./packages/sidebar/ProStatusDialog";
import { StatusInfoDialog } from "./packages/ui/StatusInfoDialog";
import { TitleBarTraffic, TitleBarViewerBuilder, TitleBarViewerList, TitleBarSetting } from "./packages/ui/TitleBar";

import { platform } from "@tauri-apps/plugin-os";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { twMerge } from "tailwind-merge";
import { useAppUpdater } from "./hooks/useAppUpdater";

import { useAtom, useSetAtom } from 'jotai';
import { titleBarContentAtom, osAtom, isLicensedAtom } from '@src/utils/trafficAtoms';
import { useLicense } from '@src/hooks/useLicense';
import { AppPlan } from '@src/models/Plan';

export default function Layout() {
  useAppUpdater();
  const [customContent] = useAtom(titleBarContentAtom);
  const [, setOs] = useAtom(osAtom);
  const setIsLicensed = useSetAtom(isLicensedAtom);
  const { getPlan } = useLicense();

  useEffect(() => {
    setOs(platform());
    getPlan().then(plan => {
      const appPlan = AppPlan.fromString(plan);
      setIsLicensed(appPlan?.isPro ?? false);
    });
  }, []);
  const [isProDialogOpen, setIsProDialogOpen] = useState(false);
  const [isMainWindow] = useState(() => {
    try {
      return getCurrentWindow().label === "main";
    } catch (e) {
      return true;
    }
  });

  const location = useLocation();
  const isTrafficList = location.pathname === "/";
  const isSettings = location.pathname === "/settings";
  const isViewerList = location.pathname === "/viewers";

  const renderTitleBar = () => {
    if (!!customContent) return <TitleBarViewerBuilder />;
    if (isTrafficList) return <TitleBarTraffic />;
    if (isViewerList) return <TitleBarViewerList />;
    if (isSettings) return <TitleBarSetting />;
    return <TitleBarSetting />;
  };

  return (
    <div className={twMerge(
      "flex flex-col w-screen h-screen overflow-hidden border border-white/5 shadow-2xl",
      isMainWindow ? "bg-zinc-950/70 backdrop-blur-3xl" : "bg-black/90 backdrop-blur-2xl"
    )}>

      {isMainWindow && renderTitleBar()}

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
