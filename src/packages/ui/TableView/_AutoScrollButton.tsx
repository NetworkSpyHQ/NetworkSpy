import React, { useState, useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { FiPlay, FiPause, FiMousePointer, FiArrowDown } from "react-icons/fi";

interface AutoScrollButtonProps {
  tbodyRef: React.RefObject<HTMLTableSectionElement | null>;
  isAllowAutoScroll?: boolean;
  isAutoScroll?: boolean;
}

const easeInOutQuad = (t: number, b: number, c: number, d: number): number => {
  t /= d / 2;
  if (t < 1) return (c / 2) * t * t + b;
  t--;
  return (-c / 2) * (t * (t - 2) - 1) + b;
};

export const AutoScrollButton: React.FC<AutoScrollButtonProps> = ({
  tbodyRef,
  isAllowAutoScroll,
  isAutoScroll,
}) => {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [buttonPos, setButtonPos] = useState({ bottom: 24, right: 32 });
  const isDraggingButton = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, b: 0, r: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setAutoScrollEnabled(isAutoScroll || false), [isAutoScroll]);

  function _animateScroll() {
    if (tbodyRef.current) {
      const tbody = tbodyRef.current;
      const scrollHeight = tbody.scrollHeight;
      const clientHeight = tbody.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const currentScrollTop = tbody.scrollTop;

      if (maxScrollTop <= 0) return;

      setIsScrolling(true);
      const animateScroll = (startTime: number) => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const duration = 500;

        if (elapsed < duration) {
          const easedTime = easeInOutQuad(
            elapsed,
            currentScrollTop,
            maxScrollTop - currentScrollTop,
            duration
          );
          tbody.scrollTop = easedTime;
          requestAnimationFrame(() => animateScroll(startTime));
        } else {
          tbody.scrollTop = maxScrollTop;
          setIsScrolling(false);
        }
      };

      animateScroll(Date.now());
    }
  }

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setScrollProgress(0);

    if (!autoScrollEnabled) {
      return;
    }

    const interval = 3000;
    const step = 100;

    progressIntervalRef.current = setInterval(() => {
      setScrollProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (step / interval) * 100;
      });
    }, step);

    timerRef.current = setInterval(() => {
      _animateScroll();
      setScrollProgress(0);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [autoScrollEnabled]);

  useEffect(() => {
    if (autoScrollEnabled && tbodyRef.current) {
      _animateScroll();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (!tbodyRef.current) return;
  };

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    isDraggingButton.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      b: buttonPos.bottom,
      r: buttonPos.right
    };

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const dx = dragStartRef.current.x - moveEvent.clientX;
      const dy = dragStartRef.current.y - moveEvent.clientY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingButton.current = true;
      }

      setButtonPos({
        bottom: Math.max(0, dragStartRef.current.b + dy),
        right: Math.max(0, dragStartRef.current.r + dx)
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove as any);
      window.removeEventListener("mouseup", handleMouseUp as any);
    };

    window.addEventListener("mousemove", handleMouseMove as any);
    window.addEventListener("mouseup", handleMouseUp as any);
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (isDraggingButton.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setAutoScrollEnabled(!autoScrollEnabled);
  };

  if (!isAllowAutoScroll) {
    return null;
  }

  return (
    <div
      className="absolute z-40 touch-none"
      style={{ bottom: `${buttonPos.bottom}px`, right: `${buttonPos.right}px` }}
    >
      <button
        onMouseDown={handleButtonMouseDown}
        onClick={handleButtonClick}
        className={twMerge(
          "relative group flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-300 shadow-xl cursor-default",
          autoScrollEnabled
            ? "bg-blue-600 border-blue-400 text-white"
            : "bg-[#18181b] border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500",
          isDraggingButton.current ? "scale-105 cursor-grabbing" : "hover:scale-105"
        )}
      >
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none opacity-20">
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${autoScrollEnabled ? scrollProgress : 0}%` }}
          />
        </div>

        <div className="relative flex items-center gap-2">
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-0.5 opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity">
            <FiMousePointer size={10} />
          </div>

          {isScrolling ? (
            <>
              <FiArrowDown size={14} className="animate-bounce" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Scrolling</span>
            </>
          ) : autoScrollEnabled ? (
            <>
              <div className="relative flex items-center justify-center">
                <FiPause size={14} className="animate-pulse" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider">Tracing...</span>
            </>
          ) : (
            <>
              <FiPlay size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Paused</span>
            </>
          )}
        </div>

        <div className="absolute bottom-full mb-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-[10px] text-zinc-400 whitespace-nowrap pointer-events-none shadow-2xl">
          {autoScrollEnabled ? "Disable periodic scroll (Drag to move)" : "Enable 3s periodic scroll (Drag to move)"}
        </div>
      </button>
    </div>
  );
};
