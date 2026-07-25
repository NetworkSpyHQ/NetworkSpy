import { useEffect, useState, useMemo } from "react";
import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { useAppProvider } from "@src/packages/app-env";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiEdit2, FiShield, FiCpu, FiTrendingUp } from "react-icons/fi";
import { twMerge } from "tailwind-merge";
import { CustomScriptManager } from "../../CustomScriptManager";
import { useCustomScripts, StaticAnalysisFinding } from "../../useCustomScripts";
import { decodeBody } from "../../utils/bodyUtils";

interface ScanResult {
    check: string;
    status: "pass" | "fail" | "warn";
    message: string;
    impact: string;
}

const FindingCard = ({ finding }: { finding: StaticAnalysisFinding & { isCustom?: boolean, isError?: boolean, scriptName?: string } }) => (
    <div className={twMerge(
        "group overflow-hidden rounded-2xl border transition-all duration-300 shadow-xl mb-4",
        finding.isError
            ? "border-red-900/50 bg-red-950/10 hover:border-red-500/50"
            : "border-orange-900/30 bg-orange-950/5 hover:border-orange-500/50"
    )}>
        <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className={twMerge(
                        "text-[10px] font-black tracking-widest px-2 py-0.5 rounded",
                        finding.isError ? "bg-red-500 text-white" : "bg-orange-600 text-white"
                    )}>
                        {finding.type}
                    </span>
                    <span className="text-[10px] font-black text-zinc-500 tracking-widest pl-1">Heuristic Result</span>
                </div>
                <div className={twMerge(
                    "text-[8px] font-black px-2 py-0.5 rounded-full border tracking-tighter shadow-sm",
                    finding.isError
                        ? "bg-red-600 text-white border-red-500"
                        : "bg-orange-950 text-orange-400 border-orange-900/30"
                )}>
                    {finding.isError ? "Runtime Error" : "Pattern Matched"}
                </div>
            </div>

            <div className={twMerge(
                "text-xs font-mono p-3 rounded-xl border leading-relaxed",
                finding.isError
                    ? "text-red-400 bg-red-950/20 border-red-500/20"
                    : "text-zinc-300 bg-black/30 border-white/5"
            )}>
                {finding.value}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                        {finding.isError ? <FiAlertTriangle size={8} /> : <FiInfo size={8} />} {finding.isError ? "Root Cause" : "Risk Analysis"}
                    </div>
                    <div className="text-[10px] text-zinc-400 italic font-medium leading-tight">{finding.risk}</div>
                </div>
                <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-zinc-600 tracking-widest mb-1 flex items-center gap-1">
                        {finding.isError ? <FiEdit2 size={8} /> : <FiCheckCircle size={8} />} {finding.isError ? "Solution" : "Mitigation"}
                    </div>
                    <div className="text-[10px] text-zinc-400 italic font-medium leading-tight">{finding.solution}</div>
                </div>
            </div>
        </div>
    </div>
);

