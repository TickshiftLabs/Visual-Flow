import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useStore,
  useStoreApi,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import JsonNode, { KIND_COLOR } from "./components/JsonNode";
import {
  buildGraph,
  descendantsOf,
  getAtPath,
  pathToId,
  ROOT_ID,
  type Graph,
  type GraphNode,
} from "./graph/buildGraph";
import { layoutGraph, nodeHeight, NODE_WIDTH } from "./graph/graphLayout";
import { collapseKey, useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";

const nodeTypes = { json: JsonNode };
const proOptions = { hideAttribution: true };
const FIT_OPTIONS = { padding: 0.12, maxZoom: 1, duration: 250 };
const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };
/** Below this zoom node text is too small to read, so we don't auto-fit. */
const MIN_READABLE_ZOOM = 0.45;
const START_ZOOM = 0.8;
const EDGE = "#343940";
const EDGE_ON = "#c8f169";

interface JsonFlowChartProps {
  jsonData: string;
  edgeType: string;
  showGrid?: boolean;
  onNodeCountChange?: (count: number) => void;
}

const legend: Array<{ label: string; color: string }> = [
  { label: "root", color: KIND_COLOR.root },
  { label: "object", color: KIND_COLOR.object },
  { label: "array", color: KIND_COLOR.array },
  { label: "value", color: KIND_COLOR.value },
];

const panelClass =
  "rounded-[9px] border border-vf-line bg-vf-panel/90 font-vf-mono text-xs text-vf-dim backdrop-blur";

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const button =
    "grid h-[30px] w-8 cursor-pointer place-items-center border-r border-vf-rule text-vf-soft transition-colors hover:bg-white/[0.05] hover:text-vf-text";

  return (
    <Panel position="bottom-left" className={`${panelClass} flex overflow-hidden`}>
      <button className={button} onClick={() => zoomOut()} title="Zoom out">
        −
      </button>
      <button className={button} onClick={() => zoomIn()} title="Zoom in">
        +
      </button>
      <button
        className={button}
        onClick={() => fitView(FIT_OPTIONS)}
        title="Fit to screen"
      >
        ⤢
      </button>
      <span className="grid place-items-center px-2.5 text-[11.5px]">
        {Math.round(zoom * 100)}%
      </span>
    </Panel>
  );
}

