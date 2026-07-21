import React, { useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useDrag, useDrop } from "react-dnd";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { TableViewHeader, SortOrder } from "./_types";

interface HeaderCellProps<T> {
  header: TableViewHeader<T>;
  index: number;
  moveHeader: (dragIndex: number, hoverIndex: number) => void;
  sortConfig: { key: keyof T | null; order: SortOrder | null };
  handleSort: (index: number) => void;
  onResizeMouseDown: (e: React.MouseEvent, index: number) => void;
  columnWidth: number;
  isLast: boolean;
  isResizing: boolean;
}

export const HeaderCell = <T,>({
  header,
  index,
  moveHeader,
  sortConfig,
  handleSort,
  onResizeMouseDown,
  columnWidth,
  isLast,
  isResizing,
}: HeaderCellProps<T>) => {
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
            "absolute right-0 top-0 bottom-0 w-px cursor-col-resize z-40 translate-x-1/2",
            isResizing ? "bg-blue-400" : "bg-zinc-800 hover:bg-blue-500/60"
          )}
        />
      )}
    </div>
  );
};

export const ColumnResizeHighlight = ({ left }: { left: number }) => (
  <div
    id="table-header-drag-highlight"
    className="absolute top-0 bottom-0 w-[3px] bg-blue-400 pointer-events-none z-50 -translate-x-1/2"
    style={{ left: `${left}px` }}
  />
);
