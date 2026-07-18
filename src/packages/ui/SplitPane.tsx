import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
  ReactNode,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
} from "react";

// ── Utility ──────────────────────────────────────────────────────────────

function assertSize(
  size: string | number | undefined,
  containerSize: number,
  defaultValue = Infinity
): number {
  if (size === undefined || size === null) return defaultValue;
  if (typeof size === "number") return size;
  if (typeof size === "string") {
    if (size === "auto") return defaultValue;
    if (size.endsWith("%"))
      return containerSize * (Number.parseFloat(size) / 100);
    if (size.endsWith("px")) return Number.parseFloat(size);
  }
  return defaultValue;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function classNames(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(" ");
}

// ── Types ────────────────────────────────────────────────────────────────

interface HTMLElementProps {
  title?: string;
  style?: CSSProperties;
  className?: string;
  role?: string;
}

interface IPaneConfigs {
  minSize?: number | string;
  maxSize?: number | string;
}

export interface ISplitProps extends HTMLElementProps {
  children: JSX.Element[];
  allowResize?: boolean;
  split?: "vertical" | "horizontal";
  sizes: (string | number)[];
  sashRender: (index: number, active: boolean) => ReactNode;
  onChange: (sizes: number[]) => void;
  onDragStart?: (e: MouseEvent) => void;
  onDragEnd?: (e: MouseEvent) => void;
  sashClassName?: string;
  performanceMode?: boolean;
  resizerSize?: number;
}

export interface ISashContentProps {
  className?: string;
  type?: string;
  active?: boolean;
  children?: JSX.Element[];
}

// ── BEM class names (matches split-pane-react) ───────────────────────────

const SPLIT = "react-split";
const SPLIT_DRAGGING = `${SPLIT}--dragging`;
const SPLIT_VERTICAL = `${SPLIT}--vertical`;
const SPLIT_HORIZONTAL = `${SPLIT}--horizontal`;
const SASH = `${SPLIT}__sash`;
const SASH_VERTICAL = `${SASH}--vertical`;
const SASH_HORIZONTAL = `${SASH}--horizontal`;
const SASH_DISABLED = `${SASH}--disabled`;
const PANE = `${SPLIT}__pane`;
const BODY_DISABLE_SELECT = `${SPLIT}--disabled`;

// ── SashContent ──────────────────────────────────────────────────────────

export function SashContent({
  className,
  children,
  active,
  type,
  ...others
}: ISashContentProps) {
  return (
    <div
      className={classNames(
        "split-sash-content",
        active ? "split-sash-content-active" : undefined,
        type ? `split-sash-content-${type}` : undefined,
        className
      )}
      {...others}
    >
      {children}
    </div>
  );
}

// ── Pane ─────────────────────────────────────────────────────────────────

export function Pane({
  children,
  style,
  className,
  role,
  title,
}: PropsWithChildren<HTMLElementProps & IPaneConfigs>) {
  return (
    <div role={role} title={title} className={className} style={style}>
      {children}
    </div>
  );
}

// ── Sash (resize handle) ────────────────────────────────────────────────

interface SashProps {
  className?: string;
  style: CSSProperties;
  render: (active: boolean) => ReactNode;
  onDragStart: (e: MouseEvent) => void;
  onDragging: (e: MouseEvent) => void;
  onDragEnd: (e: MouseEvent) => void;
}

function Sash({ className, style, render, onDragStart, onDragging, onDragEnd }: SashProps) {
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      onDragging(e);
    },
    [onDragging]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      setDragging(false);
      onDragEnd(e);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    },
    [onDragEnd, handleMouseMove]
  );

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  return (
    <div
      role="Resizer"
      className={classNames(SASH, className)}
      style={style}
      onMouseEnter={() => {
        hoverTimeout.current = setTimeout(() => setActive(true), 150);
      }}
      onMouseLeave={() => {
        if (hoverTimeout.current) {
          setActive(false);
          clearTimeout(hoverTimeout.current);
        }
      }}
      onMouseDown={(e: ReactMouseEvent) => {
        setDragging(true);
        onDragStart(e as unknown as MouseEvent);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      }}
    >
      {render(dragging || active)}
    </div>
  );
}

// ── SplitPane ────────────────────────────────────────────────────────────

