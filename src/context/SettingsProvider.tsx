import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppPlan } from "@src/models/Plan";

// Settings injected by Rust via initialization_script before page JS executes
interface InitialSettings {
  main_window_sizes?: string[];
  pane_right_visible?: boolean;
  pane_left_visible?: boolean;
  pane_bottom_visible?: boolean;
  pane_center_layout?: string;
}
declare global {
  interface Window {
    __INITIAL_SETTINGS__?: InitialSettings;
  }
}

function getInit(): InitialSettings | undefined {
  return window.__INITIAL_SETTINGS__;
}



interface SettingsContextInterface {
  theme: string;
  setTheme: (theme: string) => void;
  sizesCenterPane: number[];
  setSizesCenterPane: (sizesCenterPane: number[]) => void;
  streamCertificateLogs: boolean;
  setStreamCertificateLogs: (stream: boolean) => void;
  mcpStdioEnabled: boolean;
  setMcpStdioEnabled: (enabled: boolean) => void;
  mcpHttpEnabled: boolean;
  setMcpHttpEnabled: (enabled: boolean) => void;
  mcpHttpPort: number;
  setMcpHttpPort: (port: number) => void;
  smartViewerMatch: boolean;
  setSmartViewerMatch: (enabled: boolean) => void;
  plan: AppPlan | null;
  isVerified: boolean;
  apiFeatures: any | null;
  isSyncing: boolean;
  openRouterKey: string;
  setOpenRouterKey: (key: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (model: string) => void;
  aiBaseUrl: string;
  setAiBaseUrl: (url: string) => void;
  verifyLicense: (key: string | null) => Promise<any>;
  revokeLicense: () => Promise<void>;
  startProxyOnLaunch: boolean;
  setStartProxyOnLaunch: (enabled: boolean) => void;
  bottomPaneTabPosition: 'top' | 'bottom';
  setBottomPaneTabPosition: (position: 'top' | 'bottom') => void;
  autosave: boolean;
  setAutosave: (enabled: boolean) => void;
  pinnedBottomPaneModes: string[];
  setPinnedBottomPaneModes: (modes: string[]) => void;
  pinnedCommandPaletteItems: string[];
  setPinnedCommandPaletteItems: (items: string[]) => void;
  paneLeftVisible: boolean;
  setPaneLeftVisible: (visible: boolean) => void;
  paneBottomVisible: boolean;
  setPaneBottomVisible: (visible: boolean) => void;
  paneRightVisible: boolean;
  setPaneRightVisible: (visible: boolean) => void;
  paneCenterLayout: 'horizontal' | 'vertical';
  setPaneCenterLayout: (layout: 'horizontal' | 'vertical') => void;
  mainWindowSizes: string[];
  setMainWindowSizes: (sizes: string[]) => void;
}


export const SettingsContext = createContext<SettingsContextInterface>({
  theme: "dark",
  setTheme: () => { },
  sizesCenterPane: [],
  setSizesCenterPane: () => { },
  streamCertificateLogs: false,
  setStreamCertificateLogs: () => { },
  mcpStdioEnabled: false,
  setMcpStdioEnabled: () => { },
  mcpHttpEnabled: false,
  setMcpHttpEnabled: () => { },
  mcpHttpPort: 3001,
  setMcpHttpPort: () => { },
  smartViewerMatch: false,
  setSmartViewerMatch: () => { },
  plan: null,
  isVerified: false,
  apiFeatures: null,
  isSyncing: false,
  openRouterKey: "",
  setOpenRouterKey: () => { },
  openRouterModel: "google/gemini-2.0-flash-001",
  setOpenRouterModel: () => { },
  aiBaseUrl: "https://openrouter.ai/api/v1",
  setAiBaseUrl: () => { },
  verifyLicense: async () => { },
  revokeLicense: async () => { },
  startProxyOnLaunch: true,
  setStartProxyOnLaunch: () => { },
  bottomPaneTabPosition: 'top',
  setBottomPaneTabPosition: () => { },
  autosave: true,
  setAutosave: () => { },
  pinnedBottomPaneModes: [],
  setPinnedBottomPaneModes: () => { },
  pinnedCommandPaletteItems: [],
  setPinnedCommandPaletteItems: () => { },
  paneLeftVisible: true,
  setPaneLeftVisible: () => { },
  paneBottomVisible: true,
  setPaneBottomVisible: () => { },
  paneRightVisible: false,
  setPaneRightVisible: () => { },
  paneCenterLayout: 'vertical',
  setPaneCenterLayout: () => { },
  mainWindowSizes: ["70%", "0%"],
  setMainWindowSizes: () => { }
});


export const useSettingsContext = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState("dark");
  const [sizesCenterPane, setSizesCenterPane] = useState(() => {
    const saved = localStorage.getItem("ns_center_pane_sizes");
    return saved ? JSON.parse(saved) : [0, 0];
  });
  const [streamCertificateLogs, setStreamCertificateLogs] = useState(false);
  const [mcpStdioEnabled, setMcpStdioEnabled] = useState(false);
  const [mcpHttpEnabled, setMcpHttpEnabled] = useState(false);
  const [mcpHttpPort, setMcpHttpPort] = useState(3001);
  const [smartViewerMatch, setSmartViewerMatch] = useState(() => {
    return localStorage.getItem("ns_smart_viewer_match") === "true";
  });
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem("ns_openrouter_key") || "");
  const [openRouterModel, setOpenRouterModel] = useState(() => localStorage.getItem("ns_openrouter_model") || "anthropic/claude-sonnet-4.6");
  const [aiBaseUrl, setAiBaseUrl] = useState(() => localStorage.getItem("ns_ai_base_url") || "https://openrouter.ai/api/v1");
  const [plan, setPlan] = useState<AppPlan | null>(() => {
    const saved = localStorage.getItem("ns_license_plan");
    return saved ? AppPlan.fromString(saved) : null;
  });
  const [isVerified, setIsVerified] = useState(() => localStorage.getItem("ns_license_verified") === "true");
  const [apiFeatures, setApiFeatures] = useState<any | null>(() => {
    const saved = localStorage.getItem("ns_license_features");
    return saved ? JSON.parse(saved) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [startProxyOnLaunch, setStartProxyOnLaunch] = useState(() => {
    return localStorage.getItem("ns_start_proxy_on_launch") !== "false";
  });
  const [autosave, setAutosave] = useState(true);
  const [pinnedBottomPaneModes, setPinnedBottomPaneModes] = useState<string[]>([]);
  const [pinnedCommandPaletteItems, setPinnedCommandPaletteItems] = useState<string[]>([]);
  const [paneLeftVisible, setPaneLeftVisible] = useState(() => getInit()?.pane_left_visible ?? true);
  const [paneBottomVisible, setPaneBottomVisible] = useState(() => getInit()?.pane_bottom_visible ?? true);
  const [paneRightVisible, setPaneRightVisible] = useState(() => getInit()?.pane_right_visible ?? false);
  const [paneCenterLayout, setPaneCenterLayout] = useState<'horizontal' | 'vertical'>(() => (getInit()?.pane_center_layout as 'horizontal' | 'vertical') ?? 'vertical');
  const [mainWindowSizes, setMainWindowSizes] = useState<string[]>(() => getInit()?.main_window_sizes ?? ["70%", "0%"]);
  const [bottomPaneTabPosition, setBottomPaneTabPosition] = useState<'top' | 'bottom'>(() => {
    return (localStorage.getItem("ns_bottom_pane_tab_position") as 'top' | 'bottom') || "top";
  });


  const verifyLicense = async (key: string | null = null) => {
    setIsSyncing(true);
    try {
      const result: any = await invoke("verify_license", { licenseKey: key });
      if (result.success) {
        const mappedPlan = AppPlan.fromString(result.plan);
        setIsVerified(true);
        setPlan(mappedPlan);
        setApiFeatures(result.features || null);

        // Cache result
        localStorage.setItem("ns_license_verified", "true");
        localStorage.setItem("ns_license_plan", mappedPlan?.toString() || "");
        localStorage.setItem("ns_license_features", JSON.stringify(result.features || null));
      } else {
        setIsVerified(false);
        setPlan(null);
        setApiFeatures(null);

        // Clear cache
        localStorage.removeItem("ns_license_verified");
        localStorage.removeItem("ns_license_plan");
        localStorage.removeItem("ns_license_features");
      }
      setIsSyncing(false);
      return result;
    } catch (e) {
      setIsSyncing(false);
      console.error("License verification failed", e);
      setIsVerified(false);
      setPlan(null);
      setApiFeatures(null);
      throw e;
    }
  };

  const revokeLicense = async () => {
    try {
      await invoke("revoke_license_from_keychain");
      setIsVerified(false);
      setPlan(null);
      setApiFeatures(null);

      // Clear cache
      localStorage.removeItem("ns_license_verified");
      localStorage.removeItem("ns_license_plan");
      localStorage.removeItem("ns_license_features");
    } catch (e) {
      console.error("Failed to revoke license", e);
    }
  };

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    invoke<{
      stream_certificate_logs: boolean;
      mcp_stdio_enabled: boolean;
      mcp_http_enabled: boolean;
      mcp_http_port: number;
      license_key: string;
      autosave: boolean;
      pinned_bottom_pane_modes: string[];
      pinned_command_palette_items: string[];
      pane_left_visible: boolean;
      pane_bottom_visible: boolean;
      pane_right_visible: boolean;
      pane_center_layout: string;
      main_window_sizes: string[];
    }>("get_proxy_settings")
      .then((settings) => {
        if (settings) {
          setStreamCertificateLogs(settings.stream_certificate_logs);
          setMcpStdioEnabled(settings.mcp_stdio_enabled);
          setMcpHttpEnabled(settings.mcp_http_enabled);
          setMcpHttpPort(settings.mcp_http_port);
          setAutosave(settings.autosave);
          const modes = settings.pinned_bottom_pane_modes || [];
          if (modes.length === 0) {
            try {
              const legacy = JSON.parse(localStorage.getItem("pinned-bottom-pane-modes") || "[]");
              if (legacy.length > 0) {
                setPinnedBottomPaneModes(legacy);
                localStorage.removeItem("pinned-bottom-pane-modes");
              } else {
                setPinnedBottomPaneModes([]);
              }
            } catch {
              setPinnedBottomPaneModes([]);
            }
          } else {
            setPinnedBottomPaneModes(modes);
          }
          const palettePins = settings.pinned_command_palette_items || [];
          if (palettePins.length > 0) {
            setPinnedCommandPaletteItems(palettePins);
          }

          // Migrate pane state from localStorage
          if (settings.pane_left_visible === undefined) {
            try {
              const legacy = JSON.parse(localStorage.getItem("ns_pane_state") || "{}");
              if (Object.keys(legacy).length > 0) {
                setPaneLeftVisible(legacy.left ?? true);
                setPaneBottomVisible(legacy.bottom ?? true);
                setPaneRightVisible(legacy.right ?? false);
                setPaneCenterLayout(legacy.centerLayout || 'vertical');
              } else {
                setPaneLeftVisible(true);
                setPaneBottomVisible(true);
                setPaneRightVisible(false);
                setPaneCenterLayout('vertical');
              }
            } catch {
              setPaneLeftVisible(true);
              setPaneBottomVisible(true);
              setPaneRightVisible(false);
              setPaneCenterLayout('vertical');
            }
          } else {
            setPaneLeftVisible(settings.pane_left_visible);
            setPaneBottomVisible(settings.pane_bottom_visible);
            setPaneRightVisible(settings.pane_right_visible);
            setPaneCenterLayout((settings.pane_center_layout as 'horizontal' | 'vertical') || 'vertical');
          }
          const sizes = settings.main_window_sizes || [];
          if (sizes.length === 0) {
            try {
              const legacy = JSON.parse(localStorage.getItem("ns_main_window_sizes") || "[]");
              if (legacy.length > 0) {
                setMainWindowSizes(legacy);
                localStorage.removeItem("ns_main_window_sizes");
              } else {
                setMainWindowSizes(["70%", "0%"]);
              }
            } catch {
              setMainWindowSizes(["70%", "0%"]);
            }
          } else {
            setMainWindowSizes(sizes);
          }

          // Try silent verify (uses keychain on backend)
          verifyLicense(null).catch(() => { });

          setIsLoaded(true);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
      document.body.setAttribute("data-theme", "dark");
  }, []);

  useEffect(() => {
    localStorage.setItem("ns_center_pane_sizes", JSON.stringify(sizesCenterPane));
  }, [sizesCenterPane]);

  useEffect(() => {
    localStorage.setItem("ns_smart_viewer_match", String(smartViewerMatch));
  }, [smartViewerMatch]);

  useEffect(() => {
    localStorage.setItem("ns_openrouter_key", openRouterKey);
  }, [openRouterKey]);

  useEffect(() => {
    localStorage.setItem("ns_openrouter_model", openRouterModel);
  }, [openRouterModel]);

  useEffect(() => {
    localStorage.setItem("ns_ai_base_url", aiBaseUrl);
  }, [aiBaseUrl]);

  useEffect(() => {
    localStorage.setItem("ns_start_proxy_on_launch", String(startProxyOnLaunch));
  }, [startProxyOnLaunch]);

  useEffect(() => {
    localStorage.setItem("ns_bottom_pane_tab_position", bottomPaneTabPosition);
  }, [bottomPaneTabPosition]);

  useEffect(() => {

    if (!isLoaded) return;

    invoke("update_proxy_settings", {
      newSettings: {
        stream_certificate_logs: streamCertificateLogs,
        mcp_stdio_enabled: mcpStdioEnabled,
        mcp_http_enabled: mcpHttpEnabled,
        mcp_http_port: mcpHttpPort,
        autosave: autosave,
        pinned_bottom_pane_modes: pinnedBottomPaneModes,
        pinned_command_palette_items: pinnedCommandPaletteItems,
        pane_left_visible: paneLeftVisible,
        pane_bottom_visible: paneBottomVisible,
        pane_right_visible: paneRightVisible,
        pane_center_layout: paneCenterLayout,
        main_window_sizes: mainWindowSizes
      }
    }).catch(console.error);
  }, [streamCertificateLogs, mcpStdioEnabled, mcpHttpEnabled, mcpHttpPort, autosave, pinnedBottomPaneModes, pinnedCommandPaletteItems, paneLeftVisible, paneBottomVisible, paneRightVisible, paneCenterLayout, mainWindowSizes, isLoaded]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        sizesCenterPane,
        setSizesCenterPane,
        streamCertificateLogs,
        setStreamCertificateLogs,
        mcpStdioEnabled,
        setMcpStdioEnabled,
        mcpHttpEnabled,
        setMcpHttpEnabled,
        mcpHttpPort,
        setMcpHttpPort,
        smartViewerMatch,
        setSmartViewerMatch,
        openRouterKey,
        setOpenRouterKey,
        openRouterModel,
        setOpenRouterModel,
        aiBaseUrl,
        setAiBaseUrl,
        plan,
        isVerified,
        apiFeatures,
        isSyncing,
        verifyLicense,
        revokeLicense,
        startProxyOnLaunch,
        setStartProxyOnLaunch,
        bottomPaneTabPosition,
        setBottomPaneTabPosition,
        autosave,
        setAutosave,
        pinnedBottomPaneModes,
        setPinnedBottomPaneModes,
        pinnedCommandPaletteItems,
        setPinnedCommandPaletteItems,
        paneLeftVisible,
        setPaneLeftVisible,
        paneBottomVisible,
        setPaneBottomVisible,
        paneRightVisible,
        setPaneRightVisible,
        paneCenterLayout,
        setPaneCenterLayout,
        mainWindowSizes,
        setMainWindowSizes,
      }}>

      {children}
    </SettingsContext.Provider>
  );
};
