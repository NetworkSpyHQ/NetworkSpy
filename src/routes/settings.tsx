import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { FiSettings, FiTarget, FiInfo, FiTerminal, FiCpu, FiPlay, FiCheckCircle, FiXCircle, FiKey, FiShield, FiZap, FiLayers, FiSave } from 'react-icons/fi';
import { twMerge } from 'tailwind-merge';
import { useSettingsContext } from '../context/SettingsProvider';
import { AppPlan } from '../models/Plan';
import { getVersion } from '@tauri-apps/api/app';

export default function Settings() {
    const {
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
        plan,
        isVerified,
        verifyLicense,
        revokeLicense,
        isSyncing,
        openRouterKey,
        setOpenRouterKey,
        openRouterModel,
        setOpenRouterModel,
        aiBaseUrl,
        setAiBaseUrl,
        startProxyOnLaunch,
        setStartProxyOnLaunch,
        bottomPaneTabPosition,
        setBottomPaneTabPosition,
        autosave,
        setAutosave,
        theme,
        setTheme,
    } = useSettingsContext();

    const [appVersion, setAppVersion] = useState<string>('0.0.0');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [localLicenseKey, setLocalLicenseKey] = useState<string>("");
    const [licenseStatus, setLicenseStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
    const [licenseMessage, setLicenseMessage] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'ai' | 'license'>('general');

    useEffect(() => {
        if (isVerified) {
            setLicenseStatus('success');
            setLicenseMessage('License Active');
        }
    }, [isVerified]);

    const testMcpConnection = async () => {
        setTestStatus('testing');
        try {
            const result: any = await invoke("test_mcp_connection", { port: mcpHttpPort });
            if (result.success) {
                setTestStatus('success');
            } else {
                setTestStatus('error');
            }
        } catch (e) {
            setTestStatus('error');
        }
    };

    const handleVerifyLicense = async () => {
        if (!localLicenseKey) return;
        setLicenseStatus('verifying');
        setLicenseMessage('');
        try {
            const result: any = await verifyLicense(localLicenseKey);
            if (result.success) {
                setLicenseStatus('success');
                setLicenseMessage(result.message);
            } else {
                setLicenseStatus('error');
                setLicenseMessage(result.error || result.message);
            }
        } catch (e: any) {
            setLicenseStatus('error');
            setLicenseMessage(e.toString());
        }
    };

    useEffect(() => {
        getVersion().then(setAppVersion);
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-300 overflow-y-auto no-scrollbar">
            <div className="p-12 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative shadow-2xl">
                        <FiSettings size={24} className="text-zinc-500 animate-[spin_8s_linear_infinite]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Proxy Settings</h1>
                        <p className="text-zinc-500 text-xs font-medium tracking-wide uppercase mt-1">Configure your interception environment</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-zinc-800 mb-8">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={twMerge(
                            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'general' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        General
                        {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={twMerge(
                            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'appearance' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Appearance
                        {activeTab === 'appearance' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={twMerge(
                            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'ai' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        AI
                        {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('license')}
                        className={twMerge(
                            "px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'license' ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        License
                        {activeTab === 'license' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div
                                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300 cursor-pointer"
                                onClick={() => setSmartViewerMatch(!smartViewerMatch)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                                        <FiTarget size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Smart Viewer Sorting</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Automatically analyzes request contents to intelligently push the highest-matching viewers (e.g. SSE, GraphQL) to the front of the list.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${smartViewerMatch ? 'bg-yellow-600 shadow-[0_0_15px_rgba(202,138,4,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${smartViewerMatch ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <FiLayers size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Bottom Pane Tab Position</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Choose whether the viewer tabs (Request, Response, etc.) should appear at the top or bottom of the pane.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                    <button
                                        onClick={() => setBottomPaneTabPosition('top')}
                                        className={twMerge(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            bottomPaneTabPosition === 'top' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                                        )}
                                    >
                                        Top
                                    </button>
                                    <button
                                        onClick={() => setBottomPaneTabPosition('bottom')}
                                        className={twMerge(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            bottomPaneTabPosition === 'bottom' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                                        )}
                                    >
                                        Bottom
                                    </button>
                                </div>
                            </div>

                            <div
                                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300 cursor-pointer"
                                onClick={() => setStartProxyOnLaunch(!startProxyOnLaunch)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <FiPlay size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Start Proxy on Launch</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Automatically start the proxy server when the application is launched.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${startProxyOnLaunch ? 'bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${startProxyOnLaunch ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div
                                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300 cursor-pointer"
                                onClick={() => setAutosave(!autosave)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                        <FiSave size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Auto-save Viewers</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Automatically save viewer changes as you edit. Disable to switch to manual saving.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${autosave ? 'bg-emerald-600 shadow-[0_0_15px_rgba(52,211,153,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${autosave ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div
                                className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300 cursor-pointer"
                                onClick={() => setStreamCertificateLogs(!streamCertificateLogs)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                                        <FiTerminal size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Stream Certificate Logs</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Show real-time logs during certificate installation and removal.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${streamCertificateLogs ? 'bg-green-600 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${streamCertificateLogs ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
                                        <FiZap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Theme</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Choose between Light and Dark themes.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={twMerge(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            theme === 'light' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                                        )}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={twMerge(
                                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                            theme === 'dark' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                                        )}
                                    >
                                        Dark
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Tab */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="pt-4 pb-2">
                                <h2 className="text-sm font-black text-white flex items-center gap-2">
                                    <FiZap size={14} className="text-blue-500" />
                                    AI Configuration
                                    {(!plan?.isPersonal && !plan?.isPro) && (
                                        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded border border-blue-500/30">
                                            Free Plan (Default Model)
                                        </span>
                                    )}
                                </h2>
                                <p className="text-zinc-500 text-[10px] font-bold mt-1">Connect to LLMs for automated analysis</p>
                            </div>

                            <div className={twMerge(
                                "p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-[#0c0c0c] border border-zinc-800 shadow-2xl relative overflow-hidden group"
                            )}>
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">AI Provider API Key</label>
                                        <div className="relative group">
                                            <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                                            <input
                                                type="password"
                                                placeholder="AI Provider API Key (e.g. sk-...)"
                                                value={openRouterKey}
                                                onChange={(e) => setOpenRouterKey(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-5 py-4 text-sm font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                disabled={false}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">AI Model ID</label>
                                            {!plan?.isPersonal && !plan?.isPro && (
                                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Locked</span>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <FiCpu className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                placeholder="anthropic/claude-sonnet-4.6"
                                                value={openRouterModel}
                                                onChange={(e) => setOpenRouterModel(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-5 py-4 text-sm font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!plan?.isPersonal && !plan?.isPro}
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 leading-relaxed px-1 mt-1">
                                            Common: <code className="text-zinc-400">anthropic/claude-sonnet-4.6</code>, <code className="text-zinc-400">google/gemini-2.0-flash-001</code>
                                        </p>
                                        {!plan?.isPersonal && !plan?.isPro && (
                                            <p className="text-[10px] text-yellow-600/70 leading-relaxed px-1 font-medium">
                                                Upgrade to Personal or Pro to use custom models.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">AI Base URL / Provider</label>
                                            {!plan?.isPro && (
                                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Pro Only</span>
                                            )}
                                        </div>
                                        <div className="relative group">
                                            <FiCpu className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                placeholder="https://openrouter.ai/api/v1"
                                                value={aiBaseUrl}
                                                onChange={(e) => setAiBaseUrl(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-5 py-4 text-sm font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!plan?.isPro}
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-600 leading-relaxed px-1 mt-1">
                                            Default: <code className="text-zinc-400">https://openrouter.ai/api/v1</code>. Change this to use OpenAI, Anthropic, or local models.
                                        </p>
                                        {!plan?.isPro && (
                                            <p className="text-[10px] text-yellow-600/70 leading-relaxed px-1 font-medium">
                                                Upgrade to Pro to use custom providers.
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-zinc-600 leading-relaxed px-1 border-t border-zinc-800/50 pt-4">
                                        Your key is stored locally and used to power the in-app AI chat. Default provider is OpenRouter (<a href="https://openrouter.ai/" target="_blank" className="text-blue-500 hover:underline">openrouter.ai</a>).
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 pb-2">
                                <h2 className="text-sm font-black text-white flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    Model Context Protocol (MCP)
                                    {(!isVerified || !plan?.isPro) && (
                                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-widest rounded border border-yellow-500/30">
                                            Pro Only
                                        </span>
                                    )}
                                </h2>
                                <p className="text-zinc-500 text-[10px] font-bold mt-1">Enable LLM automation for your terminal & IDE</p>
                            </div>

                            <div
                                className={twMerge(
                                    "p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-purple-900/50 transition-all duration-300 cursor-pointer",
                                    (!isVerified || !plan?.isPro) && "opacity-50 cursor-not-allowed pointer-events-none"
                                )}
                                onClick={() => setMcpStdioEnabled(!mcpStdioEnabled)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                                        <FiCpu size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Enable MCP Stdio (Terminal)</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Allows CLI tools like <strong>Claude Code</strong> to launch the binary and interact directly via standard input/output.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${mcpStdioEnabled ? 'bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${mcpStdioEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            <div
                                className={twMerge(
                                    "p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between group hover:border-indigo-900/50 transition-all duration-300 cursor-pointer",
                                    (!isVerified || !plan?.isPro) && "opacity-50 cursor-not-allowed pointer-events-none"
                                )}
                                onClick={() => setMcpHttpEnabled(!mcpHttpEnabled)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                        <FiCpu size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-0.5">Enable MCP HTTP Streaming (Web)</h3>
                                        <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
                                            Exposes your traffic on <strong>http://localhost:3001/mcp</strong>.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${mcpHttpEnabled ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-zinc-800'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${mcpHttpEnabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {mcpHttpEnabled && (
                                <div className="ml-14 p-4 rounded-xl bg-indigo-900/10 border border-indigo-900/30 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">HTTP Port</h4>
                                        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">AI agents will connect to this port on localhost.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={mcpHttpPort}
                                            onChange={(e) => setMcpHttpPort(parseInt(e.target.value) || 3001)}
                                            className="w-24 bg-zinc-900 border border-indigo-900/50 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                                            min="1024"
                                            max="65535"
                                        />
                                        <button
                                            onClick={testMcpConnection}
                                            disabled={testStatus === 'testing'}
                                            className={`px-4 py-1.5 rounded-lg border flex items-center gap-2 transition-all duration-300 ${testStatus === 'success' ? 'bg-green-600/20 border-green-500/50 text-green-400' :
                                                testStatus === 'error' ? 'bg-red-600/20 border-red-500/50 text-red-400' :
                                                    'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 hover:scale-105 active:scale-95'
                                                }`}
                                        >
                                            {testStatus === 'testing' ? (
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : testStatus === 'success' ? (
                                                <FiCheckCircle size={14} />
                                            ) : testStatus === 'error' ? (
                                                <FiXCircle size={14} />
                                            ) : (
                                                <FiPlay size={14} />
                                            )}
                                            <span className="text-[10px] uppercase font-black tracking-widest leading-none mt-0.5">
                                                {testStatus === 'testing' ? 'Testing...' :
                                                    testStatus === 'success' ? 'Success' :
                                                        testStatus === 'error' ? 'Failed' : 'Test'
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* License Tab */}
                    {activeTab === 'license' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-[#0c0c0c] border border-zinc-800 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <FiShield size={120} className="text-blue-500" />
                                </div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                                        <FiKey size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white tracking-tight uppercase">License Activation</h2>
                                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Unlock professional features & updates</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {isVerified ? (
                                        <div className="relative group overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div className="relative flex items-center justify-between p-6 rounded-2xl bg-zinc-900/40 border border-green-500/20 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                                        <FiShield size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-sm font-black text-white tracking-tight uppercase">License Active</h3>
                                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest rounded border border-green-500/30">
                                                                {plan?.name || "Personal"}
                                                            </span>
                                                            {isSyncing && (
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-[0.2em] rounded animate-pulse">
                                                                    <div className="w-1 h-1 rounded-full bg-current" />
                                                                    Syncing
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                            <FiCheckCircle size={10} />
                                                            {isSyncing ? 'Refreshing Verification...' : 'Backend Verified • Secure Storage Active'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={revokeLicense}
                                                    className="px-5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all cursor-pointer z-10"
                                                >
                                                    Revoke License
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex gap-3">
                                                <div className="relative flex-1 group">
                                                    <FiKey className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="NS-XXXX-XXXX-XXXX-XXXX"
                                                        value={localLicenseKey}
                                                        onChange={(e) => setLocalLicenseKey(e.target.value.toUpperCase())}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-5 py-4 text-sm font-mono text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleVerifyLicense}
                                                    disabled={licenseStatus === 'verifying' || !localLicenseKey}
                                                    className={`px-8 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-3 cursor-pointer ${licenseStatus === 'success' ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)]' :
                                                        licenseStatus === 'error' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' :
                                                            'bg-white text-black hover:bg-blue-500 hover:text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                >
                                                    {licenseStatus === 'verifying' ? (
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <FiShield size={16} />
                                                    )}
                                                    <span>{licenseStatus === 'verifying' ? 'Verifying...' : 'Activate'}</span>
                                                </button>
                                            </div>

                                            {licenseMessage && (
                                                <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${licenseStatus === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' : 'bg-red-500/5 border-red-500/20 text-red-500'
                                                    }`}>
                                                    {licenseStatus === 'success' ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
                                                    <div className="flex-1">
                                                        <span className="text-[11px] font-black uppercase tracking-wider">{licenseMessage}</span>
                                                        {plan && <span className="ml-2 px-2 py-0.5 bg-zinc-900 rounded border border-current text-[9px] font-black uppercase tracking-widest">{plan.name}</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="mt-24 pt-8 border-t border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
                        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Environment Synced</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-inner group">
                            <FiInfo size={14} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Version {appVersion}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
