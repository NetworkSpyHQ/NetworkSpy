import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import { FilterNode, PredefinedFilter, FilterTypes, FilterOperators } from "../models/Filter";
import { invoke } from "@tauri-apps/api/core";
import { useLicense } from "../hooks/useLicense";
import { useUpgradeDialog } from "./UpgradeContext";
import { useAtomValue } from "jotai";
import { isLicensedAtom } from "../utils/trafficAtoms";

interface FilterPresetContextState {
  predefinedFilters: PredefinedFilter[];
  showBuiltIn: boolean;
  visibleBuiltInIds: string[];
  addPreset: (name: string, filters: FilterNode[], description?: string) => Promise<string>;
  updatePreset: (id: string, updates: Partial<PredefinedFilter>) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
  setShowBuiltIn: (show: boolean) => void;
  setBuiltInVisibility: (id: string, visible: boolean) => void;
}

const FilterPresetContext = createContext<FilterPresetContextState | undefined>(undefined);

export const useFilterPresetContext = () => {
  const context = useContext(FilterPresetContext);
  if (context === undefined) {
    throw new Error("useFilterPresetContext must be used within a FilterPresetProvider");
  }
  return context;
};

const STANDARD_LIBRARY: PredefinedFilter[] = [
  { id: "all", name: "All Traffic", filters: [], isBuiltIn: true },
  {
    id: "sl-graphql",
    name: "GraphQL",
    description: "Matches common GraphQL endpoints and content types.",
    filters: [
      { isGroup: false, id: "sl-g-1", enabled: true, type: FilterTypes.URL, operator: FilterOperators.CONTAINS, value: "graphql" }
    ],
    isBuiltIn: true
  },
  {
    id: "sl-json",
    name: "JSON API",
    description: "Filters for JSON responses.",
    filters: [
      { isGroup: false, id: "sl-j-1", enabled: true, type: FilterTypes.URL, operator: FilterOperators.CONTAINS, value: ".json" },
      { isGroup: false, id: "sl-j-2", enabled: true, type: FilterTypes.METHOD, operator: FilterOperators.EQUALS, value: "POST" }
    ],
    isBuiltIn: true
  },
  {
    id: "sl-images",
    name: "Media & Images",
    description: "Filters for image assets (png, jpg, gif, webp, svg).",
    filters: [
      {
        isGroup: true, id: "sl-i-g", enabled: true, logic: "OR", children: [
          { isGroup: false, id: "sl-i-1", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".png" },
          { isGroup: false, id: "sl-i-2", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".jpg" },
          { isGroup: false, id: "sl-i-3", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".jpeg" },
          { isGroup: false, id: "sl-i-4", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".svg" },
          { isGroup: false, id: "sl-i-5", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".webp" }
        ]
      }
    ],
    isBuiltIn: true
  },
  {
    id: "sl-assets",
    name: "Scripts & Styles",
    description: "Static assets: JS and CSS files.",
    filters: [
      {
        isGroup: true, id: "sl-a-g", enabled: true, logic: "OR", children: [
          { isGroup: false, id: "sl-a-1", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".js" },
          { isGroup: false, id: "sl-a-2", enabled: true, type: FilterTypes.URL, operator: FilterOperators.ENDS_WITH, value: ".css" }
        ]
      }
    ],
    isBuiltIn: true
  },
  {
    id: "sl-errors",
    name: "4xx & 5xx Errors",
    description: "Captured failures and error status codes.",
    filters: [
      { isGroup: false, id: "sl-e-1", enabled: true, type: FilterTypes.STATUS, operator: FilterOperators.GREATER_THAN, value: "399" }
    ],
    isBuiltIn: true
  },
];

export const FilterPresetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userFilters, setUserFilters] = useState<PredefinedFilter[]>([]);
  const [showBuiltIn, setShowBuiltIn] = useState<boolean>(() => {
    return localStorage.getItem("filter-show-builtin") !== "false";
  });

  const [visibleBuiltInIds, setVisibleBuiltInIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("filter-visible-builtin");
      return saved ? JSON.parse(saved) : STANDARD_LIBRARY.map(f => f.id);
    } catch {
      return STANDARD_LIBRARY.map(f => f.id);
    }
  });

  const { getLimit } = useLicense();
  const { openUpgradeDialog } = useUpgradeDialog();
  const isLicensed = useAtomValue(isLicensedAtom);

  // Load from DB on mount
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const presets = await invoke<any[]>("get_filter_presets");
        const parsedPresets: PredefinedFilter[] = presets.map(p => ({
          ...p,
          filters: JSON.parse(p.filters),
          isBuiltIn: false
        }));
        console.log(`Loaded ${parsedPresets.length} filter presets from DB`);
        setUserFilters(parsedPresets);
      } catch (err) {
        console.error("Failed to load filter presets from DB", err);
      }
    };
    loadFromDb();
  }, []);

  useEffect(() => {
    localStorage.setItem("filter-show-builtin", String(showBuiltIn));
  }, [showBuiltIn]);

  useEffect(() => {
    localStorage.setItem("filter-visible-builtin", JSON.stringify(visibleBuiltInIds));
  }, [visibleBuiltInIds]);

  const predefinedFilters = useMemo(() => {
    const builtIn = showBuiltIn ? STANDARD_LIBRARY : STANDARD_LIBRARY.filter(f => f.id === "all");
    return [...builtIn, ...userFilters];
  }, [userFilters, showBuiltIn]);

  const setBuiltInVisibility = (id: string, visible: boolean) => {
    setVisibleBuiltInIds(prev => {
      if (visible) {
        return prev.includes(id) ? prev : [...prev, id];
      } else {
        return prev.filter(i => i !== id);
      }
    });
  };

  const addPreset = async (name: string, filters: FilterNode[], description?: string) => {
    if (!isLicensed) {
      try {
          const limit = await getLimit('max_filters');
          if (userFilters.length >= limit) {
            openUpgradeDialog();
            return "";
          }
      } catch (e) {
          console.error("Failed to check filter limit", e);
      }
    }

    const newId = `user-${Date.now()}`;
    const newPredefined: PredefinedFilter = {
      id: newId,
      name,
      description,
      filters: [...filters],
      isBuiltIn: false,
    };

    try {
      await invoke("add_filter_preset", {
        preset: {
          id: newId,
          name,
          description,
          filters: JSON.stringify(filters)
        }
      });

      setUserFilters(prev => [...prev, newPredefined]);
    } catch (err) {
      console.error("Failed to add filter preset to DB", err);
    }

    return newId;
  };

  const updatePreset = async (id: string, updates: Partial<PredefinedFilter>) => {
    try {
      await invoke("update_filter_preset", {
        id,
        name: updates.name !== undefined ? updates.name : null,
        description: updates.description !== undefined ? updates.description : null,
        filters: updates.filters ? JSON.stringify(updates.filters) : null
      });
      setUserFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    } catch (err) {
      console.error("Failed to update filter preset in DB", err);
    }
  };

  const removePreset = async (id: string) => {
    try {
      await invoke("delete_filter_preset", { id });
      setUserFilters(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error("Failed to delete filter preset from DB", err);
    }
  };

  return (
    <FilterPresetContext.Provider value={{
      predefinedFilters,
      showBuiltIn,
      visibleBuiltInIds,
      addPreset,
      updatePreset,
      removePreset,
      setShowBuiltIn,
      setBuiltInVisibility
    }}>
      {children}
    </FilterPresetContext.Provider>
  );
};
