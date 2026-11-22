import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { setViewExporter } from "@/utils/exportSource";
import { renderTreeSvg } from "@/utils/treeSvg";
import type { ValueKind } from "./graph/buildGraph";
import {
  ancestorIds,
  branchesFrom,
  buildRows,
  countAllRows,
  type TreeRow,
} from "./tree/buildRows";

const ROW_HEIGHT = 27;
const INDENT = 18;
const OVERSCAN = 12;
/** Documents with more rows than this open folded past the top levels. */
const AUTO_FOLD_ROWS = 400;

const VALUE_COLOR: Record<ValueKind, string> = {
  string: "#e6c08a",
  number: "#8ab4ff",
  boolean: "#f29a9a",
  null: "#8b919a",
  object: "#555b64",
  array: "#555b64",
};

const squareColor = (row: TreeRow) =>
  row.depth === 0 ? "#c8f169" : row.kind === "array" ? "#f5b56b" : "#8ab4ff";

interface TreeViewProps {
  jsonData: string;
  /** Drops the top gap that leaves room for the editor's view switcher. */
  compact?: boolean;
}

/** Outline view: the document as an indented, foldable list. */
export default function TreeView({ jsonData, compact = false }: TreeViewProps) {
  const selectedId = useGraphStore((s) => s.selectedId);
  const selectedPath = useGraphStore((s) => s.selectedPath);
  const select = useGraphStore((s) => s.select);
  const query = useGraphStore((s) => s.query.trim().toLowerCase());

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(jsonData) as unknown };
    } catch {
      return { ok: false as const, value: undefined };
    }
  }, [jsonData]);

  // Fold state. Reset when the document changes: big ones start mostly folded.
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [foldedFor, setFoldedFor] = useState<unknown>(null);
  if (parsed.ok && foldedFor !== parsed.value) {
    setFoldedFor(parsed.value);
    setClosed(
      countAllRows(parsed.value) > AUTO_FOLD_ROWS
        ? branchesFrom(parsed.value, 2)
        : new Set()
    );
  }

  // A selection made elsewhere (e.g. in the graph) must be visible here:
  // unfold its ancestors. Runs during render so the row exists before scroll.
  const [revealedId, setRevealedId] = useState<string | null>(null);
  if (selectedId !== revealedId) {
    setRevealedId(selectedId);
    if (selectedPath) {
      const ancestors = ancestorIds(selectedPath).filter((id) => closed.has(id));
      if (ancestors.length) {
        const next = new Set(closed);
        ancestors.forEach((id) => next.delete(id));
        setClosed(next);
      }
    }
  }

  const rows = useMemo(
    () => (parsed.ok ? buildRows(parsed.value, { closed, query }) : []),
    [parsed, closed, query]
  );

  // Image export draws the list as it stands: same folds, same search filter,
  // but every row, not only the ones scrolled into view.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    setViewExporter("tree", {
      kind: "svg",
      render: (font) =>
        renderTreeSvg(rowsRef.current, {
          fontFamily: font.family,
          fontCss: font.css,
        }),
    });
    return () => setViewExporter("tree", null);
  }, []);

  // Windowing: only rows near the viewport are in the page.
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(600);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Bring the selected row into view when the selection changes.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || scrolledFor.current === selectedId) return;
    const index = rows.findIndex((r) => r.id === selectedId);
    const el = scroller.current;
    if (index === -1 || !el) return;
    scrolledFor.current = selectedId;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop || top + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 2);
    }
  }, [selectedId, rows]);

  const toggle = (id: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(
    rows.length,
    Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN
  );

  return (
    <div
      ref={scroller}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onClick={() => select(null)}
      className={`vf-tree h-full overflow-auto px-3.5 pb-5 font-vf-mono text-[12.5px] ${
        compact ? "pt-3.5" : "pt-[58px]"
      }`}
    >
      {rows.length === 0 ? (
        <p className="px-1 py-2 text-vf-dim">
          {query ? `Nothing matches “${query}”.` : "Nothing to show."}
        </p>
      ) : (
        <div
          className="relative max-w-[640px]"
          style={{ height: rows.length * ROW_HEIGHT }}
          role="tree"
        >
          {rows.slice(first, last).map((row, i) => {
            const isSelected = row.id === selectedId;
            return (
              <div
                key={row.id}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-selected={isSelected}
                aria-expanded={row.isBranch ? row.isOpen : undefined}
                data-id={row.id}
                className={`absolute left-0 right-0 flex cursor-pointer items-center gap-2 rounded-md pr-2.5 ${
                  isSelected
                    ? "bg-vf-acc/[0.08] shadow-[inset_2px_0_0_#c8f169]"
                    : row.isMatch
                    ? "bg-vf-acc/[0.06]"
                    : "hover:bg-white/[0.04]"
                }`}
                style={{
                  top: (first + i) * ROW_HEIGHT,
                  height: ROW_HEIGHT,
                  paddingLeft: 4 + row.depth * INDENT,
                  // Faint vertical guides, one per indent level.
                  backgroundImage:
                    row.depth > 0
                      ? `repeating-linear-gradient(to right, transparent 0, transparent ${INDENT - 1}px, #1c1f23 ${INDENT - 1}px, #1c1f23 ${INDENT}px)`
                      : undefined,
                  backgroundSize: `${row.depth * INDENT}px 100%`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "-6px 0",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  select(row.id, row.path);
                }}
              >
                {row.isBranch ? (
                  <button
                    type="button"
                    aria-label={row.isOpen ? "Fold" : "Unfold"}
                    className={`grid size-[18px] shrink-0 cursor-pointer place-items-center rounded text-[9px] text-vf-faint transition-transform hover:text-vf-text ${
                      row.isOpen ? "rotate-90" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(row.id);
                    }}
                  >
                    ▶
                  </button>
                ) : (
                  <span className="w-[18px] shrink-0" />
                )}

                {row.isBranch && (
                  <span
                    className="block size-2 shrink-0 rounded-[2px]"
                    style={{ background: squareColor(row) }}
                  />
                )}

                <span
                  className={`shrink-0 truncate ${
                    row.isBranch ? "text-vf-text" : "text-vf-dim"
                  }`}
                  style={{ maxWidth: "45%" }}
                >
                  {row.label}
                </span>

                <span
                  className={`ml-auto truncate ${
                    row.isBranch ? "text-[11.5px] text-vf-faint" : ""
                  }`}
                  style={row.isBranch ? undefined : { color: VALUE_COLOR[row.kind] }}
                  title={row.isBranch ? undefined : row.text}
                >
                  {row.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
