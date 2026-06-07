import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { atomFamily } from 'jotai-family';
import { FilterNode } from "@src/models/Filter";

// Current Active Tab
export interface WorkspaceTab {
  id: string;
  title: string;
}

export const activeTabIdAtom = atomWithStorage<string>("ns_active_tab_id", "");
export const workspaceTabsAtom = atomWithStorage<WorkspaceTab[]>("ns_workspace_tabs_v2", []);


// Main Traffic List Filters (Per Tab)
export const mainTrafficListFiltersAtom = atomFamily((tabId: string) => atom<FilterNode[]>([]));

// Traffic List Selections (Per Tab)
export type TrafficListSelection = {
  firstSelected: any | null;
  others: any[] | null;
};
export const mainTrafficListSelectionsAtom = atomFamily((tabId: string) => atom<TrafficListSelection>({
    firstSelected: null,
    others: null,
}));

// Main Traffic List Search (Per Tab)
export const mainTrafficListSearchAtom = atomFamily((tabId: string) => atom<string>(""));

// Status Code Info Dialog
export const statusInfoDialogAtom = atom<{
    isOpen: boolean;
    code?: string | number;
} | null>(null);

export const titleBarContentAtom = atom<React.ReactNode | null>(null);

export const osAtom = atom<string>('macos');

export const isLicensedAtom = atom<boolean | null>(null);
