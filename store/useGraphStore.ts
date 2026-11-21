import { create } from "zustand";
import type { JsonPath } from "@/app/editor/components/Visualizers/graph/buildGraph";

/** UI state for the graph view: what's selected, searched for, and folded away. */
interface GraphState {
  selectedId: string | null;
  /** Where the selected node's value lives in the JSON; null when nothing is selected. */
  selectedPath: JsonPath | null;
  query: string;
  /** Keys of collapsed rows, as `${nodeId}#${rowIndex}`. */
  collapsed: Set<string>;

  select: (id: string | null, path?: JsonPath | null) => void;
  setQuery: (query: string) => void;
  toggleCollapsed: (nodeId: string, rowIndex: number) => void;
  /** Clears selection and folds; call when a different document is loaded. */
  reset: () => void;
}

export const collapseKey = (nodeId: string, rowIndex: number) =>
  `${nodeId}#${rowIndex}`;

export const useGraphStore = create<GraphState>((set) => ({
  selectedId: null,
  selectedPath: null,
  query: "",
  collapsed: new Set(),

  select: (id, path = null) =>
    set({ selectedId: id, selectedPath: id === null ? null : path }),
  setQuery: (query) => set({ query }),
  toggleCollapsed: (nodeId, rowIndex) =>
    set((state) => {
      const key = collapseKey(nodeId, rowIndex);
      const collapsed = new Set(state.collapsed);
      if (!collapsed.delete(key)) collapsed.add(key);
      return { collapsed };
    }),
  reset: () =>
    set({ selectedId: null, selectedPath: null, collapsed: new Set() }),
}));
