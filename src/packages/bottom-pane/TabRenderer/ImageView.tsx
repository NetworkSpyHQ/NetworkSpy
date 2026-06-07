import { useMemo, useEffect, useRef, useState, useCallback } from "react";

export const ImageView = ({ data }: { data: Uint8Array }) => {
  const url = useMemo(() => {
    if (!data || data.length === 0) return "";
    const blob = new Blob([data as any]);
    return URL.createObjectURL(blob);
  }, [data]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDragStart = useRef({ x: 0, y: 0 });

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.1, Math.min(prev + delta, 10)));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDragStart.current = offset;
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetAtDragStart.current.x + dx,
      y: offsetAtDragStart.current.y + dy,
    });
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (!url) return <div className="p-4 text-zinc-500 italic">No image data</div>;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#0a0a0a]"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={reset}
      style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
    >
      <img
        ref={imgRef}
        src={url}
        alt="response"
        className="max-w-full max-h-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: dragging.current ? 'none' : 'transform 0.1s ease',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div className="absolute bottom-2 right-2 bg-black/60 text-zinc-300 text-[11px] px-2 py-0.5 rounded font-mono select-none pointer-events-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
