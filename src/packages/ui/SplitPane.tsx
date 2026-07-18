import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
  CSSProperties,
} from "react";
import "./splitpane.css";

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
  onChange: (sizes: number[]) => void;
  onDragStart?: (e: MouseEvent) => void;
  onDragEnd?: (e: MouseEvent) => void;
  performanceMode?: boolean;
  resizerSize?: number;
}

// ── BEM class names ─────────────────────────────────────────────────────

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

// ── Grid areas ───────────────────────────────────────────────────────────

const areaL = { gridArea: "left" };
const areaR = { gridArea: "right" };
const areaD = { gridArea: "drag" };

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

// ── SplitPane ────────────────────────────────────────────────────────────

export default function SplitPane({
  children,
  sizes: propSizes,
  allowResize = true,
  split = "vertical",
  className: wrapClassName,
  resizerSize = 4,
  performanceMode = false,
  onChange = () => null,
  onDragStart = () => null,
  onDragEnd = () => null,
  ...others
}: ISplitProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapSize, setWrapSize] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originSizes: number[];
  } | null>(null);
  const [dragSizes, setDragSizes] = useState<number[] | null>(null);

  // Track container size
  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(() => {
      const el = wrapperRef.current;
      if (!el) return;
      const s = split === "vertical" ? el.clientWidth : el.clientHeight;
      setWrapSize(s);
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [split]);

  const isVertical = split === "vertical";
  const splitAxis = isVertical ? "x" : "y";
  const splitAxisRef = useRef(splitAxis);
  splitAxisRef.current = splitAxis;

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

    if (definedSum > wrapSize || (!autoCount && definedSum < wrapSize)) {
      const ratio = definedSum > 0 ? (wrapSize - definedSum) / definedSum : 0;
      return resolved.map((s) => (s === Infinity ? 0 : s + s * ratio));
    }

    if (autoCount > 0) {
      const each = (wrapSize - definedSum) / autoCount;
      return resolved.map((s) => (s === Infinity ? each : s));
    }

    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...propSizes, children.length, wrapSize]);

  // The sizes used for rendering (drag override or props)
  const activeSizes = dragSizes ?? sizes;

  // Convert pixel sizes to fr units for CSS Grid
  const totalPx = activeSizes.reduce((a, b) => a + b, 0);
  const frSizes =
    totalPx > 0
      ? activeSizes.map((s) => s / totalPx)
      : activeSizes.map(() => 1);

  // Build grid template
  const gridTemplate = useMemo(() => {
    if (isVertical) {
      return `
        '${areaL.gridArea} ${areaD.gridArea} ${areaR.gridArea}'
        / ${frSizes[0]}fr 0 ${frSizes[1]}fr
      `;
    } else {
      return `
        '${areaL.gridArea}'
        ${frSizes[0]}fr
        '${areaD.gridArea}'
        0
        '${areaR.gridArea}'
        ${frSizes[1]}fr
        / 1fr
      `;
    }
  }, [isVertical, frSizes]);

  // ── Drag handling (native mouse events on window) ───────────────────
  // Use refs for callbacks so event listeners always call the latest version

  const paneLimitSizesRef = useRef(paneLimitSizes);
  paneLimitSizesRef.current = paneLimitSizes;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;

  const removeListeners = useCallback(() => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMove(e: MouseEvent) {
    if (!dragRef.current) return;

    const axis = splitAxisRef.current;
    const curPos = axis === "x" ? e.pageX : e.pageY;
    const startPos =
      axis === "x" ? dragRef.current.startX : dragRef.current.startY;
    let distance = curPos - startPos;

    const origin = dragRef.current.originSizes;
    const limits = paneLimitSizesRef.current;

    const leftBorder = -Math.min(
      origin[0] - limits[0][0],
      limits[1][1] - origin[1]
    );
    const rightBorder = Math.min(
      origin[1] - limits[1][0],
      limits[0][1] - origin[0]
    );

    distance = clamp(distance, leftBorder, rightBorder);

    setDragSizes([origin[0] + distance, origin[1] - distance]);
  }

  function onUp(e: MouseEvent) {
    if (!dragRef.current) return;

    document.body.classList.remove(BODY_DISABLE_SELECT);
    removeListeners();

    const axis = splitAxisRef.current;
    const curPos = axis === "x" ? e.pageX : e.pageY;
    const startPos =
      axis === "x" ? dragRef.current.startX : dragRef.current.startY;
    let distance = curPos - startPos;

    const origin = dragRef.current.originSizes;
    const limits = paneLimitSizesRef.current;

    const leftBorder = -Math.min(
      origin[0] - limits[0][0],
      limits[1][1] - origin[1]
    );
    const rightBorder = Math.min(
      origin[1] - limits[1][0],
      limits[0][1] - origin[0]
    );
    distance = clamp(distance, leftBorder, rightBorder);

    const finalSizes = [origin[0] + distance, origin[1] - distance];
    dragRef.current = null;
    setDragSizes(null);
    setIsDragging(false);
    onDragEndRef.current(e);
    onChangeRef.current(finalSizes);
  }

  const handleSashMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      document.body.classList.add(BODY_DISABLE_SELECT);
      dragRef.current = {
        startX: e.pageX,
        startY: e.pageY,
        originSizes: [...sizesRef.current],
      };
      setIsDragging(true);
      onDragStartRef.current(e as unknown as MouseEvent);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      className={classNames(
        SPLIT,
        isVertical ? SPLIT_VERTICAL : SPLIT_HORIZONTAL,
        isDragging && SPLIT_DRAGGING,
        wrapClassName
      )}
      style={{ gridTemplate }}
      ref={wrapperRef}
      {...others}
    >
      {children.map((childNode, childIndex) => {
        const isPane = childNode.type === Pane;
        const paneProps = isPane
          ? (childNode.props as IPaneConfigs & HTMLElementProps)
          : {};

        return (
          <Pane
            key={childIndex}
            className={classNames(PANE, paneProps.className)}
            style={{
              ...paneProps.style,
              gridArea: childIndex === 0 ? "left" : "right",
              minHeight: 0,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {isPane
              ? ((childNode.props as { children?: React.ReactNode })
                  .children ?? childNode)
              : childNode}
          </Pane>
        );
      })}
      {children.length > 1 && (
        <div
          onMouseDown={handleSashMouseDown}
          className={classNames(
            SASH,
            !allowResize && SASH_DISABLED,
            isVertical ? SASH_VERTICAL : SASH_HORIZONTAL
          )}
          style={{
            gridArea: "drag",
            zIndex: 10,
            ...(isVertical
              ? {
                  width: 10,
                  alignSelf: "stretch",
                }
              : {
                  height: 10,
                  justifySelf: "stretch",
                }),
          }}
        >
          {isDragging && (
            <div
              className={classNames(
                "fixed left-[-100vw] right-[-100vw] top-[-100vh] bottom-[-100vh] z-[9999]",
                isVertical ? "cursor-col-resize" : "cursor-row-resize"
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
