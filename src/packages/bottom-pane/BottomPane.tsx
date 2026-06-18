import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { useState, Suspense } from "react";
import { FiAlertCircle } from "react-icons/fi";

import { SelectionViewer } from "../main-content/SelectionViewer";
import { useBottomPaneContext } from "@src/context/BottomPaneContext";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useTrafficListContext } from "../main-content/context/TrafficList";
import { useAppProvider } from "../app-env";
import { Dialog } from "../ui/Dialog";
import { ContainerQueryProvider } from "@src/context/ContainerQueryContext";

import { renderMode } from "./renderMode";
import { NotInterceptedMode } from "./BottomPaneComponents/None/NotInterceptedMode";
import { useLicense } from "@src/hooks/useLicense";
import { v4 as uuidv4 } from "uuid";
import { useUpgradeDialog } from "@src/context/UpgradeContext";

export const BottomPane = () => {
  const { mode, selectionType } = useBottomPaneContext();
  const [sizes, setSizes] = useState<any[]>(["50%", "50%"]);
  const { selections } = useTrafficListContext();
  const { provider } = useAppProvider();

  const [isIntercepting, setIsIntercepting] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const selected = selections.firstSelected;
  const isAdded = selected && addedIds.has(String(selected.id));
  const { getLimit } = useLicense();
  const { openUpgradeDialog } = useUpgradeDialog();

  const checkRuleLimit = async () => {
    try {
      const limit = await getLimit('max_proxy_rules');
      const currentRules = await invoke<any[]>("get_proxy_rules");
      if (currentRules.length >= limit) {
        openUpgradeDialog();
        return false;
      }
      return true;
    } catch (e) {
      console.error("Limit check failed:", e);
      return true; // Allow if check fails to avoid blocking users unnecessarily
    }
  };

  const handleIntercept = async () => {
    if (!selected || !selected.url) return;
    try {
      setIsIntercepting(true);
      if (!(await checkRuleLimit())) return;
      const urlStr = selected.url as string;
      const u = urlStr.includes("://") ? urlStr : `https://${urlStr}`;
      const url = new URL(u);
      const domain = url.hostname;
      const pattern = `${domain}*`;

      await invoke("save_proxy_rule", {
        rule: {
          id: uuidv4(),
          enabled: true,
          name: domain,
          pattern: pattern,
          action: "INTERCEPT",
          client: null
        }
      });

      emit("proxy_rules_updated");
      setAddedIds(prev => new Set(prev).add(String(selected.id)));
    } catch (e) {
      console.error(e);
      setDialogConfig({
        isOpen: true,
        title: 'Update Failed',
        message: "Failed to save interception rule. Please check console for details.",
        type: 'error'
      });
    } finally {
      setIsIntercepting(false);
    }
  };

  const handleInterceptAll = async () => {
    if (!selections.others) return;
    try {
      setIsIntercepting(true);
      if (!(await checkRuleLimit())) return;
      const tunneledItems = selections.others.filter(t => t && !t.intercepted && t.url);

      for (const item of tunneledItems) {
        try {
          const urlStr = item.url as string;
          const u = urlStr.includes("://") ? urlStr : `https://${urlStr}`;
          const url = new URL(u);
          const domain = url.hostname;
          const pattern = `${domain}*`;

          await invoke("save_proxy_rule", {
            rule: {
              id: uuidv4(),
              enabled: true,
              name: `Intercept ${domain}`,
              pattern: pattern,
              action: "INTERCEPT",
              client: null
            }
          });
        } catch (err) {
          console.error("Failed to add batch rule:", err);
        }
      }

      emit("proxy_rules_updated");

      setAddedIds(prev => {
        const next = new Set(prev);
        selections.others?.forEach(t => { if (t) next.add(String(t.id)); });
        return next;
      });
    } catch (e) {
      console.error(e);
      setDialogConfig({
        isOpen: true,
        title: 'Batch Update Failed',
        message: "Failed to process batch update.",
        type: 'error'
      });
    } finally {
      setIsIntercepting(false);
    }
  };

  const isMultiple = selectionType === "multiple";
  const tunneledCount = selections.others ? selections.others.filter(t => t && !t.intercepted).length : 0;
  const interceptedCount = selections.others ? selections.others.filter(t => t && t.intercepted).length : 0;

  return (
    <div className="flex flex-col w-full relative h-full">
      {selections.firstSelected && <SelectionViewer />}
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-zinc-600 italic text-xs animate-pulse">
            Loading viewer...
          </div>
        }>
          <div className="flex-grow overflow-y-auto h-full custom-scrollbar bg-[#111] @container">
            <ContainerQueryProvider>
              {(() => {
                if (!selected) return renderMode(mode, sizes, setSizes);

                if (isMultiple) return renderMode(mode, sizes, setSizes);

                const url = (selected.url as string) || "";
                const isEncrypted = url.startsWith("https://") || url.startsWith("wss://") || url.includes(":443") || selected.method === "CONNECT";
                const isIntercepted = selected.intercepted === true || selected.intercepted === 1 || selected.intercepted === "true" || selected.intercepted === "1";

                if (isIntercepted || !isEncrypted) {
                  return renderMode(mode, sizes, setSizes);
                }

                const getHostname = (url: string) => {
                  try {
                    const u = url.includes("://") ? url : `https://${url}`;
                    return new URL(u).hostname;
                  } catch {
                    return url.split(":")[0] || "-";
                  }
                };

                const domain = getHostname(selected.url as string);
                const clientInfo = selected.client ? (() => {
                  try {
                    return JSON.parse(selected.client as string);
                  } catch {
                    return null;
                  }
                })() : null;

                return (
                  <NotInterceptedMode
                    domain={domain}
                    isAdded={!!isAdded}
                    isIntercepting={isIntercepting}
                    handleIntercept={handleIntercept}
                    clientName={clientInfo?.name}
                    onInterceptClient={async (client) => {
                      try {
                        setIsIntercepting(true);
                        if (!(await checkRuleLimit())) return;
                        await invoke("save_proxy_rule", {
                          rule: {
                            id: uuidv4(),
                            enabled: true,
                            name: `Intercept ${client}`,
                            pattern: "",
                            action: "INTERCEPT",
                            client: client
                          }
                        });
                        emit("proxy_rules_updated");
                        setAddedIds(prev => new Set(prev).add(String(selected.id)));
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsIntercepting(false);
                      }
                    }}
                  />
                );
              })()}
            </ContainerQueryProvider>
          </div>
        </Suspense>
      </ErrorBoundary>

      <Dialog
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};