import React, { useState, useRef, useEffect, MouseEvent } from "react";
import { twMerge } from "tailwind-merge";
import { Renderer } from "./_Renderer";
import { useDrag, useDrop } from "react-dnd";
import { TableViewContextMenuRenderer } from "./_ContextMenu";
import { FiChevronDown, FiChevronUp, FiPlay, FiPause, FiMousePointer, FiArrowDown } from "react-icons/fi";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface TableViewHeader<T> {
  title: string;
  renderer: Renderer<T>;
  sortable?: boolean;
  minWidth?: number;
  compareValue?: (a: any, b: any) => number;
}

export interface TableViewProps<T> {
  headers: TableViewHeader<T>[];
  data: T[];
  contextMenuRenderer?: TableViewContextMenuRenderer<T>;
  onSelectedRowChanged?: (firstSelected: T | null, items: T[] | null) => void;
  selectedItems?: T[] | null;
  className?: string;
  isAllowAutoScroll?: boolean;
  isAutoScroll?: boolean;
  renderRow?: (item: T, children: React.ReactNode) => React.ReactNode;
  onRowClick?: (item: T) => void;
}

type SortOrder = "asc" | "desc";

const HeaderCell = <T,>({
  header,
  index,
  moveHeader,
  sortConfig,
  handleSort,
  onResizeMouseDown,
  columnWidth,
  isLast,
  isResizing,
}: {
  header: TableViewHeader<T>;
  index: number;
  moveHeader: (dragIndex: number, hoverIndex: number) => void;
  sortConfig: { key: keyof T | null; order: SortOrder | null };
  handleSort: (index: number) => void;
  onResizeMouseDown: (e: React.MouseEvent, index: number) => void;
  columnWidth: number;
  isLast: boolean;
  isResizing: boolean;
}) => {
  const ref = useRef<HTMLTableHeaderCellElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "header",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "header",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveHeader(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  const isActive = sortConfig.key === header.title.toLowerCase();

  return (
    <div
      ref={ref}
      role="columnheader"
      className={twMerge(
        "px-3 py-1.5 relative bg-[#111111] border-b border-zinc-800 transition-colors group/header",
        isActive ? "text-blue-400 bg-[#161616]" : "text-zinc-500 hover:bg-zinc-800/40"
      )}
      onClick={() => handleSort(index)}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center justify-between cursor-grab w-full gap-1 overflow-hidden">
        <span className="text-[9px] font-black uppercase tracking-widest truncate">{header.title}</span>
        {isActive && (
          <span className="shrink-0 p-0.5 bg-blue-500/10 rounded text-blue-500">
            {sortConfig.order === "asc" ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />}
          </span>
        )}
      </div>
      {!isLast && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeMouseDown(e, index);
          }}
          className={twMerge(
            "absolute right-0 top-0 bottom-0 w-[3px] cursor-col-resize z-40 translate-x-1/2",
            isResizing ? "bg-blue-400" : "bg-zinc-700 hover:bg-blue-500/60"
          )}
        />
      )}
    </div>
  );
};

const ColumnResizeHighlight = ({ left }: { left: number }) => (
  <div
    id="table-header-drag-highlight"
    className="absolute top-0 bottom-0 w-[3px] bg-blue-400 pointer-events-none z-50 -translate-x-1/2"
    style={{ left: `${left}px` }}
  />
);