export default function SplitPane({
  children,
  sizes: propSizes,
  allowResize = true,
  split = "vertical",
  className: wrapClassName,
  sashRender = (_, active) => <SashContent active={active} type="vscode" />,
  resizerSize = 4,
  performanceMode = false,
  onChange = () => null,
  onDragStart = () => null,
  onDragEnd = () => null,
  ...others
}: ISplitProps) {
  const axis = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wrapper = useRef<HTMLDivElement>(null);
  const cacheSizes = useRef<{
    sizes: number[];
    sashPosSizes: number[];
  }>({ sizes: [], sashPosSizes: [] });
  const [wrapperRect, setWrapperRect] = useState<DOMRect | {}>({});
  const [isDragging, setDragging] = useState(false);

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new ResizeObserver(() => {
      setWrapperRect(wrapper.current?.getBoundingClientRect() ?? {});
    });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  const { sizeName, splitPos, splitAxis } = useMemo(
    () => ({
      sizeName: split === "vertical" ? "width" : "height" as "width" | "height",
      splitPos: split === "vertical" ? "left" : "top" as "left" | "top",
      splitAxis: split === "vertical" ? "x" : "y" as "x" | "y",
    }),
    [split]
  );

  const wrapSize: number = (wrapperRect as Record<string, number>)[sizeName] ?? 0;

  // Get min/max limits from Pane children
  const paneLimitSizes = useMemo(
    () =>
      children.map((child) => {
        const limits: [number, number] = [0, Infinity];
        if (child.type === Pane) {
          const { minSize, maxSize } = child.props as IPaneConfigs;
          limits[0] = assertSize(minSize, wrapSize, 0);
          limits[1] = assertSize(maxSize, wrapSize);
        }
        return limits;
      }),
    [children, wrapSize]
  );

  // Resolve sizes to pixel values
  const sizes = useMemo(() => {
    let autoCount = 0;
    let definedSum = 0;
    const resolved = children.map((_, i) => {
      const s = assertSize(propSizes[i], wrapSize);
      if (s === Infinity) autoCount++;
      else definedSum += s;
      return s;
    });

    // If total exceeds container or all are defined but underflow
    if (definedSum > wrapSize || (!autoCount && definedSum < wrapSize)) {
      const ratio = definedSum > 0 ? (wrapSize - definedSum) / definedSum : 0;
      return resolved.map((s) => (s === Infinity ? 0 : s + s * ratio));
    }

    // Distribute remaining space among auto panes
    if (autoCount > 0) {
      const each = (wrapSize - definedSum) / autoCount;
      return resolved.map((s) => (s === Infinity ? each : s));
    }

    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...propSizes, children.length, wrapSize]);

  // Cumulative positions for sash placement
  const sashPosSizes = useMemo(
    () => sizes.reduce((acc, s) => [...acc, acc[acc.length - 1] + s], [0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...sizes]
  );

  // Local drag tracking — updates instantly without waiting for parent re-render
  const dragOriginRef = useRef<number[] | null>(null);
  const dragCurrentRef = useRef<number[] | null>(null);
  const [, forceUpdate] = useState(0);

  const dragStart = useCallback(
    (e: MouseEvent) => {
      document.body.classList.add(BODY_DISABLE_SELECT);
      axis.current = { x: e.pageX, y: e.pageY };
      dragOriginRef.current = [...sizes];
      dragCurrentRef.current = [...sizes];
      setDragging(true);
      onDragStart(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDragStart, sizes]
  );

  const dragEnd = useCallback(
    (e: MouseEvent) => {
      document.body.classList.remove(BODY_DISABLE_SELECT);
      dragOriginRef.current = null;
      dragCurrentRef.current = null;
      setDragging(false);
      onDragEnd(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDragEnd]
  );

  const onDragging = useCallback(
    (e: MouseEvent, i: number) => {
      const curPos = splitAxis === "x" ? e.pageX : e.pageY;
      const startPos = splitAxis === "x" ? axis.current.x : axis.current.y;
      let distance = curPos - startPos;

      // Always compute from the ORIGINAL sizes at drag start
      const origin = dragOriginRef.current ?? sizes;

      const leftBorder = -Math.min(
        origin[i] - paneLimitSizes[i][0],
        paneLimitSizes[i + 1][1] - origin[i + 1]
      );
      const rightBorder = Math.min(
        origin[i + 1] - paneLimitSizes[i + 1][0],
        paneLimitSizes[i][1] - origin[i]
      );

      distance = clamp(distance, leftBorder, rightBorder);

      const next = [...origin];
      next[i] += distance;
      next[i + 1] -= distance;

      // Update local refs for instant visual feedback
      dragCurrentRef.current = next;
      forceUpdate((n) => n + 1);

      onChange(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paneLimitSizes, onChange, sizes, splitAxis]
  );

  // During drag, use local ref for instant visual feedback
  const activeSizes = dragCurrentRef.current ?? sizes;
  const activeSashPos = activeSizes.reduce(
    (acc: number[], s: number) => [...acc, acc[acc.length - 1] + s],
    [0]
  );

  const paneFollow = !(performanceMode && isDragging);
  const paneSizes = paneFollow ? activeSizes : cacheSizes.current.sizes;
  const panePoses = paneFollow ? activeSashPos : cacheSizes.current.sashPosSizes;

  return (
    <div
      className={classNames(
        SPLIT,
        split === "vertical" && SPLIT_VERTICAL,
        split === "horizontal" && SPLIT_HORIZONTAL,
        isDragging && SPLIT_DRAGGING,
        wrapClassName
      )}
      ref={wrapper}
      {...others}
    >
      {children.map((childNode, childIndex) => {
        const isPane = childNode.type === Pane;
        const paneProps = isPane ? (childNode.props as IPaneConfigs & HTMLElementProps) : {};

        return (
          <Pane
            key={childIndex}
            className={classNames(PANE, paneProps.className)}
            style={{
              ...paneProps.style,
              [sizeName]: paneSizes[childIndex],
              [splitPos]: panePoses[childIndex],
              position: "absolute",
              overflow: "hidden",
            }}
          >
            {isPane ? (childNode.props as { children?: ReactNode }).children ?? childNode : childNode}
          </Pane>
        );
      })}
      {activeSashPos.slice(1, -1).map((posSize, index) => (
        <Sash
          key={index}
          className={classNames(
            !allowResize && SASH_DISABLED,
            split === "vertical" ? SASH_VERTICAL : SASH_HORIZONTAL
          )}
          style={{
            [sizeName]: resizerSize,
            [splitPos]: posSize - resizerSize / 2,
            position: "absolute",
          }}
          render={sashRender.bind(null, index)}
          onDragStart={dragStart}
          onDragging={(e) => onDragging(e, index)}
          onDragEnd={dragEnd}
        />
      ))}
    </div>
  );
}
