import type { Graph } from "../graph/buildGraph";

/** A point in 3D space as [x, y, z]. */
export type Vec3 = [number, number, number];

export type Layout3dKind = "constellation" | "cone";

/** Vertical distance between levels of the cone tree. */
const LEVEL_GAP = 110;
/** Breathing room around each child's own ring. */
const RING_PAD = 26;
const MIN_RING = 70;
/** Preferred length of a link in the constellation. */
const LINK_LENGTH = 95;

interface TreeNode {
  index: number;
  depth: number;
  children: TreeNode[];
}

/** Rebuilds parent/child links from the flat graph; nodes[0] is the root. */
function toTree(graph: Graph): TreeNode[] {
  const byId = new Map(graph.nodes.map((n, i) => [n.id, i]));
  const tree: TreeNode[] = graph.nodes.map((_, index) => ({
    index,
    depth: 0,
    children: [],
  }));
  graph.nodes.forEach((node, i) => {
    const parent = node.parentId === null ? undefined : byId.get(node.parentId);
    if (parent !== undefined) tree[parent].children.push(tree[i]);
  });
  const stack = tree.length ? [tree[0]] : [];
  while (stack.length) {
    const node = stack.pop()!;
    for (const child of node.children) {
      child.depth = node.depth + 1;
      stack.push(child);
    }
  }
  return tree;
}

/**
 * Cone tree: the root on top, each node's children on a ring beneath it. A
 * ring is as wide as it needs to be to fit its children's own rings.
 */
export function coneLayout(graph: Graph): Vec3[] {
  const tree = toTree(graph);
  const positions: Vec3[] = tree.map(() => [0, 0, 0]);
  if (!tree.length) return positions;

  const radius = new Float64Array(tree.length);
  // Children before parents: nodes are in depth-first order, so walk backwards.
  for (let i = tree.length - 1; i >= 0; i--) {
    const { children } = tree[i];
    if (children.length === 0) radius[i] = 0;
    else if (children.length === 1) radius[i] = radius[children[0].index];
    else {
      const circumference = children.reduce(
        (sum, c) => sum + 2 * (radius[c.index] + RING_PAD),
        0
      );
      radius[i] = Math.max(circumference / (2 * Math.PI), MIN_RING);
    }
  }

  const stack: TreeNode[] = [tree[0]];
  while (stack.length) {
    const node = stack.pop()!;
    const [x, y, z] = positions[node.index];
    const { children } = node;
    const ring = children.length === 1 ? 0 : radius[node.index];
    const total =
      children.reduce((sum, c) => sum + radius[c.index] + RING_PAD, 0) || 1;
    let angle = 0;
    for (const child of children) {
      const share = ((radius[child.index] + RING_PAD) / total) * Math.PI * 2;
      const a = angle + share / 2;
      angle += share;
      positions[child.index] = [
        x + Math.cos(a) * ring,
        y - LEVEL_GAP,
        z + Math.sin(a) * ring,
      ];
      stack.push(child);
    }
  }

  // Centre vertically so the camera can orbit the middle of the tree.
  const maxDepth = tree.reduce((max, n) => Math.max(max, n.depth), 0);
  const lift = (maxDepth * LEVEL_GAP) / 2;
  for (const p of positions) p[1] += lift;
  return positions;
}

/**
 * Constellation: a small force simulation. Every node pushes the others away,
 * links pull connected nodes together, and a faint pull keeps it centred.
 * Deterministic, so the same document always looks the same.
 */
export function constellationLayout(graph: Graph): Vec3[] {
  const tree = toTree(graph);
  const n = tree.length;
  if (n === 0) return [];

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  tree.forEach((node, i) => {
    const r = 40 + node.depth * 60;
    x[i] = Math.sin(i * 2.4) * r;
    y[i] = Math.cos(i * 1.7) * r;
    z[i] = Math.sin(i * 0.9 + 1) * r;
  });

  const links: Array<[number, number]> = [];
  for (const node of tree) {
    for (const child of node.children) links.push([node.index, child.index]);
  }

  // Repulsion is O(n²) per step, so big documents get fewer steps.
  const steps = Math.max(24, Math.min(320, Math.floor(4e7 / (n * n))));
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const fz = new Float64Array(n);

  for (let step = 0; step < steps; step++) {
    fx.fill(0);
    fy.fill(0);
    fz.fill(0);

    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dx = x[a] - x[b];
        const dy = y[a] - y[b];
        const dz = z[a] - z[b];
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1);
        const push = 9000 / (dist * dist * dist);
        fx[a] += dx * push;
        fy[a] += dy * push;
        fz[a] += dz * push;
        fx[b] -= dx * push;
        fy[b] -= dy * push;
        fz[b] -= dz * push;
      }
    }

    for (const [a, b] of links) {
      const dx = x[a] - x[b];
      const dy = y[a] - y[b];
      const dz = z[a] - z[b];
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 1);
      const pull = ((dist - LINK_LENGTH) * 0.035) / dist;
      fx[a] -= dx * pull;
      fy[a] -= dy * pull;
      fz[a] -= dz * pull;
      fx[b] += dx * pull;
      fy[b] += dy * pull;
      fz[b] += dz * pull;
    }

    const cool = 1 - step / (steps + 20);
    for (let i = 0; i < n; i++) {
      fx[i] -= x[i] * 0.004;
      fy[i] -= y[i] * 0.004;
      fz[i] -= z[i] * 0.004;
      // Cap the step so a near-collision can't fling a node away.
      const len = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i] + fz[i] * fz[i]);
      const scale = (len > 18 ? 18 / len : 1) * cool;
      x[i] += fx[i] * scale;
      y[i] += fy[i] * scale;
      z[i] += fz[i] * scale;
    }
  }

  return tree.map((_, i) => [x[i], y[i], z[i]]);
}

export function layout3d(graph: Graph, kind: Layout3dKind): Vec3[] {
  return kind === "cone" ? coneLayout(graph) : constellationLayout(graph);
}
