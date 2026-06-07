import { useEffect, useState, useMemo } from "react";
import { useAppProvider } from "@src/packages/app-env";
import { useTrafficListContext } from "../../../main-content/context/TrafficList";
import { ResponsePairData } from "../../ResponseTab";
import { ImageView } from "../../TabRenderer/ImageView";

export const ImageViewerMode = () => {
    const { provider } = useAppProvider();
    const { selections } = useTrafficListContext();
    const trafficId = useMemo(() => selections.firstSelected?.id as string, [selections]);
    const [data, setData] = useState<ResponsePairData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!trafficId) return;
        setLoading(true);
        provider.getResponsePairData(trafficId)
            .then((res) => setData(res))
            .finally(() => setLoading(false));
    }, [trafficId, provider]);

    if (!trafficId) return <Placeholder text="Select a request to view image" />;
    if (loading) return <Placeholder text="Loading image..." />;

    const isImage = data?.content_type?.toLowerCase().includes('image');

    return (
        <div className="bg-[#0a0a0a] flex flex-col min-h-full">
            {isImage ? (
                <div className="flex-grow relative min-h-0">
                    <ImageView data={data?.body as Uint8Array} />
                </div>
            ) : (
                <div className="flex-grow flex items-center justify-center p-8">
                    <div className="text-zinc-500 text-sm italic">Response is not an image ({data?.content_type || 'Unknown Type'})</div>
                </div>
            )}
        </div>
    );
};

const Placeholder = ({ text }: { text: string }) => (
    <div className="h-full flex items-center justify-center text-zinc-500 bg-[#0a0a0a]">
        <div className="text-center">
            <div className="text-4xl font-black opacity-10 mb-2 italic">IMAGE</div>
            <div className="text-sm">{text}</div>
        </div>
    </div>
);
