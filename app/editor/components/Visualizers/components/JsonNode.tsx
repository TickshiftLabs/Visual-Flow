import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { collapseKey, useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import type { GraphNode, NodeKind, ValueKind } from "../graph/buildGraph";
import { HEADER_HEIGHT, NODE_WIDTH, ROW_HEIGHT } from "../graph/graphLayout";

export const KIND_COLOR: Record<NodeKind, string> = {
  root: "#c8f169",
  object: "#8ab4ff",
  array: "#f5b56b",
  item: "#f5b56b",
  value: "#7fd6a4",
};

const VALUE_COLOR: Record<ValueKind, string> = {
  string: "#e6c08a",
  number: "#8ab4ff",
  boolean: "#f29a9a",
  null: "#8b919a",
  object: "#555b64",
  array: "#555b64",
};

const hiddenHandle = {
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  background: "transparent",
} as const;

const matches = (text: string, q: string) => text.toLowerCase().includes(q);

function JsonNode({ data }: NodeProps) {
  const node = data as unknown as GraphNode;

  const isSelected = useGraphStore((s) => s.selectedId === node.id);
  const query = useGraphStore((s) => s.query.trim().toLowerCase());
  const collapsed = useGraphStore((s) => s.collapsed);
  const toggleCollapsed = useGraphStore((s) => s.toggleCollapsed);
  const vertical = useJsonStore((s) => s.graphDirection === "TB");
  const shadows = useJsonStore((s) => s.nodeShadows);

  const labelHit = query !== "" && matches(node.label, query);
  const rowHits = node.rows.map(
    (r) => query !== "" && (matches(r.key, query) || matches(r.display, query))
  );
  const dimmed = query !== "" && !labelHit && !rowHits.some(Boolean);

  return (
    <div
      // Shadow, glow and transitions live in graph.css (.vf-node…).
      className={`vf-node rounded-[9px] border bg-vf-panel font-vf-mono text-xs ${
        shadows ? "vf-node-shadow" : ""
      } ${
        isSelected
          ? "vf-node-selected border-vf-acc"
          : "border-vf-line hover:border-[#3a3f46]"
      } ${dimmed ? "opacity-25" : ""}`}
      style={{ width: NODE_WIDTH }}
    >
      {/* Both sets of attachment points are always present; the edges pick
          the pair for the current direction. Mounting them only when needed
          left React Flow with stale measurements after a direction change,
          and a line could go missing. */}
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        style={{ ...hiddenHandle, top: HEADER_HEIGHT / 2 }}
        isConnectable={false}
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        style={hiddenHandle}
        isConnectable={false}
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        style={hiddenHandle}
        isConnectable={false}
      />

      <div
        className={`flex items-center gap-2 border-b border-vf-rule px-2.5 text-vf-text ${
          labelHit ? "bg-vf-acc/10" : ""
        }`}
        style={{ height: HEADER_HEIGHT }}
      >
        <span
          className="block size-2 shrink-0 rounded-[2px]"
          style={{ background: KIND_COLOR[node.kind] }}
        />
        <span className="truncate" title={node.label}>
          {node.label}
        </span>
        <span className="ml-auto shrink-0 text-[11px] text-vf-faint">
          {node.shape === "array"
            ? `[${node.rows.length}]`
            : node.shape === "object"
            ? `{${node.rows.length}}`
            : ""}
        </span>
      </div>

      {node.rows.map((row, i) => {
        const hasChildren = row.children.length > 0;
        const isCollapsed =
          hasChildren && collapsed.has(collapseKey(node.id, i));

        return (
          <div
            key={i}
            className={`relative flex items-center justify-between gap-3 px-2.5 ${
              i > 0 ? "border-t border-white/[0.03]" : ""
            } ${rowHits[i] ? "bg-vf-acc/10" : ""} ${
              hasChildren ? "nodrag cursor-pointer hover:bg-white/[0.04]" : ""
            }`}
            style={{ height: ROW_HEIGHT }}
            title={
              hasChildren
                ? isCollapsed
                  ? "Click to expand"
                  : "Click to collapse"
                : `${row.key}: ${row.display}`
            }
            onClick={
              hasChildren
                ? (e) => {
                    e.stopPropagation();
                    toggleCollapsed(node.id, i);
                  }
                : undefined
            }
          >
            <span className="shrink-0 truncate text-vf-dim" style={{ maxWidth: "50%" }}>
              {row.key}
            </span>
            <span className="truncate" style={{ color: VALUE_COLOR[row.kind] }}>
              {row.display}
              {hasChildren && (
                <span className="ml-1.5 text-vf-dim">
                  {isCollapsed ? "+" : vertical ? "↓" : "→"}
                </span>
              )}
            </span>
            {hasChildren && (
              <Handle
                type="source"
                id={`row-${i}`}
                position={Position.Right}
                style={hiddenHandle}
                isConnectable={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(JsonNode);
