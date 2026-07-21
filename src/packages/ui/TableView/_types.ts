import React from "react";
import { Renderer } from "./_Renderer";
import { TableViewContextMenuRenderer } from "./_ContextMenu";

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
  renderRow?: (item: T, children: React.ReactNode) => React.ReactNode;
  onRowClick?: (item: T) => void;
  autoScrollToBottom?: boolean;
}

export type SortOrder = "asc" | "desc";
