import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { buildGraph, type Graph, type GraphNode } from "./graph/buildGraph";
import { KIND_COLOR } from "./components/JsonNode";
import { layout3d } from "./three/layout3d";

const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };
const BACKGROUND = 0x0e1012;
const LINK_COLOR = 0x3f454d;
const ACCENT = 0xc8f169;
/** Above this many nodes, only the top levels are named until you select something. */
const LABEL_ALL_LIMIT = 40;
/** Never show more than this many search-match labels at once. */
const MAX_MATCH_LABELS = 60;

interface SceneState {
  renderer: THREE.WebGLRenderer;
  labels: CSS2DRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  group: THREE.Group | null;
  meshes: THREE.Mesh[];
  meshById: Map<string, THREE.Mesh>;
  labelById: Map<string, CSS2DObject>;
  route: THREE.LineSegments | null;
}

const matchesQuery = (node: GraphNode, query: string) =>
  node.label.toLowerCase().includes(query) ||
  node.rows.some(
    (r) =>
      r.key.toLowerCase().includes(query) ||
      r.display.toLowerCase().includes(query)
  );

interface Graph3DProps {
  jsonData: string;
}

/** 3D view: every node as a point in space, linked to its parent. Shows structure, not values. */
export default function Graph3D({ jsonData }: Graph3DProps) {
  const container = useRef<HTMLDivElement>(null);
  const state = useRef<SceneState | null>(null);

  const layoutKind = useJsonStore((s) => s.layout3d);
  const selectedId = useGraphStore((s) => s.selectedId);
  const query = useGraphStore((s) => s.query.trim().toLowerCase());

  const graph = useMemo(() => {
    try {
      return buildGraph(JSON.parse(jsonData));
    } catch {
      return EMPTY_GRAPH;
    }
  }, [jsonData]);

  // Latest graph for event handlers that are attached only once.
  const graphRef = useRef(graph);
  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  // --- one-time scene setup -------------------------------------------------
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(BACKGROUND);
    el.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.domElement.style.cssText =
      "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    el.appendChild(labels.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BACKGROUND, 900, 2600);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(300, 500, 400);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 0.9;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    // Spin until the person takes over.
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });

    state.current = {
      renderer,
      labels,
      scene,
      camera,
      controls,
      group: null,
      meshes: [],
      meshById: new Map(),
      labelById: new Map(),
      route: null,
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labels.setSize(w, h);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    // Click (not drag) selects the node under the pointer.
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const nodeAt = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(state.current?.meshes ?? [])[0];
      return hit ? (hit.object.userData.node as GraphNode) : null;
    };
    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const node = nodeAt(e);
      useGraphStore.getState().select(node ? node.id : null, node?.path);
    };
    const onMove = (e: PointerEvent) => {
      renderer.domElement.style.cursor = nodeAt(e) ? "pointer" : "grab";
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
    });

    if (process.env.NODE_ENV !== "production") {
      // Lets browser tests find where a node is drawn on screen.
      (window as any).__vf3d = {
        screenPosition(id: string) {
          const mesh = state.current?.meshById.get(id);
          if (!mesh) return null;
          const p = mesh.position.clone().project(camera);
          const rect = renderer.domElement.getBoundingClientRect();
          return {
            x: rect.left + ((p.x + 1) / 2) * rect.width,
            y: rect.top + ((1 - p.y) / 2) * rect.height,
          };
        },
        stopSpin() {
          controls.autoRotate = false;
        },
      };
    }

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      disposeGroup(state.current);
      renderer.dispose();
      el.replaceChildren();
      state.current = null;
      if (process.env.NODE_ENV !== "production") delete (window as any).__vf3d;
    };
  }, []);

  // --- rebuild when the document or layout changes --------------------------
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    disposeGroup(s);

    const group = new THREE.Group();
    s.group = group;
    s.scene.add(group);
    if (graph.nodes.length === 0) return;

    const positions = layout3d(graph, layoutKind);
    const indexOf = new Map(graph.nodes.map((n, i) => [n.id, i]));

    const linkPoints: number[] = [];
    for (const edge of graph.edges) {
      linkPoints.push(
        ...positions[indexOf.get(edge.source)!],
        ...positions[indexOf.get(edge.target)!]
      );
    }
    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linkPoints, 3)
    );
    group.add(
      new THREE.LineSegments(
        linkGeometry,
        new THREE.LineBasicMaterial({ color: LINK_COLOR })
      )
    );

    s.route = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: ACCENT })
    );
    group.add(s.route);

    const sphere = new THREE.SphereGeometry(1, 24, 16);
    graph.nodes.forEach((node, i) => {
      const color = new THREE.Color(KIND_COLOR[node.kind]);
      const mesh = new THREE.Mesh(
        sphere,
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.18,
          roughness: 0.45,
          metalness: 0.1,
          transparent: true,
        })
      );
      const radius =
        node.kind === "root" ? 13 : 6 + Math.min(node.rows.length, 8) * 0.7;
      mesh.userData = { node, radius };
      mesh.scale.setScalar(radius);
      mesh.position.fromArray(positions[i]);
      group.add(mesh);
      s.meshes.push(mesh);
      s.meshById.set(node.id, mesh);
    });

    // Frame the whole graph.
    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    const span = Math.max(box.getSize(new THREE.Vector3()).length(), 200);
    const distance = span * 1.05;
    s.controls.target.copy(centre);
    s.camera.position
      .copy(centre)
      .add(new THREE.Vector3(distance * 0.6, distance * 0.28, distance * 0.85));
    s.camera.far = distance * 12;
    s.camera.updateProjectionMatrix();
    (s.scene.fog as THREE.Fog).near = distance * 1.5;
    (s.scene.fog as THREE.Fog).far = distance * 4;

    applyHighlight(s, graph, useGraphStore.getState().selectedId, query);
    // `query` is applied by the effect below; rebuilding for it would reset the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, layoutKind]);

  // --- restyle when selection or search changes -----------------------------
  useEffect(() => {
    if (state.current) applyHighlight(state.current, graph, selectedId, query);
  }, [graph, selectedId, query, layoutKind]);

  return (
    <div
      ref={container}
      className="vf-3d relative h-full w-full overflow-hidden"
      data-nodes={graph.nodes.length}
      data-layout={layoutKind}
    />
  );
}

