import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppPlan } from "@src/models/Plan";



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
  setPinnedBottomPaneModes: () => { }
});


export const useSettingsContext = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
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

          // Try silent verify (uses keychain on backend)
          verifyLicense(null).catch(() => { });

          setIsLoaded(true);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

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
        pinned_bottom_pane_modes: pinnedBottomPaneModes
      }
    }).catch(console.error);
  }, [streamCertificateLogs, mcpStdioEnabled, mcpHttpEnabled, mcpHttpPort, autosave, pinnedBottomPaneModes, isLoaded]);

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
      }}>

      {children}
    </SettingsContext.Provider>
  );
};
