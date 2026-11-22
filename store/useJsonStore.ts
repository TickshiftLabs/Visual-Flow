import { create } from 'zustand';
import { storageService } from '../utils/storageService';

export type ViewMode = 'graph' | 'tree' | '3d';
/** Which way the 2D graph grows: left-to-right or top-to-bottom. */
export type GraphDirection = 'LR' | 'TB';
export type Layout3d = 'constellation' | 'cone';

interface JsonState {
  // JSON data
  jsonData: string;
  fileName: string;
  visualizationJson: string;
  isValidJson: boolean;
  
  // UI state
  nodeCount: number;
  collapseLeftPanel: boolean;
  edgeType: string;
  showGrid: boolean;
  /** Which visualisation fills the right-hand panel. */
  view: ViewMode;
  graphDirection: GraphDirection;
  layout3d: Layout3d;
  /** Soft drop shadow under each node card in the graph view. */
  nodeShadows: boolean;
  isSettingsOpen: boolean;
  
  // Processing states
  isLoading: boolean;
  
  // Actions
  setJsonData: (data: string) => void;
  setFileName: (name: string) => void;
  setVisualizationJson: (data: string) => void;
  setIsValidJson: (isValid: boolean) => void;
  setNodeCount: (count: number) => void;
  toggleLeftPanel: () => void;
  setEdgeType: (type: string) => void;
  setShowGrid: (show: boolean) => void;
  setView: (view: ViewMode) => void;
  setGraphDirection: (direction: GraphDirection) => void;
  setLayout3d: (layout: Layout3d) => void;
  setNodeShadows: (on: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  applyChangesToVisualization: () => void;
}

export const useJsonStore = create<JsonState>((set, get) => ({
  // Initial state
  jsonData: '',
  fileName: 'untitled.json',
  visualizationJson: '',
  isValidJson: true,
  nodeCount: 0,
  collapseLeftPanel: false,
  edgeType: 'default',
  showGrid: true,
  view: 'graph',
  graphDirection: 'LR',
  layout3d: 'constellation',
  nodeShadows: true,
  isSettingsOpen: false,
  isLoading: false,
  
  // Actions
  setJsonData: (data) => set({ jsonData: data }),
  setFileName: (name) => set({ fileName: name }),
  setVisualizationJson: (data) => set({ visualizationJson: data }),
  setIsValidJson: (isValid) => set({ isValidJson: isValid }),
  setNodeCount: (count) => set({ nodeCount: count }),
  toggleLeftPanel: () => set((state) => ({ collapseLeftPanel: !state.collapseLeftPanel })),
  setEdgeType: (type) => {
    set({ edgeType: type });
    storageService.saveSettings({ edgeStyle: type });
  },
  setShowGrid: (show) => {
    set({ showGrid: show });
    storageService.saveSettings({ showGrid: show });
  },
  setView: (view) => {
    set({ view });
    storageService.saveSettings({ view });
  },
  setGraphDirection: (graphDirection) => {
    set({ graphDirection });
    storageService.saveSettings({ graphDirection });
  },
  setLayout3d: (layout3d) => {
    set({ layout3d });
    storageService.saveSettings({ layout3d });
  },
  setNodeShadows: (nodeShadows) => {
    set({ nodeShadows });
    storageService.saveSettings({ nodeShadows });
  },
  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setIsLoading: (isLoading) => set({ isLoading: isLoading }),
  
  // Complex actions
  applyChangesToVisualization: () => {
    const { jsonData, isValidJson } = get();
    if (isValidJson && jsonData.trim()) {
      set({ visualizationJson: jsonData });
    }
  },
  
  // If you need to add a setter for this property:
}));