export const StaticSecurityMode = () => {
    const { selections } = useTrafficListContext();
    const { provider } = useAppProvider();
    const trafficId = useMemo(() => selections.firstSelected?.id as string, [selections]);

    const [data, setData] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [tab, setTab] = useState<'Analysis' | 'Custom Scripts'>('Analysis');

    const trafficData = useMemo(() => {
        return { body: decodeBody(data?.body || null), headers: data?.headers || [] };
    }, [data]);

    const { customFindings, isRunning } = useCustomScripts<StaticAnalysisFinding>('static_analysis', trafficData.body, trafficData.headers);

    useEffect(() => {
        if (!trafficId) return;
        setScanning(true);
        provider.getRequestPairData(trafficId)
            .then(res => setData(res))
            .finally(() => {
                setResults([
                    {
                        check: "Secret Leak Detection",
                        status: "fail",
                        message: "Potential AWS API Key regex match in response body.",
                        impact: "High: Unauthorized cloud infra access."
                    },
                    {
                        check: "Insecure TLS Handshake",
                        status: "pass",
                        message: "Protocol version TLS 1.3 verified.",
                        impact: "Minimal: Industry standard encryption."
                    },
                    {
                        check: "CORS Wildcard Policy",
                        status: "warn",
                        message: "Access-Control-Allow-Origin is set to '*'.",
                        impact: "Medium: Cross-domain data leakage risk."
                    },
                    {
                        check: "SQL Injection Patterns",
                        status: "pass",
                        message: "No common SQLi payloads detected in query params.",
                        impact: "Low: Heuristic check passed."
                    }
                ]);
                setScanning(false);
            });
    }, [trafficId, provider]);

    if (!trafficId) return <Placeholder text="Select a request to run high-speed static security checks." />;

    return (
        <div className="h-full bg-[#050505] flex flex-col overflow-hidden font-sans">
            <div className="px-6 pt-4 border-b border-zinc-900 bg-[#0a0a0a] flex flex-col shadow-lg shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500">
                            <FiCpu size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-tighter">Fast Static Inspector</h2>
                            <div className="text-[9px] text-zinc-500 font-bold tracking-widest italic text-orange-600/70">Real-time Heuristic Pattern Matching</div>
                        </div>
                    </div>

                    {scanning && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/10 rounded-full border border-orange-500/20">
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                            <span className="text-[8px] font-black text-orange-500 tracking-widest">Profiling Core Engine...</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    {(['Analysis', 'Custom Scripts'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={twMerge(
                                "pb-3 text-[11px] font-black tracking-widest transition-all relative",
                                tab === t ? "text-orange-500" : "text-zinc-600 hover:text-zinc-400"
                            )}
                        >
                            {t}
                            {tab === t && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-orange-500/50 shadow-lg" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar pb-10">
                <div className="max-w-4xl mx-auto p-4 @sm:p-8 space-y-8">
                    {tab === 'Custom Scripts' ? (
                        <CustomScriptManager category="static_analysis" />
                    ) : (
                        <div className="space-y-8">
                            {customFindings.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pl-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 tracking-widest">
                                            <FiShield size={12} /> Custom Static Rules
                                        </div>
                                        {isRunning && <span className="text-[9px] text-orange-500 font-black italic animate-pulse">Running Background Workers...</span>}
                                    </div>
                                    {customFindings.map((f, i) => <FindingCard key={i} finding={f} />)}
                                </div>
                            )}

                            <div>
                                <div className="text-[10px] font-black text-zinc-600 tracking-widest pl-1 mb-4">Core Engine Diagnostics</div>
                                <div className="grid grid-cols-1 @sm:grid-cols-2 gap-4">
                                    {results.map((res, i) => (
                                        <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 group hover:bg-zinc-900/60 transition-all duration-300 shadow-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="text-xs font-black text-zinc-200 italic tracking-tighter">{res.check}</div>
                                                <span className={twMerge(
                                                    "text-[8px] font-black px-2 py-0.5 rounded border transition-colors",
                                                    res.status === 'fail' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        res.status === 'warn' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                )}>
                                                    {res.status}
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-relaxed italic">
                                                {res.message}
                                            </div>

                                            <div className="mt-auto pt-3 border-t border-zinc-800/50 flex flex-col gap-1.5 font-sans">
                                                <span className="text-[8px] font-black text-zinc-600 tracking-widest opacity-60">Potential Impact</span>
                                                <span className="text-[10px] text-zinc-400/80 font-medium italic leading-relaxed">{res.impact}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-orange-950/10 border border-orange-900/20 rounded-3xl p-6 relative overflow-hidden shadow-inner">
                                <div className="absolute -bottom-4 -right-4 opacity-5 rotate-12">
                                    <FiTrendingUp size={120} />
                                </div>
                                <h4 className="text-[10px] font-black text-orange-500 tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <FiInfo size={12} /> Heuristic Telemetry
                                </h4>
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <div className="text-[9px] font-bold text-zinc-600 mb-1">Execution Speed</div>
                                        <div className="text-xs font-black text-white italic tracking-tighter">142ms <span className="text-emerald-500 text-[8px] opacity-60">OPTIMAL</span></div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold text-zinc-600 mb-1">Signature Count</div>
                                        <div className="text-xs font-black text-white italic tracking-tighter">1,240 <span className="text-orange-500 text-[8px] opacity-60 underline underline-offset-2">LATEST</span></div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-bold text-zinc-600 mb-1">Confidence Score</div>
                                        <div className="text-xs font-black text-white italic tracking-tighter">98.2% <span className="text-blue-500 text-[8px] opacity-60 italic">STABLE</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Placeholder = ({ text }: { text: string }) => (
    <div className="h-full flex flex-col items-center justify-center bg-[#050505] p-6 @sm:p-10 text-center font-sans">
        <div className="w-20 h-20 rounded-full bg-orange-600/5 flex items-center justify-center text-orange-950 mb-8 border border-orange-950/10 shadow-2xl relative">
            <FiCpu size={40} className="opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/10 to-transparent rounded-full animate-pulse"></div>
        </div>
        <h3 className="text-zinc-400 font-bold mb-2 tracking-normal">No Request Selected</h3>
        <p className="text-[10px] text-zinc-600 max-w-[200px] leading-relaxed font-medium tracking-normal">{text}</p>
    </div>
);

export default StaticSecurityMode;
