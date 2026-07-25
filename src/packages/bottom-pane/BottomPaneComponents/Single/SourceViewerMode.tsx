import { useEffect, useState, useMemo } from "react";
import { useAppProvider } from "@src/packages/app-env";
import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { ResponsePairData } from "../../ResponseTab";
import { CodeView } from "../../TabRenderer/CodeView";
import { decodeBody } from "../../utils/bodyUtils";

import { FiCopy, FiCheck, FiWind, FiMaximize2 } from "react-icons/fi";

interface SourceViewerProps {
    language: string;
    title: string;
}

const beautifyCode = (code: string, lang: string) => {
    if (!code) return "";

    // If it's already multi-line, maybe keep it but we can still format
    // Simple robust formatter for CSS/JS/TS
    if (lang === 'css') {
        return code
            .replace(/\s*\{\s*/g, " {\n  ")
            .replace(/\s*;\s*/g, ";\n  ")
            .replace(/\s*\}\s*/g, "\n}\n\n")
            .replace(/\s*,\s*/g, ", ")
            .replace(/:\s*/g, ": ")
            .replace(/  +/g, "  ")
            .replace(/\n\s*\n/g, "\n")
            .trim();
    }

    if (lang === 'javascript' || lang === 'typescript') {
        return code
            .replace(/([;{}])/g, "$1\n")
            .replace(/\{/g, " {\n  ")
            .replace(/\}/g, "\n}")
            .replace(/\n\s*\n/g, "\n")
            .trim();
    }

    return code;
};

export const SourceViewerMode = ({ language, title }: SourceViewerProps) => {
    const { provider } = useAppProvider();
    const { selections } = useTrafficListContext();
    const trafficId = useMemo(() => selections.firstSelected?.id as string, [selections]);
    const [data, setData] = useState<ResponsePairData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFormatted, setIsFormatted] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!trafficId) return;
        setLoading(true);
        provider.getResponsePairData(trafficId)
            .then((res) => setData(res))
            .finally(() => setLoading(false));
    }, [trafficId, provider]);

    const displayCode = useMemo(() => {
        const decoded = decodeBody(data?.body, data?.content_type || language);
        return isFormatted ? beautifyCode(decoded, language) : decoded;
    }, [data, isFormatted, language]);

    const handleCopy = () => {
        navigator.clipboard.writeText(displayCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!trafficId) return <Placeholder text={`Select a request to view ${title}`} title={title} />;
    if (loading) return <Placeholder text={`Formatting ${title}...`} title={title} />;

    return (
        <div className="bg-[#111] flex flex-col min-h-full h-full font-sans">
            {/* Premium Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-[#1a1a1a] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[10px] font-black tracking-[0.2em] text-zinc-400">{title} Inspector</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsFormatted(!isFormatted)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 border ${isFormatted
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-zinc-800/50 border-white/5 text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <FiWind size={12} />
                        {isFormatted ? 'Beauty Mode: ON' : 'Make it Beautiful'}
                    </button>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-white/5 text-[10px] font-bold text-zinc-400 hover:text-white transition-all duration-300"
                    >
                        {copied ? <FiCheck className="text-emerald-500" size={12} /> : <FiCopy size={12} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>

            <div className="flex-grow relative h-full">
                <CodeView data={displayCode} language={language} />
            </div>
        </div>
    );
};

const Placeholder = ({ text, title }: { text: string, title: string }) => (
    <div className="h-full flex items-center justify-center text-zinc-500 bg-[#111]">
        <div className="text-center">
            <div className="text-5xl font-black opacity-5 mb-3 italic tracking-tighter">{title}</div>
            <div className="text-[10px] font-bold tracking-normal text-zinc-600 mb-2">No request selected</div>
            <div className="text-xs text-zinc-500 italic">{text}</div>
        </div>
    </div>
);