export const TableView = <T,>({
  headers: initialHeaders,
  data,
  contextMenuRenderer,
  onSelectedRowChanged,
  selectedItems,
  className,
  isAllowAutoScroll,
  isAutoScroll,
  renderRow,
  onRowClick,
}: TableViewProps<T>) => {
  const [selectedRows, setSelectedRows] = useState<{
    firstSelect?: number;
    rows: number[];
  }>({ rows: [] });
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [buttonPos, setButtonPos] = useState({ bottom: 24, right: 32 });
  const isDraggingButton = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, b: 0, r: 0 });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);


  const [columnWidths, setColumnWidths] = useState<number[]>(
    initialHeaders.map((e) => e.minWidth || 150)
  );
  const [headers, setHeaders] = useState(initialHeaders);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    order: SortOrder | null;
  }>({ key: null, order: null });

  const sortedData = React.useMemo(() => {
    if (sortConfig.key === null) {
      return data;
    }
    const key = sortConfig.key as keyof T;
    const defaultComparer = (a: any, b: any) => (a < b ? -1 : 1);
    const comparer =
      headers.find((e) => (e.title.toLowerCase() as keyof T) === key)
        ?.compareValue || defaultComparer;

    return [...data].sort((a, b) => {
      if (sortConfig.order === "asc") {
        return comparer(a[key], b[key]);
      } else if (sortConfig.order === "desc") {
        return comparer(b[key], a[key]);
      }
      return 0;
    });
  }, [data, sortConfig, headers]);

  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => tbodyRef.current,
    estimateSize: () => 30, // Estimated row height
    overscan: 20,
  });

  function getRowIndex(e: MouseEvent): string | null {
    let target = e.target as HTMLElement;

    while (target && target.getAttribute('role') !== "row") {
      target = target.parentElement as HTMLElement;
    }

    if (target && target.getAttribute('role') === "row") {
      const index = target.getAttribute("data-index");
      return index;
    }

    return null;
  }

  async function onClickRow(e: MouseEvent) {
    const indexString = getRowIndex(e);
    if (!indexString) {
      return;
    }

    const index = Number(indexString);

    if (e.shiftKey) {
      if (selectedRows.firstSelect !== undefined) {
        const firstSelected = selectedRows.firstSelect;
        const start = Math.min(firstSelected, index);
        const end = Math.max(firstSelected, index);
        const newSelectedRows = Array.from(
          { length: end - start + 1 },
          (_, i) => start + i
        );
        setSelectedRows({
          firstSelect: firstSelected,
          rows: newSelectedRows,
        });
      }
    } else if (e.ctrlKey || e.metaKey) {
      const isSelected = selectedRows.rows.includes(index);
      if (isSelected) {
        setSelectedRows((prev) => ({
          ...prev,
          rows: prev.rows.filter((r) => r !== index),
        }));
      } else {
        setSelectedRows((prev) => ({
          firstSelect: index,
          rows: [...prev.rows, index],
        }));
      }
    } else {
      if (selectedRows.firstSelect == index) {
        setSelectedRows({ firstSelect: undefined, rows: [] });
      } else {
        setSelectedRows({ firstSelect: index, rows: [index] });
      }
    }

    if (onRowClick && index < sortedData.length) {
      onRowClick(sortedData[index]);
    }
  }

  useEffect(() => {
    if (selectedItems === null || (Array.isArray(selectedItems) && selectedItems.length === 0)) {
        if (selectedRows.rows.length > 0 || selectedRows.firstSelect !== undefined) {
           setSelectedRows({ rows: [] });
        }
    }
  }, [selectedItems]);


  useEffect(() => setAutoScrollEnabled(isAutoScroll || false), [isAutoScroll]);

  useEffect(() => {
    if (!onSelectedRowChanged) {
      return;
    }
    const firstSelect = selectedRows.firstSelect !== undefined
      ? sortedData[selectedRows.firstSelect]
      : null;
    const allItems = selectedRows.rows.map((i) => sortedData[i]);
    onSelectedRowChanged(firstSelect, allItems);
  }, [selectedRows]);

  async function showContextMenu(e: MouseEvent) {
    if (!contextMenuRenderer) {
      return;
    }

    const indexString = getRowIndex(e);
    if (!indexString) {
      return;
    }

    e.preventDefault();

    // Find column index
    let columnIndex = -1;
    let target = e.target as HTMLElement;
    while (target && target.getAttribute('role') !== "gridcell") {
      target = target.parentElement as HTMLElement;
    }
    if (target && target.getAttribute('role') === "gridcell") {
      const row = target.parentElement;
      if (row) {
        columnIndex = Array.from(row.children).indexOf(target);
      }
    }

    let selectedItems = [sortedData[Number(indexString)]];
    if (selectedRows.rows.length > 1) {
      selectedItems = selectedRows.rows.map((i) => sortedData[i]);
    }

    await contextMenuRenderer.render(selectedItems, columnIndex, e);
  }

  function _animateScroll() {
    if (tbodyRef.current) {
      const tbody = tbodyRef.current;
      const scrollHeight = tbody.scrollHeight;
      const clientHeight = tbody.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const currentScrollTop = tbody.scrollTop;

      if (maxScrollTop <= 0) return; // No need to scroll if content fits

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

    // Smooth progress bar update
    progressIntervalRef.current = setInterval(() => {
      setScrollProgress(prev => {
        if (prev >= 100) return 0; // Reset if it reaches 100% before the next scroll
        return prev + (step / interval) * 100;
      });
    }, step);

    timerRef.current = setInterval(() => {
      _animateScroll();
      setScrollProgress(0); // Reset progress after scroll
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [autoScrollEnabled]);

  useEffect(() => {
    // Initial scroll to bottom when data loads or autoscroll is enabled
    if (autoScrollEnabled && tbodyRef.current) {
      _animateScroll();
    }
  }, [autoScrollEnabled]); // Removed data dependency so it only triggers when toggled on

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

  const easeInOutQuad = (
    t: number,
    b: number,
    c: number,
    d: number
  ): number => {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  };

  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (e: React.MouseEvent, colIndex: number) => {
    resizeRef.current = { col: colIndex, startX: e.clientX, startWidth: columnWidths[colIndex] };
    setResizingCol(colIndex);

    const gridEl = (e.target as HTMLElement).closest("[role='rowgroup']")?.previousElementSibling as HTMLElement | null;

    const onMouseMove = (me: globalThis.MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = me.clientX - resizeRef.current.startX;
      const minW = headers[resizeRef.current.col].minWidth || 50;
      const newWidth = Math.max(minW, resizeRef.current.startWidth + dx);
      setColumnWidths((prev) => {
        const next = [...prev];
        next[resizeRef.current!.col] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      setResizingCol(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleSort = (index: number) => {
    const key = headers[index].title.toLocaleLowerCase() as keyof T;
    let order: SortOrder = "asc";
    if (sortConfig.key === key && sortConfig.order === "asc") {
      order = "desc";
    }
    setSortConfig({ key, order });
  };

  const moveHeader = (dragIndex: number, hoverIndex: number) => {
    const newHeaders = [...headers];
    const [draggedHeader] = newHeaders.splice(dragIndex, 1);
    newHeaders.splice(hoverIndex, 0, draggedHeader);
    const newColumnWidths = [...columnWidths];
    const [draggedWidth] = newColumnWidths.splice(dragIndex, 1);
    newColumnWidths.splice(hoverIndex, 0, draggedWidth);

    setHeaders(newHeaders);
    setColumnWidths(newColumnWidths);
  };

  const virtualItems = rowVirtualizer.getVirtualItems();

  const gridTemplate = headers.map((h, i) => {
    const w = columnWidths[i];
    return i === headers.length - 1 ? `minmax(${w}px, 1fr)` : `${w}px`;
  }).join(' ');

  return (
    <div className={twMerge("w-full h-full flex flex-col bg-[#050505] overflow-x-auto custom-scrollbar", className)}>
      <div role="grid" className="min-w-fit w-full flex flex-col h-full overflow-hidden">
        <div role="rowgroup" className="sticky top-0 z-30 shrink-0 border-b-2 border-zinc-900/50">
          <div role="row" className="grid min-w-full relative" style={{ gridTemplateColumns: gridTemplate }}>
            {headers.map((header, index) => (
              <HeaderCell
                key={`header-${index}`}
                header={header}
                index={index}
                moveHeader={moveHeader}
                sortConfig={sortConfig}
                handleSort={handleSort}
                onResizeMouseDown={handleResizeMouseDown}
                columnWidth={columnWidths[index]}
                isLast={index === headers.length - 1}
                isResizing={resizingCol === index}
              />
            ))}
            {resizingCol !== null && (() => {
              let left = 0;
              for (let i = 0; i <= resizingCol; i++) {
                left += columnWidths[i];
              }
              return <ColumnResizeHighlight left={left} />;
            })()}
          </div>
        </div>
        <div
          ref={tbodyRef}
          role="rowgroup"
          className="overflow-y-auto overflow-x-hidden flex-grow scroll-smooth relative"
          onScroll={handleScroll}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = sortedData[virtualRow.index];
              const isSelected = selectedRows.rows.includes(virtualRow.index);

              const rowCells = (
                <>
                  {headers.map((header, i) => (
                    <div
                      key={i}
                      role="gridcell"
                      className="px-3 py-[7px] text-zinc-200 text-[11px] min-w-0 flex flex-col justify-center max-w-full"
                    >
                      {header.renderer.render({
                        input: item,
                        width: columnWidths[i],
                      })}
                    </div>
                  ))}
                </>
              );

              const children = renderRow ? renderRow(item, rowCells) : rowCells;

              return (
                <div
                  key={virtualRow.key}
                  role="row"
                  ref={rowVirtualizer.measureElement}
                  onContextMenu={showContextMenu}
                  onClick={onClickRow}
                  className={twMerge(
                    "grid min-w-full group transition-all duration-150 border-b border-zinc-900/50 absolute top-0 left-0 items-stretch",
                    isSelected ? "bg-blue-600/30" : "hover:bg-zinc-800/30"
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                  data-index={virtualRow.index}
                >
                  {children}
                </div>
              );
            })}
          </div>

          {sortedData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-black/20 text-zinc-600 italic text-sm absolute inset-0">
              No data available
            </div>
          )}
        </div>
      </div>
      {/* Autoscroll Control Button */}
      {isAllowAutoScroll && (
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
            {/* Progress Circle (background) */}
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

            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-[10px] text-zinc-400 whitespace-nowrap pointer-events-none shadow-2xl">
              {autoScrollEnabled ? "Disable periodic scroll (Drag to move)" : "Enable 3s periodic scroll (Drag to move)"}
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
