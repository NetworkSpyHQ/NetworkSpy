import { useState, useEffect, MouseEvent } from "react";
import { TableViewContextMenuRenderer } from "./_ContextMenu";

interface UseRowSelectionProps<T> {
  sortedData: T[];
  contextMenuRenderer?: TableViewContextMenuRenderer<T>;
  onSelectedRowChanged?: (firstSelected: T | null, items: T[] | null) => void;
  selectedItems?: T[] | null;
  onRowClick?: (item: T) => void;
}

export function useRowSelection<T>({
  sortedData,
  contextMenuRenderer,
  onSelectedRowChanged,
  selectedItems,
  onRowClick,
}: UseRowSelectionProps<T>) {
  const [selectedRows, setSelectedRows] = useState<{
    firstSelect?: number;
    rows: number[];
  }>({ rows: [] });

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

    let items = [sortedData[Number(indexString)]];
    if (selectedRows.rows.length > 1) {
      items = selectedRows.rows.map((i) => sortedData[i]);
    }

    await contextMenuRenderer.render(items, columnIndex, e);
  }

  return { selectedRows, getRowIndex, onClickRow, showContextMenu };
}