function disposeGroup(s: SceneState | null) {
  if (!s?.group) return;
  s.labelById.forEach((label) => {
    label.removeFromParent();
    label.element.remove();
  });
  s.labelById.clear();
  const geometries = new Set<THREE.BufferGeometry>();
  s.group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    const material = mesh.material as THREE.Material | undefined;
    material?.dispose();
  });
  geometries.forEach((g) => g.dispose());
  s.scene.remove(s.group);
  s.group = null;
  s.meshes = [];
  s.meshById.clear();
  s.route = null;
}

/** Brightens the selection and its route, dims the rest, and decides which nodes get a name. */
function applyHighlight(
  s: SceneState,
  graph: Graph,
  selectedId: string | null,
  query: string
) {
  if (!s.group) return;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const selected = selectedId ? byId.get(selectedId) : undefined;

  const route = new Set<string>();
  for (let n = selected; n; n = n.parentId ? byId.get(n.parentId) : undefined) {
    route.add(n.id);
  }

  const searching = query !== "";
  const named = new Map<string, "normal" | "selected" | "dim">();
  let matchLabels = 0;
  const routePoints: number[] = [];

  for (const node of graph.nodes) {
    const mesh = s.meshById.get(node.id);
    if (!mesh) continue;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const isSelected = node === selected;
    const onRoute = route.has(node.id);
    const isChild = !!selected && node.parentId === selected.id;
    const isMatch = searching && matchesQuery(node, query);

    const focused = searching
      ? isMatch || onRoute
      : !selected || onRoute || isChild;
    material.opacity = focused ? 1 : 0.28;
    material.emissiveIntensity = isSelected ? 0.9 : onRoute || isMatch ? 0.5 : 0.18;
    mesh.scale.setScalar(mesh.userData.radius * (isSelected ? 1.35 : 1));

    if (onRoute && node.parentId) {
      const parent = s.meshById.get(node.parentId);
      if (parent) {
        routePoints.push(...parent.position.toArray(), ...mesh.position.toArray());
      }
    }

    // Which nodes are named: everything on small graphs; otherwise the top
    // levels, the selection's route and children, and search matches.
    const depth = node.path.length;
    const small = graph.nodes.length <= LABEL_ALL_LIMIT;
    let show = isSelected || onRoute || isChild;
    if (!show && isMatch && matchLabels < MAX_MATCH_LABELS) {
      show = true;
      matchLabels++;
    }
    if (!show && !searching && (small || depth <= 1)) show = true;
    if (show) named.set(node.id, isSelected ? "selected" : focused ? "normal" : "dim");
  }

  if (s.route) {
    s.route.geometry.dispose();
    s.route.geometry = new THREE.BufferGeometry();
    s.route.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(routePoints, 3)
    );
  }

  // Labels are DOM elements, so only keep the ones that are shown.
  s.labelById.forEach((label, id) => {
    if (!named.has(id)) {
      label.removeFromParent();
      label.element.remove();
      s.labelById.delete(id);
    }
  });
  named.forEach((tone, id) => {
    let label = s.labelById.get(id);
    if (!label) {
      const element = document.createElement("div");
      element.textContent = byId.get(id)!.label;
      label = new CSS2DObject(element);
      label.position.copy(s.meshById.get(id)!.position);
      // Sit the tag above its sphere (CSS2DRenderer owns the element's transform).
      label.center.set(0.5, 1.9);
      s.group!.add(label);
      s.labelById.set(id, label);
    }
    label.element.className = `vf-3d-label vf-3d-label-${tone}`;
  });
}
