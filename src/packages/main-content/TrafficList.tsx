import React, { useCallback, useMemo, useEffect } from "react";
import {
  TableView,
  TableViewContextMenuRenderer,
  TableViewHeader,
} from "../ui/TableView";
import { ClientRenderer, ImageRenderer, StatusCodeRenderer, TagsRenderer, TextRenderer, UrlRenderer } from "./Renderers";

import { useTrafficListContext } from "./context/TrafficList";
import { useFilterContext } from "@src/context/FilterContext";
import { TrafficItemMap } from "./model/TrafficItemMap";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { FiLock, FiUnlock, FiZap } from "react-icons/fi";
import { Menu, MenuItem, Submenu, PredefinedMenuItem, IconMenuItem } from "@tauri-apps/api/menu";
import { Image } from "@tauri-apps/api/image";

type TauriInvokeFn = <T>(cmd: string, args?: any) => Promise<T>;

export const TrafficList: React.FC = () => {
  const { selections, setSelections, setTrafficList, setTrafficSet } = useTrafficListContext();
  const { filteredTraffic } = useFilterContext();
  useEffect(() => {
    const unlistenExport = listen<{ ids: string[] }>("export_selected", async (event) => {
      try {
        const ids = event.payload.ids;
        if (!ids || ids.length === 0) return;

        const path = await save({
          filters: [
            {
              name: "HAR Capture",
              extensions: ["har"],
            },
          ],
        });

        if (path) {
          await invoke("export_selected_session", { path, ids });
        }
      } catch (err) {
        console.error("Failed to export selected items", err);
      }
    });

    const unlistenDelete = listen<{ ids: string[] }>("delete_selected", (event) => {
      const idsToDelete = new Set(event.payload.ids);

      setTrafficList(prev => prev.filter((item: TrafficItemMap) => !idsToDelete.has(String(item.id))));
      setTrafficSet(prev => {
        const next = { ...prev };
        event.payload.ids.forEach((id: string) => delete next[id]);
        return next;
      });
      setSelections({ firstSelected: null, others: null });
    });

    return () => {
      unlistenExport.then((f) => f());
      unlistenDelete.then((f) => f());
    };
  }, [setTrafficList, setTrafficSet, setSelections]);

  const headers: TableViewHeader<TrafficItemMap>[] = useMemo(() => [
    {
      title: "ID",
      renderer: {
        render: ({ input }: { input: TrafficItemMap }) => {
          const getStatusColor = (code: string, method: string) => {
            if (method === 'CONNECT') return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]';
            const c = parseInt(code);
            if (isNaN(c)) return 'bg-zinc-600'; // Pending
            if (c >= 500) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
            if (c >= 400) return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
            if (c >= 300) return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
            if (c >= 200) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
            if (c >= 100) return 'bg-zinc-400 shadow-[0_0_10px_rgba(161,161,170,0.5)]';

            return 'bg-zinc-600';
          };

          return (
            <div className="flex items-center gap-2 px-1">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(String(input.code), String(input.method))}`} />
              <span className="truncate opacity-80 font-mono text-[10px]">{input.id as string}</span>
            </div>
          );
        }
      },
      minWidth: 70,
      sortable: true,
      compareValue: (a: any, b: any) => (Number(a) < Number(b) ? -1 : 1),
    },
    {
      title: "SSL",
      renderer: {
        render: ({ input }: { input: TrafficItemMap }) => {
          const intercepted = input.intercepted as boolean;
          const tags = input.tags as string[] || [];
          const isModified = tags.some(t => t.startsWith('BREAKPOINT_'));

          return (
            <div className="flex items-center justify-center gap-1.5 h-full">
              <div className={`${intercepted ? 'text-purple-400' : 'text-zinc-500'}`} title={intercepted ? 'Intercepted (Decrypted)' : 'Tunneled (Encrypted)'}>
                {intercepted ? <FiUnlock size={14} /> : <FiLock size={14} />}
              </div>
              {isModified && (
                <div className="text-blue-400 animate-pulse" title="Modified via Breakpoint">
                  <FiZap size={12} />
                </div>
              )}
            </div>
          );
        }
      },
      minWidth: 50,
    },
    { title: "Tags", renderer: new TagsRenderer("tags"), minWidth: 100 },
    { title: "URL", renderer: new UrlRenderer(), minWidth: 400 },
    { title: "Client", renderer: new ClientRenderer("client"), minWidth: 200 },
    { title: "Method", renderer: new TextRenderer("method") },
    { title: "Code", renderer: new StatusCodeRenderer(), minWidth: 100 },

    {
      title: "Time",
      renderer: new TextRenderer("time"),
      sortable: true,
      compareValue: (a: any, b: any) => (a.timestamp < b.timestamp ? -1 : 1),
    },
    { title: "Duration", renderer: new TextRenderer("duration") },
    { title: "Request", renderer: new TextRenderer("request") },
    { title: "Response", renderer: new TextRenderer("response") },
  ], []);

  const contextMenuRenderer = useMemo(() => new TrafficListContextMenuRenderer(invoke), []);

  const handleSelectedRowChanged = useCallback((first: TrafficItemMap | null, items: TrafficItemMap[] | null) => {
    setSelections({ firstSelected: first, others: items });
  }, [setSelections]);

  return (
    <TableView
      headers={headers}
      data={filteredTraffic}
      selectedItems={selections.others}
      contextMenuRenderer={contextMenuRenderer}
      onSelectedRowChanged={handleSelectedRowChanged}
      autoScrollToBottom
    />
  );
};


class TrafficListContextMenuRenderer
  implements TableViewContextMenuRenderer<TrafficItemMap> {
  invoke: TauriInvokeFn;
  constructor(invoke: TauriInvokeFn) {
    this.invoke = invoke;
  }

  private async getRequestData(id: string) {
    const data = await this.invoke<any>("get_request_pair_data", { trafficId: id });
    if (data.body_path) {
      try {
        data.body = await readFile(data.body_path);
      } catch (e) {
        console.error("Failed to read body", e);
      }
    }
    return data;
  }

  private async getResponseData(id: string) {
    const data = await this.invoke<any>("get_response_pair_data", { trafficId: id });
    if (data.body_path) {
      try {
        data.body = await readFile(data.body_path);
      } catch (e) {
        console.error("Failed to read body", e);
      }
    }
    return data;
  }

  private decodeBody(body: any): string {
    if (!body) return "";
    if (body instanceof Uint8Array || Array.isArray(body)) {
      return new TextDecoder().decode(new Uint8Array(body));
    }
    return String(body);
  }

  private async getIcon(svg: string): Promise<Image | undefined> {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 32; // Higher resolution for Retina screens
      canvas.height = 32;
      const ctx = canvas.getContext("2d")!;

      // Add styling to SVG (white stroke for dark mode compatibility)
      const styledSvg = svg.replace("currentColor", "#FFFFFF");
      const svgBlob = new Blob([styledSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new globalThis.Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      ctx.drawImage(img, 4, 4, 24, 24);
      URL.revokeObjectURL(url);

      const imageData = ctx.getImageData(0, 0, 32, 32);
      return Image.new(new Uint8Array(imageData.data), 32, 32);
    } catch (e) {
      console.error("Failed to render icon", e);
      return undefined;
    }
  }

  private icons = {
    link: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    terminal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`,
    clipboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    fileText: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    database: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
    file: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`,
    table: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    tool: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    zap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
    smartphone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    send: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
  };

  async render(items: TrafficItemMap[], columnIndex?: number): Promise<void> {
    try {
      const ids = items.map((i) => i.id);
      const firstItem = items[0];

      // Prepare icons
      const [
        iLink, iTerminal, iClipboard, iCopy, iFileText, iDatabase, iFile, iTable,
        iRefresh, iEdit, iTool, iZap, iDownload, iGlobe, iSmartphone, iTrash, iFolder, iSend
      ] = await Promise.all([
        this.getIcon(this.icons.link),
        this.getIcon(this.icons.terminal),
        this.getIcon(this.icons.clipboard),
        this.getIcon(this.icons.copy),
        this.getIcon(this.icons.fileText),
        this.getIcon(this.icons.database),
        this.getIcon(this.icons.file),
        this.getIcon(this.icons.table),
        this.getIcon(this.icons.refresh),
        this.getIcon(this.icons.edit),
        this.getIcon(this.icons.tool),
        this.getIcon(this.icons.zap),
        this.getIcon(this.icons.download),
        this.getIcon(this.icons.globe),
        this.getIcon(this.icons.smartphone),
        this.getIcon(this.icons.trash),
        this.getIcon(this.icons.folder),
        this.getIcon(this.icons.send)
      ]);

      const menuItems = await Promise.all([
        IconMenuItem.new({
          id: "copy_url",
          text: "Copy URL",
          icon: iLink,
          enabled: items.length === 1 && !!firstItem.intercepted,
          action: async () => {
            if (firstItem?.url) await this.invoke("write_to_clipboard", { text: String(firstItem.url) });
          }
        }),
        IconMenuItem.new({
          id: "copy_curl",
          text: "Copy as cURL",
          icon: iTerminal,
          enabled: items.length === 1 && !!firstItem.intercepted,
          action: async () => {
            const data = await this.getRequestData(String(firstItem.id));
            const escapeShellArg = (arg: string): string => `'${arg.replace(/'/g, "'\\''")}'`;
            let command = `curl -X ${firstItem.method} ${escapeShellArg(String(firstItem.url))}`;
            data.headers.forEach((h: any) => {
              command += ` \\\n  -H ${escapeShellArg(`${h.key}: ${h.value}`)}`;
            });
            const body = this.decodeBody(data.body);
            if (body) command += ` \\\n  -d ${escapeShellArg(body)}`;
            await this.invoke("write_to_clipboard", { text: command });
          }
        }),
        IconMenuItem.new({
          id: "copy_cell",
          text: "Copy Cell Value",
          icon: iClipboard,
          enabled: items.length === 1 && !!firstItem.intercepted && columnIndex !== undefined && columnIndex !== -1,
          action: async () => {
            const columns = ["id", "intercepted", "tags", "url", "client", "method", "code", "time", "duration", "request", "response"];
            const key = columns[columnIndex!];
            if (key && firstItem[key] !== undefined) {
              const val = firstItem[key];
              await this.invoke("write_to_clipboard", { text: Array.isArray(val) ? val.join(", ") : String(val) });
            }
          }
        }),
        Submenu.new({
          text: "Copy as...",
          icon: iCopy,
          items: await Promise.all([
            IconMenuItem.new({
              id: "copy_req_header",
              text: "Request Headers",
              icon: iFileText,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getRequestData(String(firstItem.id));
                await this.invoke("write_to_clipboard", { text: data.headers.map((h: any) => `${h.key}: ${h.value}`).join("\n") });
              }
            }),
            IconMenuItem.new({
              id: "copy_req_cookie",
              text: "Request Cookies",
              icon: iDatabase,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getRequestData(String(firstItem.id));
                const cookie = data.headers.find((h: any) => h.key.toLowerCase() === "cookie");
                if (cookie) await this.invoke("write_to_clipboard", { text: cookie.value });
              }
            }),
            IconMenuItem.new({
              id: "copy_req_body",
              text: "Request Body",
              icon: iFile,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getRequestData(String(firstItem.id));
                await this.invoke("write_to_clipboard", { text: this.decodeBody(data.body) });
              }
            }),
            PredefinedMenuItem.new({ item: "Separator" }),
            IconMenuItem.new({
              id: "copy_res_header",
              text: "Response Headers",
              icon: iFileText,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getResponseData(String(firstItem.id));
                await this.invoke("write_to_clipboard", { text: data.headers.map((h: any) => `${h.key}: ${h.value}`).join("\n") });
              }
            }),
            IconMenuItem.new({
              id: "copy_res_cookie",
              text: "Response Cookies",
              icon: iDatabase,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getResponseData(String(firstItem.id));
                const cookie = data.headers.find((h: any) => h.key.toLowerCase() === "set-cookie");
                if (cookie) await this.invoke("write_to_clipboard", { text: cookie.value });
              }
            }),
            IconMenuItem.new({
              id: "copy_res_body",
              text: "Response Body",
              icon: iFile,
              enabled: items.length === 1 && !!firstItem.intercepted,
              action: async () => {
                const data = await this.getResponseData(String(firstItem.id));
                await this.invoke("write_to_clipboard", { text: this.decodeBody(data.body) });
              }
            }),
          ])
        }),
        PredefinedMenuItem.new({ item: "Separator" }),
        IconMenuItem.new({
          id: "repeat",
          text: "Repeat",
          icon: iRefresh,
          enabled: items.length === 1 && !!firstItem.intercepted,
          action: async () => {
            await this.invoke("repeat_request", { trafficId: String(firstItem.id) });
          }
        }),
        IconMenuItem.new({
          id: "edit_repeat",
          text: "Edit & Repeat",
          icon: iEdit,
          enabled: items.length === 1 && !!firstItem.intercepted,
          action: async () => {
            await this.invoke("open_new_window", { context: `repeat?id=${firstItem.id}`, title: "Edit & Repeat" });
          }
        }),
        PredefinedMenuItem.new({ item: "Separator" }),
        Submenu.new({
          text: "Tools",
          icon: iTool,
          items: await Promise.all([
            IconMenuItem.new({
              id: "tool_breakpoint",
              text: "Breakpoint",
              icon: iZap,
              enabled: items.length === 1,
              action: async () => {
                await this.invoke("open_new_window", { context: `breakpoint?id=${firstItem.id}`, title: "Breakpoint Editor" });
              }
            }),
            IconMenuItem.new({
              id: "tool_map_local",
              text: "Map Local",
              icon: iFolder,
              enabled: items.length === 1,
              action: async () => {
                await this.invoke("open_new_window", { context: `map-local?id=${firstItem.id}`, title: "Map Local Editor" });
              }
            }),
            IconMenuItem.new({
              id: "tool_map_remote",
              text: "Map Remote",
              icon: iGlobe,
              enabled: items.length === 1,
              action: async () => {
                await this.invoke("open_new_window", { context: `map-remote?id=${firstItem.id}`, title: "Map Remote Editor" });
              }
            }),
            IconMenuItem.new({
              id: "tool_composer",
              text: "Add to Composer",
              icon: iSend,
              enabled: items.length === 1,
              action: async () => {
                const item = items[0];
                const reqMethod = String(item.method || "GET");
                const reqUrl = String(item.url || "");
                const id = `req_${Date.now()}`;
                await this.invoke("save_composer_request", {
                  request: {
                    id,
                    name: `${reqMethod} ${reqUrl.length > 50 ? reqUrl.slice(0, 47) + "..." : reqUrl}`,
                    method: reqMethod,
                    url: reqUrl,
                    headers: [],
                    body: null,
                    body_type: "none",
                    timestamp: Date.now(),
                  }
                });
              }
            })
          ])
        }),
        PredefinedMenuItem.new({ item: "Separator" }),
        Submenu.new({
          text: `Export ${items.length === 1 ? 'item' : `${items.length} items`}`,
          icon: iDownload,
          items: await Promise.all([
            IconMenuItem.new({
              id: "export_har",
              text: "HAR",
              icon: iFileText,
              enabled: items.length > 0,
              action: () => {
                emit("export_selected", { ids });
              },
            }),
            IconMenuItem.new({
              id: "export_csv",
              text: "CSV",
              icon: iFile,
              enabled: items.length > 0,
              action: async () => {
                const headers = ["ID", "Method", "Code", "URL", "Time"];
                const rows = items.map(i => `"${i.id}","${i.method}","${i.code}","${i.url}","${i.time}"`);
                const csv = `${headers.map(h => `"${h}"`).join(",")}\n${rows.join("\n")}`;
                await this.invoke("write_to_clipboard", { text: csv });
              }
            }),
            IconMenuItem.new({
              id: "export_markdown",
              text: "Markdown Table",
              icon: iTable,
              enabled: items.length > 0,
              action: async () => {
                const headers = ["ID", "Method", "Code", "URL", "Time"];
                const rows = items.map(i => `| ${i.id} | ${i.method} | ${i.code} | ${i.url} | ${i.time} |`);
                const table = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.join("\n")}`;
                await this.invoke("write_to_clipboard", { text: table });
              }
            }),
          ])
        }),

        Submenu.new({
          text: "Add to Proxy List",
          icon: iGlobe,
          items: await Promise.all([
            IconMenuItem.new({
              id: "add_to_proxy_domain",
              text: (() => {
                const item = items[0];
                try {
                  return `Domain (${new URL(item.url as string).hostname})`;
                } catch {
                  return "Domain";
                }
              })(),
              icon: iGlobe,
              enabled: items.length === 1,
              action: async () => {
                const item = items[0];
                let domain = "";
                try {
                  domain = new URL(item.url as string).hostname;
                } catch {
                  domain = String(item.url);
                }
                await this.invoke("save_proxy_rule", {
                  rule: {
                    id: "",
                    enabled: true,
                    name: `Intercept ${domain}`,
                    pattern: domain,
                    action: "INTERCEPT"
                  }
                });
              }
            }),
            (async () => {
              const item = items[0];
              if (!item || !item.client) return IconMenuItem.new({ id: "add_to_proxy_client", text: "App", icon: iSmartphone, enabled: false });

              try {
                const clientInfo = JSON.parse(item.client as string);
                const client = clientInfo.name || "-";

                return IconMenuItem.new({
                  id: "add_to_proxy_client",
                  text: `App (${client})`,
                  icon: iSmartphone,
                  enabled: items.length === 1 && client !== "-",
                  action: async () => {
                    await this.invoke("save_proxy_rule", {
                      rule: {
                        id: "",
                        enabled: true,
                        name: `Intercept ${client}`,
                        pattern: `client:${client}`,
                        action: "INTERCEPT"
                      }
                    });
                  }
                });
              } catch {
                return IconMenuItem.new({ id: "add_to_proxy_client", text: "App", icon: iSmartphone, enabled: false });
              }
            })(),
          ])
        }),
        IconMenuItem.new({
          id: "delete_selected",
          text: `Delete ${items.length === 1 ? 'item' : `${items.length} items`}`,
          icon: iTrash,
          enabled: items.length > 0,
          action: () => {
            emit("delete_selected", { ids });
          },
        }),
      ]);

      const menu = await Menu.new({ items: menuItems });
      await menu.popup();
    } catch (e) {
      console.warn("Context menu is only available natively in Tauri", e);
    }
  }
}
