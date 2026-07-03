import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { FiX, FiPlay, FiPause, FiTrash2, FiSave, FiMonitor, FiLayout, FiSidebar, FiColumns, FiPlus, FiCommand, FiSmartphone } from 'react-icons/fi';
import { useAppProvider } from '../app-env';
import { useSessionContext } from '@src/context/SessionContext';
import { usePaneContext } from '@src/context/PaneProvider';
import { PortDialog } from '../header/components/PortDialog';
import { SaveSessionDialog } from '../header/components/SaveSessionDialog';
import { twMerge } from 'tailwind-merge';
import { useAtom } from 'jotai';
import { workspaceTabsAtom, activeTabIdAtom, WorkspaceTab, osAtom, commandPaletteOpenAtom } from '@src/utils/trafficAtoms';
import { useSettingsContext } from '@src/context/SettingsProvider';
import { UpgradeDialog } from '../header/components/UpgradeDialog';
import { invoke } from '@tauri-apps/api/core';
import { TitleBarCustomMenuTool } from './TitleBarCustomMenuTool';
import { TitleBarPlatformControls } from './TitleBarPlatformControls';
import { useLicense } from '@src/hooks/useLicense';

interface DeviceInfo {
  serial: string;
  status: string;
  model: string | null;
  product: string | null;
  transport_id: string | null;
  usb: string | null;
}

const appWindow = getCurrentWindow();

