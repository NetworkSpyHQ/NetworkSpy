import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { useFilterContext } from "@src/context/FilterContext";
import { useMemo } from "react";
import { FiCheckCircle, FiClock, FiActivity, FiGlobe, FiLock, FiAlertCircle, FiTrendingUp, FiCpu } from "react-icons/fi";
import { twMerge } from "tailwind-merge";

export const SummaryMode = () => {
    const { filteredTraffic } = useFilterContext();
    const { trafficSet } = useTrafficListContext();

    const formatSize = (bytes: number) => {
        if (bytes <= 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const parseDuration = (d: string) => {
        if (!d) return 0;
        const num = parseFloat(d.replace(/[^\d.]/g, ''));
        if (d.includes('µs') || d.includes('μs')) return num / 1000;
        if (d.includes('s') && !d.includes('ms')) return num * 1000;
        return num; // Default ms
    };

    const stats = useMemo(() => {
        const total = filteredTraffic.length;
        let successCount = 0;
        let totalDuration = 0;
        let totalReqBytes = 0;
        let totalResBytes = 0;
        let secureCount = 0;

        const methods: Record<string, number> = {};
        const statuses: Record<string, number> = {};
        const hosts: Record<string, number> = {};
        const endpoints: Record<string, number> = {};
        const latencyBuckets = { fast: 0, normal: 0, slow: 0 };

        filteredTraffic.forEach((item) => {
            const raw = trafficSet[String(item.id)];
            if (!raw) return;

            const method = raw.method || "UNKNOWN";
            methods[method] = (methods[method] || 0) + 1;

            const code = raw.response?.status_code || 0;
            const statusStr = code.toString();
            statuses[statusStr] = (statuses[statusStr] || 0) + 1;
            if (code >= 200 && code < 300) successCount++;

            const dur = parseDuration(raw.duration);
            totalDuration += dur;
            if (dur < 100) latencyBuckets.fast++;
            else if (dur < 500) latencyBuckets.normal++;
            else latencyBuckets.slow++;

            totalReqBytes += raw.request?.size || 0;
            totalResBytes += raw.response?.size || 0;

            try {
                const url = new URL(raw.uri);
                hosts[url.hostname] = (hosts[url.hostname] || 0) + 1;
                endpoints[url.pathname] = (endpoints[url.pathname] || 0) + 1;
                if (url.protocol === 'https:') secureCount++;
            } catch (e) { }
        });

        return {
            total,
            successRate: total > 0 ? ((successCount / total) * 100).toFixed(1) : "0",
            avgLatency: total > 0 ? (totalDuration / total).toFixed(0) : "0",
            totalThroughput: formatSize(totalReqBytes + totalResBytes),
            totalReqSize: formatSize(totalReqBytes),
            totalResSize: formatSize(totalResBytes),
            secureRate: total > 0 ? ((secureCount / total) * 100).toFixed(1) : "0",
            methods: Object.entries(methods).sort((a, b) => b[1] - a[1]),
            statuses: Object.entries(statuses).sort((a, b) => b[1] - a[1]),
            hosts: Object.entries(hosts).sort((a, b) => b[1] - a[1]),
            endpoints: Object.entries(endpoints).sort((a, b) => b[1] - a[1]).slice(0, 5),
            latencyBuckets,
            secureCount,
            insecureCount: total - secureCount
        };
    }, [filteredTraffic, trafficSet]);

    if (stats.total === 0) {
        return <EmptyState />;
    }

    const showHosts = stats.hosts.length > 2;

    return (
        <div className="h-full bg-[#050505] text-white p-2 @sm:p-3 overflow-auto custom-scrollbar font-sans @container selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto space-y-4 pb-10">
                {/* Header */}
                <header className="flex flex-col gap-3 pt-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl @sm:text-4xl font-black tracking-tighter leading-none italic text-zinc-100">Intelligence Dashboard</h1>
                        <div className="hidden @md:flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest text-zinc-400">System Ready</span>
                        </div>
                    </div>
                    <p className="text-xs @sm:text-sm text-zinc-500 font-bold tracking-[0.2em] italic pl-1">Real-time Cross-Request Analysis</p>
                </header>

                {/* Hero Stats */}
                <div className="grid grid-cols-2 @lg:grid-cols-4 gap-3 @sm:gap-4">
                    <StatCard
                        title="Total Traffic"
                        value={stats.total}
                        subValue={`${stats.successRate}% Success`}
                        icon={<FiActivity size={18} />}
                        themeColor="text-blue-400"
                    />
                    <StatCard
                        title="Avg Latency"
                        value={`${stats.avgLatency}ms`}
                        subValue={stats.latencyBuckets.slow > 0 ? `${stats.latencyBuckets.slow} Slow Req` : "Optimal Performance"}
                        icon={<FiClock size={18} />}
                        themeColor="text-orange-400"
                    />
                    <StatCard
                        title="Throughput"
                        value={stats.totalThroughput}
                        subValue={`${stats.totalReqSize} ↑ / ${stats.totalResSize} ↓`}
                        icon={<FiActivity size={18} />}
                        themeColor="text-emerald-400"
                    />
                    <StatCard
                        title="Security"
                        value={`${stats.secureRate}%`}
                        subValue={`${stats.secureCount} HTTPS`}
                        icon={<FiLock size={18} />}
                        themeColor="text-purple-400"
                    />
                </div>

                <div className="grid grid-cols-1 @lg:grid-cols-3 gap-6">
                    {/* Performance Breakdown */}
                    <div className="space-y-6 flex flex-col">
                        <Section title="Performance Distribution" icon={<FiClock className="text-orange-400" />}>
                            <div className="space-y-4 pt-1 flex-grow">
                                <BucketRow label="Fast (<100ms)" count={stats.latencyBuckets.fast} total={stats.total} color="bg-emerald-400" />
                                <BucketRow label="Normal (100-500ms)" count={stats.latencyBuckets.normal} total={stats.total} color="bg-blue-400" />
                                <BucketRow label="Slow (>500ms)" count={stats.latencyBuckets.slow} total={stats.total} color="bg-red-400" />
                            </div>
                        </Section>

                        <Section title="System Telemetry" icon={<FiCpu className="text-emerald-400" />} className="hidden @sm:flex">
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="flex flex-col items-center justify-center py-3 px-3 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-[10px] font-black text-zinc-500 tracking-widest mb-1 px-1 text-center">Encrypted</div>
                                    <div className="text-lg font-black text-emerald-400 italic tracking-tighter">{stats.secureCount}</div>
                                </div>
                                <div className="flex flex-col items-center justify-center py-3 px-3 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="text-[10px] font-black text-zinc-500 tracking-widest mb-1 px-1 text-center">Success</div>
                                    <div className="text-lg font-black text-blue-400 italic tracking-tighter">{stats.successRate}%</div>
                                </div>
                            </div>
                        </Section>
                    </div>

                    {/* Conditional Section */}
                    <Section
                        title={showHosts ? "Top Destinations" : "Most Frequented Paths"}
                        icon={showHosts ? <FiGlobe className="text-blue-400" /> : <FiTrendingUp className="text-blue-400" />}
                        className="@lg:col-span-1 min-h-[300px]"
                    >
                        <div className="space-y-3 pt-2 flex-grow">
                            {(showHosts ? stats.hosts.slice(0, 5) : stats.endpoints).map(([item, count], i) => (
                                <div key={item} className="flex items-center justify-between bg-white/[0.04] p-3 rounded-xl border border-white/5 group hover:bg-white/[0.08] transition-all duration-300">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <span className="text-[12px] font-black text-zinc-800 w-5 font-mono">{i + 1}</span>
                                        <span className="text-sm font-semibold text-zinc-200 truncate tracking-tight">{item}</span>
                                    </div>
                                    <span className="text-[11px] font-black bg-zinc-800 text-zinc-300 px-3 py-1 rounded-xl border border-white/5 shadow-inner">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Breakdown Sections */}
                    <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-1 gap-6">
                        <Section title="Protocol Methods" icon={<FiCheckCircle className="text-blue-500" />}>
                            <div className="space-y-4 pt-2">
                                {stats.methods.slice(0, 4).map(([method, count]) => (
                                    <BucketRow key={method} label={method} count={count} total={stats.total} color="bg-blue-500" />
                                ))}
                            </div>
                        </Section>
                        <Section title="Status Diagnostics" icon={<FiAlertCircle className="text-red-400" />}>
                            <div className="space-y-4 pt-2">
                                {stats.statuses.slice(0, 4).map(([status, count]) => (
                                    <BucketRow
                                        key={status}
                                        label={status}
                                        count={count}
                                        total={stats.total}
                                        color={
                                            status.startsWith('2') ? "bg-emerald-400" :
                                                status.startsWith('3') ? "bg-blue-400" :
                                                    status.startsWith('4') ? "bg-orange-400" : "bg-red-400"
                                        }
                                    />
                                ))}
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, subValue, icon, themeColor }: { title: string; value: string | number; subValue?: string; icon: React.ReactNode; themeColor: string }) => (
    <div className="bg-zinc-950 p-3 @sm:p-4 rounded-2xl border border-white/10 shadow-2xl group transition-all duration-500 hover:border-white/20 relative overflow-hidden">
        <div className="flex items-start justify-between mb-2 @sm:mb-3">
            <div className="text-zinc-500 text-xs font-black tracking-[0.1em]">{title}</div>
            <div className={twMerge("p-2.5 bg-white/5 rounded-2xl transition-colors duration-500 group-hover:bg-white/10", themeColor)}>{icon}</div>
        </div>
        <div className="flex flex-col">
            <div className="text-2xl @sm:text-3xl font-black italic tracking-tighter leading-none text-zinc-100">{value}</div>
            <div className="text-[10px] text-zinc-400 font-bold tracking-[0.12em] mt-2 opacity-80 truncate">{subValue}</div>
        </div>
        <div className={twMerge("absolute top-0 right-0 w-32 h-[1px] opacity-30", themeColor.replace('text', 'bg'))} />
    </div>
);

const Section = ({ title, icon, children, className = "" }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={twMerge("bg-zinc-950 p-4 @sm:p-5 rounded-3xl border border-white/5 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)] flex flex-col", className)}>
        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] mb-3 flex items-center gap-2 italic px-1">
            {icon} {title}
        </h3>
        {children}
    </div>
);

const BucketRow = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-2.5 group/row px-1">
            <div className="flex justify-between items-center text-[11px] font-black tracking-wider">
                <span className="text-zinc-400 group-hover/row:text-zinc-200 transition-colors">{label}</span>
                <span className="text-zinc-300 font-mono tracking-tighter">{count} <span className="text-zinc-500 ml-1">({percentage.toFixed(0)}%)</span></span>
            </div>
            <div className="w-full bg-white/[0.04] rounded-full h-1.5 border border-white/5 overflow-hidden">
                <div className={twMerge("h-full rounded-full transition-all duration-1000 ease-out", color)} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const EmptyState = () => (
    <div className="h-full flex flex-col items-center justify-center bg-[#050505] p-10 text-center font-sans">
        <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-950 border border-white/10 flex items-center justify-center text-zinc-800 mb-10 shadow-2xl relative group">
            <FiActivity size={40} className="group-hover:text-blue-400/50 transition-colors duration-1000" />
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 rounded-[2.5rem] group-hover:opacity-100 transition-opacity duration-1000" />
        </div>
        <h3 className="text-zinc-200 font-bold mb-3 tracking-normal text-xl">Start Capturing</h3>
        <p className="text-xs text-zinc-500 max-w-[250px] font-bold tracking-[0.2em] leading-relaxed opacity-60">Press the capture button to begin monitoring traffic</p>
    </div>
);
