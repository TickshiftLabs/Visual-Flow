import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import JsonFlowChart from "../Visualizers/JsonFlowChart";
import TreeView from "../Visualizers/TreeView";
import { countJsonNodes } from "@/constants/limits";
import { useJsonStore, type ViewMode } from "@/store/useJsonStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { SAMPLE_FILE_NAME, SAMPLE_JSON } from "@/constants/sampleJson";

// The 3D library is large, so it's only downloaded when the 3D view is opened.
const Graph3D = dynamic(() => import("../Visualizers/Graph3D"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center font-vf-mono text-xs text-vf-dim">
      loading 3D view…
    </div>
  ),
});

const VIEWS: Array<{ id: ViewMode; label: string }> = [
  { id: "graph", label: "Graph" },
  { id: "tree", label: "Tree" },
  { id: "3d", label: "3D" },
];

const emptyButton =
  "inline-flex h-[38px] cursor-pointer items-center rounded-[7px] px-4 text-sm font-semibold transition duration-150 hover:-translate-y-px";

export default function RightPanel() {
  const {
    visualizationJson,
    jsonData,
    setNodeCount,
    edgeType,
    showGrid,
    setJsonData,
    setVisualizationJson,
    setFileName,
    view,
    setView,
  } = useJsonStore();

  const { importFile } = useFileOperations({
    setJsonData,
    onSuccessfulLoad: setVisualizationJson,
  });

  const loadExample = () => {
    setJsonData(SAMPLE_JSON);
    setVisualizationJson(SAMPLE_JSON);
    setFileName(SAMPLE_FILE_NAME);
  };

  // Keep showing the last valid graph while the text is mid-edit and invalid;
  // only fall back to the empty screen when the editor is actually empty.
  const hasGraph = !!visualizationJson && jsonData.trim() !== "";

  // The graph reports its own node count; in other views nothing would,
  // so keep the status bar right from here.
  useEffect(() => {
    if (view === "graph" || !hasGraph) return;
    try {
      setNodeCount(countJsonNodes(JSON.parse(visualizationJson)));
    } catch {
      // keep the last count while the text is invalid
    }
  }, [view, hasGraph, visualizationJson, setNodeCount]);

  return (
    <div className="relative h-full min-w-0 flex-1 overflow-hidden bg-vf-bg2">
      {hasGraph && (
        <div
          role="tablist"
          aria-label="View"
          className="absolute left-3.5 top-3.5 z-10 flex gap-0.5 rounded-[9px] border border-vf-line bg-vf-panel/90 p-[3px] backdrop-blur"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={`cursor-pointer rounded-md px-[11px] py-1 font-vf-mono text-xs transition-colors ${
                view === v.id
                  ? "bg-vf-line text-vf-text"
                  : "text-vf-dim hover:text-vf-text"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {hasGraph ? (
        view === "tree" ? (
          <TreeView jsonData={visualizationJson} />
        ) : view === "3d" ? (
          <Graph3D jsonData={visualizationJson} />
        ) : (
          <JsonFlowChart
            jsonData={visualizationJson}
            onNodeCountChange={setNodeCount}
            edgeType={edgeType}
            showGrid={showGrid}
          />
        )
      ) : (
        <div className="grid h-full place-items-center bg-[radial-gradient(rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[length:22px_22px] px-6 text-center">
          <div>
            <span className="font-vf-mono text-xs text-vf-dim">
              JSON <span className="text-vf-acc">→</span> graph
            </span>
            <h3 className="mb-2 mt-3.5 text-[26px] font-semibold tracking-[-0.03em] text-vf-text">
              Nothing to draw yet.
            </h3>
            <p className="mx-auto mb-[22px] max-w-[34ch] text-[15px] text-vf-dim">
              Paste JSON into the editor on the left, or start from an example
              to see how it works.
            </p>
            <div className="flex justify-center gap-2.5">
              <button
                onClick={loadExample}
                className={`${emptyButton} bg-vf-acc text-vf-bg hover:brightness-110`}
              >
                Load an example
              </button>
              <button
                onClick={importFile}
                className={`${emptyButton} border border-vf-line text-vf-text hover:border-[#4a5058]`}
              >
                Open a file
              </button>
            </div>
            <div className="mt-[26px] font-vf-mono text-xs text-vf-dim">
              or drop a .json file anywhere on this page
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
