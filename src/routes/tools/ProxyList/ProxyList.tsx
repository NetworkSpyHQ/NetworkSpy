import { Renderer, TableView } from "@src/packages/ui/TableView";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ToolBaseHeader } from "@src/packages/ui/ToolBaseHeader";
import { v4 as uuidv4 } from "uuid";
import { ProxyRuleDialog, ProxyRuleModel as IProxyRuleModel } from "./components/ProxyRuleDialog";
import { FiShield, FiCheck, FiTrash2, FiEdit3, FiZap, FiLock } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLicense } from "@src/hooks/useLicense";
import { useUpgradeDialog } from "@src/context/UpgradeContext";

export class ProxyRuleCellRenderer implements Renderer<IProxyRuleModel> {
  type: keyof IProxyRuleModel | "actions";
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: IProxyRuleModel) => void;

  constructor(
      type: keyof IProxyRuleModel | "actions", 
      onToggle?: (id: string) => void, 
      onDelete?: (id: string) => void,
      onEdit?: (item: IProxyRuleModel) => void
  ) {
    this.type = type;
    this.onToggle = onToggle;
    this.onDelete = onDelete;
    this.onEdit = onEdit;
  }

  render({ input }: { input: IProxyRuleModel }): React.ReactNode {
    let content: React.ReactNode;
    const toggle = this.onToggle;

    switch (this.type) {
      case "enabled":
        const isChecked = input.enabled;
        content = (
          <button
            onClick={() => toggle?.(input.id)}
            className={twMerge(
                "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                isChecked 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40" 
                    : "bg-zinc-900 border-zinc-800 text-transparent hover:border-zinc-700"
            )}
          >
            <FiCheck size={12} />
          </button>
        );
        break;
      case "name":
        content = <span className="font-bold text-zinc-200">{input.name}</span>;
        break;
      case "action":
        const isIntercept = input.action === 'INTERCEPT';
        content = (
            <div className={twMerge(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
                isIntercept 
                    ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" 
                    : "bg-amber-950/30 text-amber-400 border-amber-900/50"
            )}>
                {isIntercept ? <FiZap size={10} /> : <FiLock size={10} />}
                {input.action}
            </div>
        );
        break;
      case "pattern":
        content = <code className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono shadow-inner group-hover:border-zinc-700 transition-colors uppercase tracking-widest truncate max-w-[280px]">{input.pattern}</code>;
        break;
      case "actions":
        content = (
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => this.onEdit?.(input)}
                    className="text-zinc-600 hover:text-indigo-500 transition-all p-1.5 rounded-md hover:bg-indigo-500/10 active:scale-90"
                >
                    <FiEdit3 size={14} />
                </button>
                <button 
                    onClick={() => this.onDelete?.(input.id)}
                    className="text-zinc-600 hover:text-red-500 transition-all p-1.5 rounded-md hover:bg-red-500/10 active:scale-90 h-6 w-6"
                >
                    <FiTrash2 size={14} />
                </button>
            </div>
        )
        break;
      default:
        content = null;
        break;
    }

    return (
      <div className="flex items-center h-full">
        {content}
      </div>
    );
  }
}

const ProxyList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<IProxyRuleModel[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IProxyRuleModel | null>(null);

  const fetchRules = useCallback(async () => {
    try {
        const rules = await invoke<IProxyRuleModel[]>("get_proxy_rules");
        setData(rules);
    } catch (e) {
        console.error("Failed to fetch proxy rules:", e);
        // Fallback for UI testing
        setData([
            { id: '1', enabled: true, name: 'Default Intercept', pattern: '*', action: 'INTERCEPT' }
        ]);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    const unlisten = listen("proxy_rules_updated", () => {
      fetchRules();
    });
    return () => {
      unlisten.then(u => u());
    };
  }, [fetchRules]);

  const handleToggle = async (id: string) => {
    const item = dataRef.current.find(d => d.id === id);
    if (!item) return;

    const updatedItem = { ...item, enabled: !item.enabled };
    setData(prev => prev.map(d => d.id === id ? updatedItem : d));
    try {
        await invoke("save_proxy_rule", { rule: updatedItem });
    } catch (e) {
        console.error("Failed to update proxy rule:", e);
        const rules = await invoke<IProxyRuleModel[]>("get_proxy_rules");
        setData(rules);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await invoke("delete_proxy_rule", { id });
        setData(prev => prev.filter(d => d.id !== id));
    } catch (e) {
        console.error("Failed to delete proxy rule:", e);
    }
  };

  const { getLimit } = useLicense();
  const { openUpgradeDialog } = useUpgradeDialog();
  const handleSave = async (rule: IProxyRuleModel) => {
    try {
        const limit = await getLimit('max_proxy_rules');
        const isNew = !rule.id;
        
        if (isNew && data.length >= limit) {
          openUpgradeDialog();
          return;
        }

        if (isNew) {
            rule.id = uuidv4();
        }
        await invoke("save_proxy_rule", { rule });
        setData(prev => {
            const index = prev.findIndex(p => p.id === rule.id);
            if (index >= 0) {
                return prev.map(p => p.id === rule.id ? rule : p);
            }
            return [rule, ...prev];
        });
        setIsDialogOpen(false);
        setEditingItem(null);
    } catch (e) {
        console.error("Failed to save proxy rule:", e);
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.pattern.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
      <ToolBaseHeader
        title="Proxy Intercept Rules"
        description="Define which domains should be decrypted and which should be tunneled"
        icon={<FiShield size={22} className="text-indigo-500" />}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => {
            setEditingItem(null);
            setIsDialogOpen(true);
        }}
        onClear={async () => {
             for (const item of data) {
                 await handleDelete(item.id);
             }
        }}
      />
      
      <div className="flex-grow min-h-0">
        <TableView
            headers={[
            {
                title: "Status",
                minWidth: 80,
                renderer: new ProxyRuleCellRenderer("enabled", handleToggle),
            },
            {
                title: "Name",
                minWidth: 200,
                renderer: new ProxyRuleCellRenderer("name"),
            },
            {
                title: "Action",
                minWidth: 120,
                renderer: new ProxyRuleCellRenderer("action"),
            },
            {
                title: "Target Pattern",
                minWidth: 300,
                renderer: new ProxyRuleCellRenderer("pattern"),
            },
            {
                title: "",
                minWidth: 80,
                renderer: new ProxyRuleCellRenderer("actions", undefined, handleDelete, (item) => {
                    setEditingItem(item);
                    setIsDialogOpen(true);
                }),
            },
            ]}
            data={filteredData}
        />
      </div>

      <ProxyRuleDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
            setIsDialogOpen(false);
            setEditingItem(null);
        }} 
        onSave={handleSave}
        initialData={editingItem}
      />
    </div>
  );
};

export default ProxyList;