const TitleBarTraffic: React.FC = () => {
  const [os] = useAtom(osAtom);
  const [isMaximized, setIsMaximized] = useState(false);

  const { isRun, setIsRun, clearData, provider, currentPort, pausedBreakpoints, openNewWindow } = useAppProvider();
  const { getLimit } = useLicense();
  const { isReviewMode, reviewedSession, viewSession, saveCapture, folders } = useSessionContext();
  const { isDisplayPane, setIsDisplayPane } = usePaneContext();

  const [tabsList, setTabsList] = useAtom(workspaceTabsAtom);
  const [activeTabId, setActiveTabId] = useAtom(activeTabIdAtom);
  const [, setCommandPaletteOpen] = useAtom(commandPaletteOpenAtom);

  const [isPortDialogOpen, setIsPortDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);

  useEffect(() => {
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

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

  const handleAddTab = async () => {
    const limit = await getLimit('max_tabs');
    if (tabsList.length >= limit) {
      setIsUpgradeDialogOpen(true);
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

  const isMac = os === 'macos';

  const ActionButton = ({
    onClick,
    icon: Icon,
    active = false,
    variant = 'default',
    label
  }: {
    onClick: () => void,
    icon: any,
    active?: boolean,
    variant?: 'default' | 'danger' | 'success' | 'warning',
    label?: string
  }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      className={twMerge(
        "flex items-center justify-center w-7 h-6 rounded transition-all active:scale-95",
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
        variant === 'danger' && "hover:text-red-400 hover:bg-red-500/10",
        variant === 'success' && active && "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
        variant === 'warning' && "text-amber-500 bg-amber-500/10 border border-amber-500/20"
      )}
    >
      <Icon size={14} />
    </button>
  );

  const handleUpdatePort = async (newPort: number) => {
    try {
      await provider.changeProxyPort(newPort);
    } catch (err) {
      console.error("Failed to update port", err);
    }
  };

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const startEditing = (tab: WorkspaceTab) => {
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const saveTitle = () => {
    if (editingTabId) {
      setTabsList((prev) =>
        prev.map((t) => (t.id === editingTabId ? { ...t, title: editingTitle } : t))
      );
      setEditingTabId(null);
    }
  };

  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);

  useEffect(() => {
    invoke<string | null>('get_current_workspace').then(setCurrentWorkspace);
  }, []);

  useEffect(() => {
    invoke<DeviceInfo[]>('detect_devices').then(setDevices);
    const unlisten = listen<DeviceInfo[]>('device-list-changed', (event) => {
      setDevices(event.payload);
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  const connectedDevices = devices.filter(d => d.status === 'device');

  const { plan, isVerified } = useSettingsContext();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  const handleSelectWorkspace = async () => {
    if (!isVerified) {
      setIsUpgradeDialogOpen(true);
      return;
    }

    try {
      const path = await invoke<string>('select_workspace_dir');
      setCurrentWorkspace(path);
      window.location.reload();
    } catch (e) {
      console.error("Failed to select workspace", e);
    }
  };

  const getWorkspaceName = (path: string) => {
    return path.split(/[\\/]/).pop() || path;
  };

  return (
    <div
      data-tauri-drag-region
      id="title-bar-traffic"
      className="flex items-center h-8 bg-black border-b border-white/5 select-none shrink-0 z-[1000] px-2 gap-2"
    >
      {isMac && (
        <div className="w-20 shrink-0 h-full" data-tauri-drag-region />
      )}

      <TitleBarCustomMenuTool />
      {/* Workspace Indicator & Main Actions */}
      {(
        <div className="flex items-center gap-2 h-full animate-in fade-in duration-300">
          {/* Workspace Indicator */}
          <div className="flex items-center gap-1.5 shrink-0 h-full" data-tauri-drag-region>
            {plan === null && (
              <span className="flex items-center px-2 h-6 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-tight">
                Free
              </span>
            )}
            <button
              onClick={handleSelectWorkspace}
              className={twMerge(
                "flex items-center gap-2 px-2 h-6 rounded-md border transition-all",
                currentWorkspace
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                  : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
              )}
              title={currentWorkspace || "Default Workspace (~/.network-spy)"}
            >
              <FiMonitor size={12} className={currentWorkspace ? "text-blue-400" : "text-zinc-600"} />
              <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[150px]">
                {currentWorkspace ? getWorkspaceName(currentWorkspace) : "Default Workspace"}
              </span>
              {currentWorkspace && (
                <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              )}
            </button>
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Main Actions Area */}
          <div className="flex items-center gap-2 shrink-0 h-full" data-tauri-drag-region>
            <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-md border border-white/5 shadow-inner">
              {!isReviewMode ? (
                <>
                  <ActionButton
                    icon={isRun ? FiPause : FiPlay}
                    active={isRun}
                    variant="success"
                    label={isRun ? "Stop Capturing" : "Start Capturing"}
                    onClick={() => setIsRun(!isRun)}
                  />
                  <ActionButton
                    icon={FiTrash2}
                    variant="danger"
                    label="Clear All Traffic"
                    onClick={clearData}
                  />
                  <div className="w-px h-3 bg-white/10 mx-1" />
                  <button
                    onClick={() => setIsPortDialogOpen(true)}
                    className={twMerge(
                      "px-2 h-6 flex items-center gap-1.5 hover:bg-white/5 rounded transition-all text-[10px] font-bold uppercase tracking-tight",
                      isRun ? "text-blue-400 font-mono" : "text-zinc-500"
                    )}
                  >
                    <span className={twMerge(
                      "w-1 h-1 rounded-full transition-all duration-500",
                      isRun ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" : "bg-zinc-600"
                    )} />
                    {isRun ? `:${currentPort}` : "Proxy Paused"}
                  </button>
                  <div className="w-px h-3 bg-white/10 mx-1" />
                  <ActionButton
                    icon={FiSave}
                    label="Save Current Session"
                    onClick={() => setIsSaveDialogOpen(true)}
                  />
                </>

              ) : (
                <div className="flex items-center gap-2 px-2 h-6 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[120px]">{reviewedSession?.name}</span>
                  <button onClick={() => viewSession(null)} className="hover:text-white transition-colors">
                    <FiX size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs Area */}
      <div className="flex-grow flex items-center gap-1 overflow-x-auto no-scrollbar h-full px-2" data-tauri-drag-region>
        {tabsList.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            onDoubleClick={() => startEditing(tab)}
            className={twMerge(
              "group flex items-center gap-2 px-3 h-6 rounded-md border transition-all cursor-pointer min-w-[80px] max-w-[180px] shrink-0",
              activeTabId === tab.id
                ? "bg-white/10 border-white/10 text-white shadow-sm"
                : "bg-transparent border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            )}
          >
            <span className={twMerge(
              "w-1 h-1 rounded-full shrink-0",
              activeTabId === tab.id ? "bg-blue-400" : "bg-zinc-700"
            )} />

            {editingTabId === tab.id ? (
              <input
                autoFocus
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="bg-transparent border-none outline-none text-[10px] font-bold w-full text-white"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[10px] font-bold truncate flex-grow">{tab.title}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-0.5"
            >
              <FiX size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddTab}
          className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 rounded-md transition-all shrink-0"
        >
          <FiPlus size={14} />
        </button>
      </div>

      {/* Right Side Tools */}
      <div className="flex items-center gap-2 shrink-0 h-full" data-tauri-drag-region>
        <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-md border border-white/5 shadow-inner">
          <ActionButton
            icon={FiCommand}
            label="Open Command Palette (⌘P)"
            onClick={() => setCommandPaletteOpen(true)}
          />
          <ActionButton
            icon={FiColumns}
            active={isDisplayPane.centerLayout === "horizontal"}
            label="Vertical Split"
            onClick={() => setIsDisplayPane(prev => ({ ...prev, centerLayout: "horizontal" }))}
          />
          <ActionButton
            icon={FiLayout}
            active={isDisplayPane.centerLayout === "vertical"}
            label="Horizontal Split"
            onClick={() => setIsDisplayPane(prev => ({ ...prev, centerLayout: "vertical" }))}
          />
          <div className="w-px h-3 bg-white/10 mx-1" />
          <ActionButton
            icon={FiMonitor}
            active={isDisplayPane.bottom}
            label="Toggle Bottom Inspector"
            onClick={() => setIsDisplayPane(prev => ({ ...prev, bottom: !prev.bottom }))}
          />
          <ActionButton
            icon={FiSidebar}
            active={isDisplayPane.right}
            label="Toggle Right Pane"
            onClick={() => setIsDisplayPane(prev => ({ ...prev, right: !prev.right }))}
          />
        </div>

          <ActionButton
            icon={FiSmartphone}
            active={connectedDevices.length > 0}
            variant={connectedDevices.length > 0 ? 'success' : 'default'}
            label={connectedDevices.length > 0 ? `${connectedDevices.length} device(s) connected` : "No device detected"}
            onClick={() => setIsDeviceDialogOpen(true)}
          />
        <TitleBarPlatformControls />
      </div>

      {/* Dialogs */}
      <PortDialog
        isOpen={isPortDialogOpen}
        currentPort={currentPort || 9090}
        onClose={() => setIsPortDialogOpen(false)}
        onConfirm={handleUpdatePort}
      />
      <SaveSessionDialog
        isOpen={isSaveDialogOpen}
        folders={folders}
        onClose={() => setIsSaveDialogOpen(false)}
        onConfirm={async (name, folderId) => {
          try {
            await saveCapture(name, folderId);
          } catch (e) {
            alert("Failed to save session: " + e);
          }
        }}
      />
      <UpgradeDialog
        isOpen={isUpgradeDialogOpen}
        onClose={() => setIsUpgradeDialogOpen(false)}
      />

      {isDeviceDialogOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-96 bg-[#1a1a1a] border border-zinc-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Connected Devices</h2>
              <button onClick={() => setIsDeviceDialogOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
                <FiX size={16} />
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-zinc-500">
                <FiSmartphone size={32} className="opacity-40" />
                <p className="text-xs font-medium">No devices detected</p>
                <p className="text-[10px] text-zinc-600">Connect an Android device via USB and enable USB debugging</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {devices.map((device) => (
                  <div
                    key={device.serial}
                    className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
                  >
                    <span className={twMerge(
                      "w-2 h-2 rounded-full shrink-0",
                      device.status === 'device' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-600"
                    )} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-zinc-200 truncate">
                        {device.model || device.serial}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {device.serial}{device.product ? ` - ${device.product}` : ''}
                      </span>
                    </div>
                    <span className={twMerge(
                      "text-[10px] font-bold uppercase tracking-wider",
                      device.status === 'device' ? "text-emerald-500" : "text-zinc-500"
                    )}>
                      {device.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setIsDeviceDialogOpen(false);
                  invoke<DeviceInfo[]>('detect_devices').then(setDevices);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsDeviceDialogOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TitleBarTraffic;
