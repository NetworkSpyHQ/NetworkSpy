import { useEffect, useState, useMemo, useCallback } from "react";
import { useAppProvider } from "@src/packages/app-env";
import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { ResponsePairData } from "../../ResponseTab";
import { ImageView } from "../../TabRenderer/ImageView";
import { extractImageMeta, ImageMeta } from "../../utils/imageMetadata";
import { FiInfo, FiChevronDown, FiChevronRight, FiCamera, FiMapPin, FiFileText } from "react-icons/fi";

export const ImageViewerMode = () => {
    const { provider } = useAppProvider();
    const { selections } = useTrafficListContext();
    const trafficId = useMemo(() => selections.firstSelected?.id as string, [selections]);
    const [data, setData] = useState<ResponsePairData | null>(null);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState<ImageMeta | null>(null);
    const [showMeta, setShowMeta] = useState(false);
    const [sections, setSections] = useState<Record<string, boolean>>({
        basic: true,
        camera: false,
        gps: false,
    });

    useEffect(() => {
        if (!trafficId) return;
        setLoading(true);
        setShowMeta(false);
        setMeta(null);
        provider.getResponsePairData(trafficId)
            .then((res) => {
                setData(res);
                if (res?.body && res.content_type?.toLowerCase().includes('image')) {
                    extractImageMeta(res.body, res.content_type).then(setMeta);
                }
            })
            .finally(() => setLoading(false));
    }, [trafficId, provider]);

    const toggleSection = useCallback((key: string) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    if (!trafficId) return <Placeholder text="Select a request to view image" />;
    if (loading) return <Placeholder text="Loading image..." />;

    const isImage = data?.content_type?.toLowerCase().includes('image');

    return (
        <div className="bg-[#0a0a0a] flex flex-col min-h-full">
            {isImage ? (
                <div className="flex-grow relative min-h-0">
                    <ImageView data={data?.body as Uint8Array} />
                    <button
                        onClick={() => setShowMeta(!showMeta)}
                        className={`absolute top-3 right-3 z-10 p-1.5 rounded-md border transition-all duration-200 ${showMeta
                            ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                            : "bg-black/40 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                        }`}
                        title="Image Info"
                    >
                        <FiInfo size={14} />
                    </button>
                    {showMeta && meta && (
                        <div className="absolute top-0 right-0 bottom-0 w-72 z-20 bg-zinc-900/95 backdrop-blur-md border-l border-zinc-700/50 overflow-y-auto custom-scrollbar">
                            <div className="p-4 space-y-3">
                                <h3 className="text-[10px] font-bold text-zinc-500 tracking-widest">IMAGE INFO</h3>
                                <CollapseSection
                                    icon={<FiFileText size={11} />}
                                    label="Basic Info"
                                    isOpen={sections.basic}
                                    onToggle={() => toggleSection('basic')}
                                >
                                    <MetaItem label="Format" value={meta.format} />
                                    {meta.width && meta.height ? (
                                        <MetaItem label="Dimensions" value={`${meta.width} × ${meta.height}`} />
                                    ) : null}
                                    <MetaItem label="Size" value={meta.fileSize} />
                                </CollapseSection>

                                {meta.exif && Object.keys(meta.exif).length > 0 && (
                                    <CollapseSection
                                        icon={<FiCamera size={11} />}
                                        label="Camera"
                                        isOpen={sections.camera}
                                        onToggle={() => toggleSection('camera')}
                                    >
                                        {Object.entries(meta.exif).map(([key, value]) => (
                                            <MetaItem key={key} label={key} value={formatExifValue(value)} />
                                        ))}
                                    </CollapseSection>
                                )}

                                {meta.gps && (
                                    <CollapseSection
                                        icon={<FiMapPin size={11} />}
                                        label="GPS"
                                        isOpen={sections.gps}
                                        onToggle={() => toggleSection('gps')}
                                    >
                                        <MetaItem label="Latitude" value={meta.gps.latitude.toFixed(6)} />
                                        <MetaItem label="Longitude" value={meta.gps.longitude.toFixed(6)} />
                                    </CollapseSection>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center p-8">
                    <div className="text-zinc-500 text-sm italic">Response is not an image ({data?.content_type || 'Unknown Type'})</div>
                </div>
            )}
        </div>
    );
};

const CollapseSection = ({
    icon, label, isOpen, onToggle, children
}: {
    icon: React.ReactNode;
    label: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) => (
    <div className="border border-zinc-800/50 rounded-lg overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-zinc-400 tracking-widest hover:text-zinc-200 transition-colors bg-zinc-900/50"
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
            {isOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        </button>
        {isOpen && (
            <div className="px-3 py-2 space-y-1 border-t border-zinc-800/30">
                {children}
            </div>
        )}
    </div>
);

const MetaItem = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between items-center py-0.5">
        <span className="text-[10px] text-zinc-600">{label}</span>
        <span className="text-[10px] font-mono text-zinc-300 truncate ml-3 max-w-[140px]" title={String(value)}>
            {String(value)}
        </span>
    </div>
);

function formatExifValue(value: any): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return value.toString();
        if (value < 1000) return value.toFixed(1);
        return value.toFixed(0);
    }
    if (typeof value === 'string') {
        if (value.includes('"') || value.includes('{')) return value;
        return value;
    }
    return String(value);
}

const Placeholder = ({ text }: { text: string }) => (
    <div className="h-full flex items-center justify-center text-zinc-500 bg-[#0a0a0a]">
        <div className="text-center">
            <div className="text-4xl font-black opacity-10 mb-2 italic">IMAGE</div>
            <div className="text-sm">{text}</div>
        </div>
    </div>
);