function Chart({
  jsonData,
  edgeType,
  showGrid = true,
  onNodeCountChange,
}: JsonFlowChartProps) {
  const { fitView, setViewport } = useReactFlow();
  const store = useStoreApi();
  const selectedId = useGraphStore((s) => s.selectedId);
  const collapsed = useGraphStore((s) => s.collapsed);
  const select = useGraphStore((s) => s.select);
  const reset = useGraphStore((s) => s.reset);

  // Graph + layout only change when the document does.
  const { graph, value } = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(jsonData);
      return { graph: buildGraph(parsed), value: parsed };
    } catch {
      return { graph: EMPTY_GRAPH, value: undefined };
    }
  }, [jsonData]);

  const direction = useJsonStore((s) => s.graphDirection);
  const positions = useMemo(
    () => layoutGraph(graph, direction),
    [graph, direction]
  );

  // Everything below a collapsed row is hidden.
  const hidden = useMemo(() => {
    const roots: string[] = [];
    for (const node of graph.nodes) {
      node.rows.forEach((row, i) => {
        if (collapsed.has(collapseKey(node.id, i))) roots.push(...row.children);
      });
    }
    const set = descendantsOf(graph, roots);
    roots.forEach((id) => set.add(id));
    return set;
  }, [graph, collapsed]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);

  // New document: rebuild nodes at their laid-out positions and re-fit.
  useEffect(() => {
    setNodes(
      graph.nodes.map((node) => ({
        id: node.id,
        type: "json",
        position: positions.get(node.id)!,
        width: NODE_WIDTH,
        height: nodeHeight(node),
        data: node as unknown as Record<string, unknown>,
      }))
    );
    onNodeCountChange?.(graph.nodes.length);
  }, [graph, positions, setNodes, onNodeCountChange]);

  // Frame each new layout once, as soon as the canvas has a size. (Waiting a
  // fixed delay instead was a guess that could miss on a slow load.)
  // Small graphs are fitted whole. For big ones that would shrink the nodes
  // past reading size, so start on the root at a readable zoom.
  const canvasReady = useStore((s) => s.width > 0 && s.height > 0);
  const framedLayout = useRef<typeof positions | null>(null);
  useEffect(() => {
    if (!canvasReady || framedLayout.current === positions) return;
    const frame = requestAnimationFrame(() => {
      // Marked here, not above, so a cancelled frame is retried.
      framedLayout.current = positions;
      const { width, height } = store.getState();
      let right = 0;
      let bottom = 0;
      for (const node of graph.nodes) {
        const p = positions.get(node.id)!;
        right = Math.max(right, p.x + NODE_WIDTH);
        bottom = Math.max(bottom, p.y + nodeHeight(node));
      }
      const fitZoom = Math.min(width / (right || 1), height / (bottom || 1));
      if (fitZoom >= MIN_READABLE_ZOOM) {
        // Frame the layout from its known size rather than calling fitView:
        // fitView measures whatever nodes React Flow has at that instant, and
        // right after a re-layout those can still be the old positions.
        const room = 1 - FIT_OPTIONS.padding * 2;
        const zoom = Math.min(
          (width * room) / (right || 1),
          (height * room) / (bottom || 1),
          FIT_OPTIONS.maxZoom
        );
        setViewport(
          {
            x: (width - right * zoom) / 2,
            y: (height - bottom * zoom) / 2,
            zoom,
          },
          { duration: FIT_OPTIONS.duration }
        );
      } else {
        const root = positions.get(ROOT_ID);
        const rootNode = graph.nodes[0];
        if (!root || !rootNode) return;
        // Root at the left edge (left-to-right) or the top (top-to-bottom).
        const rootCentreX = root.x + NODE_WIDTH / 2;
        const rootCentreY = root.y + nodeHeight(rootNode) / 2;
        setViewport(
          direction === "LR"
            ? {
                x: 48 - root.x * START_ZOOM,
                y: height / 2 - rootCentreY * START_ZOOM,
                zoom: START_ZOOM,
              }
            : {
                x: width / 2 - rootCentreX * START_ZOOM,
                y: 64 - root.y * START_ZOOM,
                zoom: START_ZOOM,
              },
          { duration: 250 }
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [canvasReady, graph, positions, direction, setViewport, store]);

  // Collapse changes only flip visibility; dragged positions are kept.
  useEffect(() => {
    setNodes((current) =>
      current.map((n) =>
        n.hidden === hidden.has(n.id) ? n : { ...n, hidden: hidden.has(n.id) }
      )
    );
  }, [hidden, setNodes]);

  // Drop selection/folds that no longer exist in the new document.
  useEffect(() => {
    const { selectedPath: current, collapsed: folds } = useGraphStore.getState();
    const ids = new Set(graph.nodes.map((n) => n.id));
    // A selected single value (picked in the Tree view) has no node of its
    // own, so judge by whether its path still exists, not by node ids.
    const staleSelection =
      current !== null && getAtPath(value, current) === undefined;
    const staleFolds = [...folds].some((k) => !ids.has(k.slice(0, k.lastIndexOf("#"))));
    if (staleSelection || staleFolds) reset();
  }, [graph, value, reset]);

  // The node the selection belongs to: itself, or for a single value picked in
  // the Tree view, the nearest node above it.
  const selectedPath = useGraphStore((s) => s.selectedPath);
  const anchorId = useMemo(() => {
    if (!selectedPath) return null;
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (let length = selectedPath.length; length >= 0; length--) {
      const id = pathToId(selectedPath.slice(0, length));
      if (ids.has(id)) return id;
    }
    return null;
  }, [graph, selectedPath]);

  // When the canvas changes width (the inspector opening or closing): if the
  // whole graph was in view, keep it that way; otherwise leave the view alone.
  const width = useStore((s) => s.width);
  const previousWidth = useRef(0);
  useEffect(() => {
    const before = previousWidth.current;
    previousWidth.current = width;
    if (!before || !width || before === width) return;
    const { transform, height, nodeLookup } = store.getState();
    const [tx, ty, zoom] = transform;
    let allVisible = nodeLookup.size > 0;
    for (const node of nodeLookup.values()) {
      if (node.hidden) continue;
      const left = node.position.x * zoom + tx;
      const top = node.position.y * zoom + ty;
      const right = left + (node.measured.width ?? NODE_WIDTH) * zoom;
      const bottom = top + (node.measured.height ?? 0) * zoom;
      if (left < 0 || top < 0 || right > before || bottom > height) {
        allVisible = false;
        break;
      }
    }
    if (allVisible) fitView(FIT_OPTIONS);
  }, [width, store, fitView]);

  // Keep the selected node on screen (it may have been picked in another
  // view, or be behind where the inspector just opened).
  useEffect(() => {
    if (!anchorId) return;
    const timer = setTimeout(() => {
      const { transform, width: w, height: h, nodeLookup } = store.getState();
      const node = nodeLookup.get(anchorId);
      if (!node || node.hidden) return;
      const [tx, ty, zoom] = transform;
      const nodeW = (node.measured.width ?? NODE_WIDTH) * zoom;
      const nodeH = (node.measured.height ?? 0) * zoom;
      const left = node.position.x * zoom + tx;
      const top = node.position.y * zoom + ty;
      const margin = 24;
      let dx = 0;
      let dy = 0;
      if (left < margin) dx = margin - left;
      else if (left + nodeW > w - margin) dx = w - margin - (left + nodeW);
      if (top < margin) dy = margin - top;
      else if (top + nodeH > h - margin) dy = h - margin - (top + nodeH);
      if (dx || dy) {
        setViewport({ x: tx + dx, y: ty + dy, zoom }, { duration: 200 });
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [anchorId, width, store, setViewport]);

  // Edges on the route from the root to the selected node are highlighted.
  const edges = useMemo<Edge[]>(() => {
    const route = new Set<string>();
    const parentOf = new Map(graph.nodes.map((n) => [n.id, n.parentId]));
    for (let id = anchorId; id; id = parentOf.get(id) ?? null) route.add(id);

    // Stroke is set inline (not only via CSS) so image export captures it.
    return graph.edges.map((e) => ({
      style: {
        stroke: route.has(e.target) ? EDGE_ON : EDGE,
        strokeWidth: 1.5,
      },
      id: e.id,
      source: e.source,
      target: e.target,
      // Left-to-right edges leave from the row; top-to-bottom from the node's base.
      sourceHandle: direction === "LR" ? `row-${e.sourceRow}` : "bottom",
      targetHandle: direction === "LR" ? "left" : "top",
      type: edgeType,
      hidden: hidden.has(e.target),
      className: route.has(e.target) ? "vf-edge-on" : undefined,
      zIndex: route.has(e.target) ? 1 : 0,
      selectable: false,
      focusable: false,
    }));
  }, [graph, edgeType, hidden, anchorId, direction]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) =>
        select(node.id, (node.data as unknown as GraphNode).path)
      }
      onPaneClick={() => select(null)}
      onInit={(instance) => {
        // The export handlers look for this to fit the graph before capture.
        (window as any).reactFlowInstance = instance;
      }}
      proOptions={proOptions}
      nodesConnectable={false}
      minZoom={0.05}
      maxZoom={2}
      onlyRenderVisibleElements
      className="vf-flow"
    >
      {showGrid && (
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="rgba(255,255,255,0.09)"
        />
      )}

      <Panel
        position="bottom-right"
        className={`${panelClass} flex gap-3.5 px-3 py-[7px]`}
      >
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="block size-2 rounded-[2px]"
              style={{ background: item.color }}
            />
            {item.label}
          </span>
        ))}
      </Panel>

      <ZoomControls />
    </ReactFlow>
  );
}

export default function JsonFlowChart(props: JsonFlowChartProps) {
  return (
    <ReactFlowProvider>
      <Chart {...props} />
    </ReactFlowProvider>
  );
}
