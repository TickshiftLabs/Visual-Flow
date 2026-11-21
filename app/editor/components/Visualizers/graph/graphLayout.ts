// Named graphLayout (not layout) because Next treats any app/**/layout.ts as a route layout.
import dagre from "@dagrejs/dagre";
import type { Graph, GraphNode } from "./buildGraph";

export const NODE_WIDTH = 240;
export const HEADER_HEIGHT = 30;
export const ROW_HEIGHT = 24;

/** Height of a node card: header plus one line per row, plus the 2px border. */
export const nodeHeight = (node: GraphNode) =>
  HEADER_HEIGHT + node.rows.length * ROW_HEIGHT + 2;

export interface Position {
  x: number;
  y: number;
}

export type Direction = "LR" | "TB";

/**
 * Tree layout, growing left-to-right or top-to-bottom. Returns the top-left
 * corner of every node.
 */
export function layoutGraph(
  graph: Graph,
  direction: Direction = "LR"
): Map<string, Position> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 28,
    ranksep: direction === "LR" ? 90 : 70,
    marginx: 0,
    marginy: 0,
  });

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: nodeHeight(node) });
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions = new Map<string, Position>();
  for (const node of graph.nodes) {
    const laid = g.node(node.id);
    // dagre positions by centre; React Flow by top-left.
    positions.set(node.id, {
      x: laid.x - NODE_WIDTH / 2,
      y: laid.y - nodeHeight(node) / 2,
    });
  }
  return positions;
}
