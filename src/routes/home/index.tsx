import { activeTabIdAtom, WorkspaceTab, workspaceTabsAtom } from "@src/utils/trafficAtoms";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";

import SplitPane, { Pane } from "@src/packages/ui/SplitPane";

import { useUpgradeDialog } from "@src/context/UpgradeContext";
import { useLicense } from "@src/hooks/useLicense";
import { useAppProvider } from "@src/packages/app-env";
import {
  useTrafficListContext
} from "@src/packages/main-content/context/TrafficList";
import { TrafficItemMap } from "@src/packages/main-content/model/TrafficItemMap";
import { RightSidebar } from "@src/packages/sidebar/RightSidebar";
import { NSTabs } from "@src/packages/ui/NSTabs";
import { WelcomeDialog } from "@src/packages/ui/WelcomeDialog";
import { usePaneContext } from "../../context/PaneProvider";
import { useSessionContext } from "../../context/SessionContext";
import { useSettingsContext } from "@src/context/SettingsProvider";
import { CenterPane } from "./CenterPane";

const Content = () => {
  const paneSizeConfig = {
    leftPane: {
      min: "10%",
      max: "80%",
    },
    rightPane: {
      min: "10%",
      max: "80%",
    },
  };
  const { mainWindowSizes: sizes, setMainWindowSizes: setSizes } = useSettingsContext();

  const { setTrafficList, trafficSet, setTrafficSet } = useTrafficListContext();
  const { isDisplayPane, setIsDisplayPane } = usePaneContext();

  useEffect(() => {
    if (isDisplayPane.right) {
      if (sizes[1] === "0%") setSizes(["70%", "25%"]);
    } else {
      if (sizes[1] !== "0%") setSizes([sizes[0], "0%"]);
    }
  }, [isDisplayPane.right]);

  const { provider, isRun, setIsRun, clearData } = useAppProvider();
  const { isReviewMode } = useSessionContext();
  const { getLimit } = useLicense();
  const { openUpgradeDialog } = useUpgradeDialog();

  const [activeTabId, setActiveTabId] = useAtom(activeTabIdAtom);
  const [tabsList, setTabsList] = useAtom(workspaceTabsAtom);


  const [showWelcomeCert, setShowWelcomeCert] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ns_acknowledged_features");
      const acknowledged = saved ? JSON.parse(saved) : {};
      console.log("[Welcome] Acknowledged features:", acknowledged);

      if (!acknowledged.welcome_certificate) {
        setShowWelcomeCert(true);
      }
    } catch (e) {
      console.error("Failed to check acknowledged features", e);
      setShowWelcomeCert(true); // Default to showing if error occurs
    }
  }, []);

  const acknowledgeFeature = (featureId: string) => {
    const acknowledged = JSON.parse(localStorage.getItem("ns_acknowledged_features") || "{}");
    acknowledged[featureId] = true;
    localStorage.setItem("ns_acknowledged_features", JSON.stringify(acknowledged));
    if (featureId === "welcome_certificate") setShowWelcomeCert(false);
  };

  useEffect(() => {
    if (tabsList.length === 0) {
      const initialId = `tab-live-${Date.now()}`;
      setTabsList([{ id: initialId, title: "Live Traffic" }]);
      setActiveTabId(initialId);
    }
  }, []);

  const tabs = useMemo(() => {
    return tabsList.map(t => ({
      ...t,
      content: <CenterPane tabId={t.id} />
    }));
  }, [tabsList]);


  useEffect(() => {
    const toSave = tabs.map(({ id, title }) => ({ id, title }));
    localStorage.setItem("ns_workspace_tabs", JSON.stringify(toSave));
  }, [tabs]);

  // Stop traffic when in review mode
  useEffect(() => {
    if (isReviewMode && isRun) {
      setIsRun(false);
    }
  }, [isReviewMode, isRun, setIsRun]);

  // Reset traffic list when switching between live and review mode
  // useEffect(() => {
  //   if (!isReviewMode) {
  //     const loadLiveTraffic = async () => {
  //       try {
  //         const traffic = await provider.getAllMetadata();
  //         setTrafficList(traffic);

  //         const newSet: Record<string, any> = {};
  //         traffic.forEach(t => {
  //           newSet[(t as any).id] = t;
  //         });
  //         setTrafficSet(newSet);
  //       } catch (e) {
  //         console.error("Failed to load live traffic", e);
  //       }
  //     };
  //     loadLiveTraffic();
  //   }
  // }, [isReviewMode, provider, setTrafficList, setTrafficSet]);

  const handleAddTab = async () => {
    const limit = await getLimit('max_tabs');
    if (tabsList.length >= limit) {
      openUpgradeDialog();
      return;
    }

    const newId = `tab-${Date.now()}`;
    const newTab: WorkspaceTab = {
      id: newId,
      title: `Session ${tabsList.length + 1}`,
    };
    setTabsList((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string) => {
    setTabsList((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fallbackId = `tab-live-${Date.now()}`;
        setActiveTabId(fallbackId);
        return [{ id: fallbackId, title: "Live Traffic" }];
      }
      if (id === activeTabId) {
        const index = prev.findIndex(t => t.id === id);
        const nextTab = prev[index + 1] || prev[index - 1];
        if (nextTab) setActiveTabId(nextTab.id);
      }
      return remaining;
    });
  };

  const handleRenameTab = (id: string, newTitle: string) => {
    setTabsList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
    );
  };


  useEffect(() => {
    if (isReviewMode) return;

    let unlisten: (() => void) | undefined;

    provider.listenTraffic((traffic) => {
      setTrafficSet((prev) => ({
        ...prev,
        [traffic.id]: traffic,
      }));

      setTrafficList((prevData) => {
        const existingTrafficIndex = prevData.findIndex(
          (t) => t.id === traffic.id
        );

        const formatBytes = (bytes: number) => {
          if (bytes === 0) return "0 B";
          const k = 1024;
          const sizes = ["B", "KB", "MB", "GB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        };

        const listItem: TrafficItemMap = {
          id: traffic.id,
          tags: traffic.tags || [],
          url: traffic.uri || "-",
          client: traffic.client || "Local",
          method: traffic.method,
          code: traffic.response?.status_code?.toString() || "-",
          time: traffic.time,
          duration: traffic.duration || "0 ms",
          request: formatBytes(traffic.request.size),
          response: traffic.response ? formatBytes(traffic.response.size) : "-",
          performance: (traffic as any).performance,
          intercepted: traffic.intercepted,
          timestamp: traffic.timestamp,
        };

        if (existingTrafficIndex !== -1) {
          const updatedTraffic = {
            ...prevData[existingTrafficIndex],
            ...listItem,
            tags: traffic.tags && traffic.tags.length > 0 ? traffic.tags : prevData[existingTrafficIndex].tags,
          };
          return [
            ...prevData.slice(0, existingTrafficIndex),
            updatedTraffic,
            ...prevData.slice(existingTrafficIndex + 1),
          ];
        } else {
          return [...prevData, listItem];
        }
      });
    }).then(fn => { unlisten = fn; });

    let unlistenTags: (() => void) | undefined;
    provider.listenTagsUpdated((event) => {
      setTrafficList((current) => current.map(item => {
        if (item.id === event.id) {
          return { ...item, tags: event.tags };
        }
        return item;
      }));
    }).then(fn => { unlistenTags = fn; });

    return () => {
      if (unlisten) unlisten();
      if (unlistenTags) unlistenTags();
    };
  }, [provider, isRun, isReviewMode]);

  const getNewSizes = (params: any, index: number) => {
    return sizes.map((size, idx) =>
      idx === index ? (params ? "0%" : "15%") : size
    );
  };

  return (
    <div className='select-none flex flex-col h-full overflow-hidden'>
      <div className='flex flex-grow overflow-hidden w-full h-full'>
        <SplitPane
          split='vertical'
          sizes={sizes}
          onChange={(newSizes: number[]) => setSizes(newSizes.map(s => s + "%"))}>
          <Pane>
            <div className='flex items-center justify-center h-full relative'>
              <NSTabs
                tabs={tabs}
                onAdd={handleAddTab}
                onClose={handleCloseTab}
                onRename={handleRenameTab}
                onTabChange={setActiveTabId}
                initialTab={activeTabId}
                integratedTitlebar={true}
                hideTabs={true}
              />


            </div>
          </Pane>
          <Pane
            minSize={isDisplayPane.right ? paneSizeConfig.rightPane.min : 0}
            maxSize={paneSizeConfig.rightPane.max}>
            <div className='flex items-center justify-center h-full'>
              <RightSidebar />
            </div>
          </Pane>
        </SplitPane>
      </div>

      <WelcomeDialog
        isOpen={showWelcomeCert}
        onClose={() => setShowWelcomeCert(false)}
        onAcknowledge={() => acknowledgeFeature("welcome_certificate")}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Content />
  );
};

export default App;