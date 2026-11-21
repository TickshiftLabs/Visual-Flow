import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useState, useRef, useEffect, useCallback } from "react";
import JsonErrorMessage from "./JsonErrorMessage";
import { useJsonStore } from "@/store/useJsonStore";
import { validateJsonAgainstFreeLimits } from "@/constants/limits";
import { errorToast } from "@/lib/toast";
import { useSupabase } from "@/components/Auth/SupabaseProvider";
import { useGraphStore } from "@/store/useGraphStore";
import { locatePath } from "../Visualizers/graph/locatePath";

type CodeEditor = Parameters<OnMount>[0];

const MIN_WIDTH = 18; // % of the window
const MAX_WIDTH = 60;
const DEFAULT_WIDTH = 30;

const THEME = "vf-dark";

/** Monaco theme matching the app palette. */
function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "string.key.json", foreground: "c4c8cd" },
      { token: "string.value.json", foreground: "e6c08a" },
      { token: "number", foreground: "8ab4ff" },
      { token: "keyword.json", foreground: "f29a9a" },
      { token: "delimiter", foreground: "6b727c" },
    ],
    colors: {
      "editor.background": "#0b0c0e",
      "editor.foreground": "#c4c8cd",
      "editorLineNumber.foreground": "#555b64",
      "editorLineNumber.activeForeground": "#8b919a",
      "editorCursor.foreground": "#c8f169",
      "editor.selectionBackground": "#c8f16933",
      "editor.inactiveSelectionBackground": "#c8f1691a",
      "editorWidget.background": "#131518",
      "editorWidget.border": "#26292e",
      "scrollbarSlider.background": "#26292e88",
      "scrollbarSlider.hoverBackground": "#3a3f46aa",
      "editorError.foreground": "#f29a9a",
      // Brackets all take the punctuation colour instead of rainbow pairs.
      ...Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((n) => [
          `editorBracketHighlight.foreground${n}`,
          "#6b727c",
        ])
      ),
    },
  });
}

const editorOptions = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  fontSize: 12.5,
  lineHeight: 21,
  fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
  lineNumbers: "on",
  lineNumbersMinChars: 3,
  tabSize: 2,
  stickyScroll: { enabled: false },
  padding: { top: 14, bottom: 14 },
  placeholder: "Paste or type JSON here…",
  bracketPairColorization: { enabled: false },
  guides: { bracketPairs: false, indentation: false },
  renderLineHighlight: "none",
  occurrencesHighlight: "off",
  matchBrackets: "never",
  overviewRulerLanes: 0,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
} as const;

export default function LeftPanel() {
  const { jsonData, setJsonData, collapseLeftPanel, isValidJson } =
    useJsonStore();
  const { isPro } = useSupabase();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, width: DEFAULT_WIDTH });
  const lastLimitWarning = useRef<string | null>(null);

  const editorRef = useRef<CodeEditor | null>(null);
  const decorations = useRef<ReturnType<
    CodeEditor["createDecorationsCollection"]
  > | null>(null);
  const selectedPath = useGraphStore((s) => s.selectedPath);
  const revealedPath = useRef<typeof selectedPath>(null);

  // Highlight the selected node's lines, and scroll to them when the
  // selection changes (not on every keystroke while it stays selected).
  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    const range = selectedPath && locatePath(model.getValue(), selectedPath);
    if (!range) {
      decorations.current?.clear();
      revealedPath.current = null;
      return;
    }

    const start = model.getPositionAt(range.start);
    const end = model.getPositionAt(range.end);
    const lines = {
      startLineNumber: start.lineNumber,
      startColumn: 1,
      endLineNumber: end.lineNumber,
      endColumn: model.getLineMaxColumn(end.lineNumber),
    };
    const items = [
      {
        range: lines,
        options: {
          isWholeLine: true,
          className: "vf-line-selected",
          marginClassName: "vf-line-selected-margin",
        },
      },
    ];
    if (decorations.current) decorations.current.set(items);
    else decorations.current = editor.createDecorationsCollection(items);

    if (revealedPath.current !== selectedPath) {
      revealedPath.current = selectedPath;
      // Short ranges are centred; long ones are shown from their first line.
      const visible = editor.getVisibleRanges()[0];
      const fits =
        visible &&
        end.lineNumber - start.lineNumber <
          visible.endLineNumber - visible.startLineNumber;
      if (fits) editor.revealRangeInCenterIfOutsideViewport(lines, 0);
      else editor.revealLineNearTop(start.lineNumber, 0);
    }
  }, [selectedPath, jsonData, isEditorLoaded]);

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";

    // Warn free users once per distinct limit message, not on every keystroke.
    if (newValue.trim() && !isPro) {
      const validation = validateJsonAgainstFreeLimits(newValue, isPro);
      if (!validation.isValid && !validation.isFormatError) {
        if (lastLimitWarning.current !== validation.message) {
          errorToast(`${validation.message}. Upgrade for more!`);
          lastLimitWarning.current = validation.message ?? null;
        }
      } else if (validation.isValid) {
        lastLimitWarning.current = null;
      }
    }

    setJsonData(newValue);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const delta =
      ((e.clientX - dragStart.current.x) / document.body.clientWidth) * 100;
    setWidth(
      Math.min(Math.max(dragStart.current.width + delta, MIN_WIDTH), MAX_WIDTH)
    );
  }, []);

  const stopResizing = useCallback(() => setIsResizing(false), []);

  useEffect(() => {
    if (!isResizing) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, handleMouseMove, stopResizing]);

  const startResizing = (e: React.MouseEvent) => {
    dragStart.current = { x: e.clientX, width };
    setIsResizing(true);
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${
        isResizing ? "" : "transition-[width] duration-300 ease-in-out"
      }`}
      style={{ width: collapseLeftPanel ? 0 : `${width}vw` }}
    >
      <div
        className="flex h-full flex-col border-r border-vf-rule bg-vf-bg"
        style={{ width: `${width}vw` }}
      >
        <JsonErrorMessage
          isVisible={!isValidJson && jsonData !== "" && isEditorLoaded}
        />

        <div className="relative min-h-0 flex-1">
          {!isEditorLoaded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-vf-bg font-vf-mono text-xs text-vf-dim">
              loading editor…
            </div>
          )}

          <Editor
            height="100%"
            width="100%"
            theme={THEME}
            defaultLanguage="json"
            value={jsonData}
            onChange={handleEditorChange}
            options={editorOptions as any}
            beforeMount={defineTheme}
            onMount={(editor) => {
              editorRef.current = editor;
              setIsEditorLoaded(true);
            }}
            loading={null}
            className="monaco-editor-container"
          />
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="group absolute right-0 top-0 z-30 h-full w-2 cursor-col-resize"
        onMouseDown={startResizing}
      >
        <div
          className={`absolute right-0 top-0 h-full transition-all duration-150 ${
            isResizing
              ? "w-0.5 bg-vf-acc"
              : "w-px bg-transparent group-hover:w-0.5 group-hover:bg-vf-acc/60"
          }`}
        />
      </div>
    </div>
  );
}
