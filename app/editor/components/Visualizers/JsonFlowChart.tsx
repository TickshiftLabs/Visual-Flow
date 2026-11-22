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
  type NodeKind,
} from "./graph/buildGraph";
import { layoutGraph, nodeHeight, NODE_WIDTH } from "./graph/graphLayout";
import { collapseKey, useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { NARROW_QUERY } from "@/hooks/useIsNarrow";

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
  /**
   * For showing the graph inside another page (the landing page): no zoom
   * buttons or legend, and the mouse wheel scrolls the page instead of zooming.
   */
  embedded?: boolean;
}

/** Legend entries, each covering the node kinds drawn in that colour. */
const LEGEND: Array<{ label: string; color: string; kinds: NodeKind[] }> = [
  { label: "root", color: KIND_COLOR.root, kinds: ["root"] },
  { label: "object", color: KIND_COLOR.object, kinds: ["object"] },
  { label: "array", color: KIND_COLOR.array, kinds: ["array", "item"] },
  { label: "value", color: KIND_COLOR.value, kinds: ["value"] },
];

const panelClass =
  "rounded-[9px] border border-vf-line bg-vf-panel/90 font-vf-mono text-xs text-vf-dim backdrop-blur";

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const button =
    "grid h-[30px] w-8 cursor-pointer place-items-center border-r border-vf-rule text-vf-soft transition-colors hover:bg-white/[0.05] hover:text-vf-text";

  // Hidden on phones, where pinching zooms and space is short.
  return (
    <Panel
      position="bottom-left"
      className={`${panelClass} flex overflow-hidden max-md:hidden`}
    >
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
  embedded = false,
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

  // The legend lists only the kinds of node currently on the canvas, so it
  // never explains a colour that isn't there (folded-away nodes don't count).
  const legendItems = useMemo(() => {
    const present = new Set<NodeKind>();
    for (const node of graph.nodes) {
      if (!hidden.has(node.id)) present.add(node.kind);
    }
    return LEGEND.filter((item) => item.kinds.some((kind) => present.has(kind)));
  }, [graph, hidden]);

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
    if (!allVisible) return;
    // Re-frame with the same sums as the first framing, so opening and
    // closing the inspector returns to exactly the view you started with.
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const node of nodeLookup.values()) {
      if (node.hidden) continue;
      left = Math.min(left, node.position.x);
      top = Math.min(top, node.position.y);
      right = Math.max(right, node.position.x + (node.measured.width ?? NODE_WIDTH));
      bottom = Math.max(bottom, node.position.y + (node.measured.height ?? 0));
    }
    if (!Number.isFinite(left)) return;
    const room = 1 - FIT_OPTIONS.padding * 2;
    const fitted = Math.min(
      (width * room) / (right - left || 1),
      (height * room) / (bottom - top || 1),
      FIT_OPTIONS.maxZoom
    );
    setViewport(
      {
        x: (width - (right - left) * fitted) / 2 - left * fitted,
        y: (height - (bottom - top) * fitted) / 2 - top * fitted,
        zoom: fitted,
      },
      { duration: FIT_OPTIONS.duration }
    );
  }, [width, store, setViewport]);

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
      // On phones the inspector is a sheet over the bottom of the canvas
      // (up to 58% of it), so only the area above it counts as visible.
      const usable = window.matchMedia(NARROW_QUERY).matches ? h * 0.42 : h;
      let dx = 0;
      let dy = 0;
      if (left < margin) dx = margin - left;
      else if (left + nodeW > w - margin) dx = w - margin - (left + nodeW);
      if (top < margin) dy = margin - top;
      else if (top + nodeH > usable - margin) {
        // Tall nodes can't fit above the sheet; show their top instead.
        dy = Math.max(usable - margin - (top + nodeH), margin - top);
      }
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
      zoomOnScroll={!embedded}
      preventScrolling={!embedded}
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

      {!embedded && (
        <Panel
          position="bottom-right"
          className={`${panelClass} flex gap-3.5 px-3 py-[7px] max-md:hidden`}
        >
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span
                className="block size-2 rounded-[2px]"
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </Panel>
      )}

      {!embedded && <ZoomControls />}
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
