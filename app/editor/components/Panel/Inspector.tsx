import React, { useEffect, useMemo, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { copyText } from "@/lib/clipboard";
import {
  getAtPath,
  kindOf,
  type JsonPath,
} from "../Visualizers/graph/buildGraph";
import { locatePath } from "../Visualizers/graph/locatePath";
import {
  pathLabel,
  toJsAccessor,
  toJsonPath,
} from "../Visualizers/graph/pathFormat";

/** Longest preview shown; "copy" always copies the full value. */
const PREVIEW_LIMIT = 6000;

const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)/g;

/** Colours JSON text the same way the code editor does. */
function highlight(json: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of json.matchAll(TOKEN)) {
    const index = match.index!;
    if (index > last) out.push(json.slice(last, index));
    const [, text, colon, number, word] = match;
    if (text !== undefined) {
      out.push(
        <span key={key++} style={{ color: colon ? "#c4c8cd" : "#e6c08a" }}>
          {text}
        </span>
      );
      if (colon) out.push(colon);
    } else if (number !== undefined) {
      out.push(
        <span key={key++} style={{ color: "#8ab4ff" }}>
          {number}
        </span>
      );
    } else {
      out.push(
        <span key={key++} style={{ color: word === "null" ? "#8b919a" : "#f29a9a" }}>
          {word}
        </span>
      );
    }
    last = index + match[0].length;
  }
  if (last < json.length) out.push(json.slice(last));
  return out;
}

type CopyState = "idle" | "copied" | "failed";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1400);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => setState((await copyText(text)) ? "copied" : "failed")}
      className={`shrink-0 cursor-pointer font-vf-mono text-[11px] transition-colors ${
        state === "copied"
          ? "text-vf-acc"
          : state === "failed"
          ? "text-vf-err"
          : "text-vf-dim hover:text-vf-text"
      }`}
    >
      {state === "copied" ? "copied" : state === "failed" ? "couldn't copy" : "copy"}
    </button>
  );
}

function Section({
  title,
  action,
  children,
  grow,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <section
      className={`border-b border-vf-rule px-3.5 py-3 last:border-b-0 ${
        grow ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between font-vf-mono text-[10.5px] uppercase tracking-[0.08em] text-vf-faint">
        <span>{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

const squareColor = (path: JsonPath, value: unknown) =>
  path.length === 0
    ? "#c8f169"
    : Array.isArray(value)
    ? "#f5b56b"
    : value !== null && typeof value === "object"
    ? "#8ab4ff"
    : "#7fd6a4";

const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

interface InspectorProps {
  /** The parsed document currently being visualised. */
  document: unknown;
}

/** Details of the selected node or value: where it is, what's in it, and quick copies. */
export default function Inspector({ document }: InspectorProps) {
  const path = useGraphStore((s) => s.selectedPath);
  const select = useGraphStore((s) => s.select);
  const jsonData = useJsonStore((s) => s.jsonData);

  const info = useMemo(() => {
    if (!path) return null;
    const value = getAtPath(document, path);
    if (value === undefined) return null;

    const pretty = JSON.stringify(value, null, 2);
    const compact = JSON.stringify(value);
    const kind = kindOf(value);
    const range = locatePath(jsonData, path);
    const lineOf = (offset: number) => {
      let line = 1;
      for (let i = 0; i < offset; i++) if (jsonData.charCodeAt(i) === 10) line++;
      return line;
    };
    const lines = range
      ? [lineOf(range.start), lineOf(Math.max(range.start, range.end - 1))]
      : null;

    return {
      value,
      pretty,
      kind,
      count:
        kind === "array"
          ? `${(value as unknown[]).length} items`
          : kind === "object"
          ? `${Object.keys(value as object).length} keys`
          : kind === "string"
          ? `${(value as string).length} characters`
          : null,
      lines,
      size: new Blob([compact]).size,
    };
  }, [path, document, jsonData]);

  if (!path || !info) return null;

  const jsonPath = toJsonPath(path);
  const accessor = toJsAccessor(path);
  const truncated = info.pretty.length > PREVIEW_LIMIT;
  const preview = truncated ? info.pretty.slice(0, PREVIEW_LIMIT) : info.pretty;

  return (
    <aside
      aria-label="Inspector"
      className="vf-inspector flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-vf-rule bg-vf-bg"
    >
      <header className="flex items-center gap-2 border-b border-vf-rule px-3.5 py-2.5 font-vf-mono text-[12.5px]">
        <span
          className="block size-2 shrink-0 rounded-[2px]"
          style={{ background: squareColor(path, info.value) }}
        />
        <b className="truncate font-medium text-vf-text" title={pathLabel(path)}>
          {pathLabel(path)}
        </b>
        <button
          type="button"
          aria-label="Close inspector"
          onClick={() => select(null)}
          className="ml-auto shrink-0 cursor-pointer px-1 text-vf-dim transition-colors hover:text-vf-text"
        >
          ✕
        </button>
      </header>

      <Section title="Path" action={<CopyButton text={jsonPath} label="Copy JSONPath" />}>
        <div className="break-all font-vf-mono text-xs text-vf-soft" data-field="jsonpath">
          {jsonPath}
        </div>
      </Section>

      <Section
        title="In code"
        action={<CopyButton text={accessor} label="Copy JavaScript accessor" />}
      >
        <div className="break-all font-vf-mono text-xs text-vf-soft" data-field="accessor">
          {accessor}
        </div>
      </Section>

      <Section
        title="Contents"
        action={<CopyButton text={info.pretty} label="Copy value" />}
        grow
      >
        <pre
          data-field="contents"
          className="min-h-0 flex-1 overflow-auto whitespace-pre font-vf-mono text-xs leading-5 text-[#6b727c]"
        >
          {highlight(preview)}
          {truncated && (
            <span className="text-vf-faint">
              {"\n"}… {(info.pretty.length - PREVIEW_LIMIT).toLocaleString()} more
              characters (copy for all)
            </span>
          )}
        </pre>
      </Section>

      <Section title="Details">
        <dl
          data-field="details"
          className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-vf-mono text-xs"
        >
          <dt className="text-vf-dim">type</dt>
          <dd className="text-vf-soft">{info.kind}</dd>
          {info.count && (
            <>
              <dt className="text-vf-dim">size</dt>
              <dd className="text-vf-soft">{info.count}</dd>
            </>
          )}
          {info.lines && (
            <>
              <dt className="text-vf-dim">lines</dt>
              <dd className="text-vf-soft">
                {info.lines[0] === info.lines[1]
                  ? info.lines[0]
                  : `${info.lines[0]}–${info.lines[1]}`}
              </dd>
            </>
          )}
          <dt className="text-vf-dim">weight</dt>
          <dd className="text-vf-soft">{formatBytes(info.size)}</dd>
        </dl>
      </Section>
    </aside>
  );
}
