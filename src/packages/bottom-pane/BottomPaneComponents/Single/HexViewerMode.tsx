import { useEffect, useState, useMemo } from "react";
import { useAppProvider } from "@src/packages/app-env";
import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { ResponsePairData } from "../../ResponseTab";
import { HexView } from "../../TabRenderer/HexView";
import { FiCopy, FiCheck, FiCpu, FiHash } from "react-icons/fi";

export const HexViewerMode = () => {
    const { provider } = useAppProvider();
    const { selections } = useTrafficListContext();
    const trafficId = useMemo(() => selections.firstSelected?.id as string, [selections]);
    const [data, setData] = useState<ResponsePairData | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!trafficId) return;
        setLoading(true);
        provider.getResponsePairData(trafficId)
            .then((res) => setData(res))
            .finally(() => setLoading(false));
    }, [trafficId, provider]);

    const handleCopy = () => {
        if (!data?.body) return;
        const bytes = data.body as Uint8Array;
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        navigator.clipboard.writeText(hex);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!trafficId) return <Placeholder text="Select request for binary inspection" />;
    if (loading) return <Placeholder text="Scanning memory segments..." />;

    const byteCount = data?.body ? (data.body as Uint8Array).length : 0;

    return (
        <div className="bg-[#050505] flex flex-col min-h-full h-full font-sans relative overflow-hidden">
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(21,20,20,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

            {/* Premium Toolbar */}
            <div className="flex items-center justify-between px-4 @sm:px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-emerald-500/10 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-0 group-hover:scale-110 transition-transform"></div>
                        <div className="w-8 h-8 @sm:w-10 @sm:h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-2xl relative z-10">
                            <FiHash size={22} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white tracking-tight italic">Binary Heap Inspector</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-zinc-500 tracking-widest">Address Space: </span>
                            <span className="text-[9px] font-mono text-emerald-400/80 font-bold tracking-wider">{byteCount} Bytes (0x{byteCount.toString(16).toUpperCase()})</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/5"
                    >
                        {copied ? <FiCheck className="animate-bounce" size={12} /> : <FiCopy size={12} />}
                        {copied ? 'HEX COPIED' : 'COPY MEMORY'}
                    </button>
                </div>
            </div>

            <div className="flex-grow p-4 @sm:p-6 overflow-auto custom-scrollbar relative z-10">
                <div className="bg-[#080808] rounded-2xl border border-white/[0.03] p-4 @sm:p-6 shadow-3xl hover:border-emerald-500/20 transition-all duration-500">
                    <HexView data={data?.body as Uint8Array} />
                </div>
            </div>
        </div>
    );
};

const Placeholder = ({ text }: { text: string }) => (
    <div className="h-full flex items-center justify-center text-zinc-500 bg-[#050505] font-sans relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="text-center relative z-10">
            <div className="w-16 h-16 @sm:w-20 @sm:h-20 bg-emerald-600/5 rounded-3xl border border-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-2xl relative">
                <div className="absolute inset-0 bg-emerald-500/5 blur-2xl rounded-full"></div>
                <FiHash size={40} className="relative z-10" />
            </div>
            <div className="text-5xl font-black opacity-5 mb-3 italic tracking-tighter text-emerald-500">BINARY</div>
            <div className="text-[10px] font-bold tracking-normal text-zinc-600 mb-2">No request selected</div>
            <div className="text-xs italic">{text}</div>
        </div>
    </div>
);
