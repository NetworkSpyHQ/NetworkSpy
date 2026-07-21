import React, { useState, useRef, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableViewHeader, TableViewProps, SortOrder } from "./_types";
import { HeaderCell, ColumnResizeHighlight } from "./_HeaderCell";
import { useRowSelection } from "./_useRowSelection";

export type { TableViewHeader, TableViewProps, SortOrder };

export const TableView = <T,>({
  headers: initialHeaders,
  data,
  contextMenuRenderer,
  onSelectedRowChanged,
  selectedItems,
  className,
  renderRow,
  onRowClick,
  autoScrollToBottom,
}: TableViewProps<T>) => {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const autoScrollRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!autoScrollToBottom || !tbodyRef.current) return;
    const el = tbodyRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    autoScrollRef.current = atBottom;
  }, [autoScrollToBottom]);
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
    estimateSize: () => 30,
    overscan: 20,
  });

  useEffect(() => {
    if (!autoScrollToBottom || !autoScrollRef.current || sortedData.length === 0) return;
    rowVirtualizer.scrollToIndex(sortedData.length - 1, { align: 'end' });
  }, [sortedData.length, autoScrollToBottom]);

  const { selectedRows, onClickRow, showContextMenu } = useRowSelection({
    sortedData,
    contextMenuRenderer,
    onSelectedRowChanged,
    selectedItems,
    onRowClick,
  });

  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (e: React.MouseEvent, colIndex: number) => {
    resizeRef.current = { col: colIndex, startX: e.clientX, startWidth: columnWidths[colIndex] };
    setResizingCol(colIndex);

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
          onScroll={handleScroll}
          className="overflow-y-auto overflow-x-hidden flex-grow scroll-smooth relative"
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
    </div>
  );
};
