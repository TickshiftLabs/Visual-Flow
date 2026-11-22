import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useState, useRef, useEffect } from "react";
import JsonErrorMessage from "./JsonErrorMessage";
import { useJsonStore } from "@/store/useJsonStore";
import { largeDocumentNote } from "@/constants/limits";
import { infoToast } from "@/lib/toast";
import { useGraphStore } from "@/store/useGraphStore";
import { useIsNarrow } from "@/hooks/useIsNarrow";
import { locatePath } from "../Visualizers/graph/locatePath";

type CodeEditor = Parameters<OnMount>[0];

// Size of the code panel as a percentage of the window: its width beside
// the views on wide screens, its height above them on phones.
const WIDE = { min: 18, max: 60, initial: 30 };
const NARROW = { min: 15, max: 70, initial: 36 };

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

  const narrow = useIsNarrow();
  const limits = narrow ? NARROW : WIDE;
  const [wideSize, setWideSize] = useState(WIDE.initial);
  const [narrowSize, setNarrowSize] = useState(NARROW.initial);
  const size = narrow ? narrowSize : wideSize;
  const [isEditorLoaded, setIsEditorLoaded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ at: 0, size: 0 });
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

    // Mention once when a file is big enough to be slow; say it again only
    // if the file shrinks back and then grows large a second time.
    const note = newValue.trim() ? largeDocumentNote(newValue) : null;
    if (note && !lastLimitWarning.current) infoToast(note, { duration: 6000 });
    lastLimitWarning.current = note;

    setJsonData(newValue);
  };

  // Dragging the divider: sideways on wide screens, up and down on phones.
  // Pointer events cover mouse, touch and pen alike.
  const startResizing = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { at: narrow ? e.clientY : e.clientX, size };
    setIsResizing(true);
  };
  const resize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const moved = narrow
      ? ((e.clientY - dragStart.current.at) / window.innerHeight) * 100
      : ((e.clientX - dragStart.current.at) / window.innerWidth) * 100;
    const next = Math.min(
      Math.max(dragStart.current.size + moved, limits.min),
      limits.max
    );
    if (narrow) setNarrowSize(next);
    else setWideSize(next);
  };
  const stopResizing = () => setIsResizing(false);

  const shown = collapseLeftPanel ? 0 : size;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${
        isResizing ? "" : "transition-[width,height] duration-300 ease-in-out"
      }`}
      style={
        narrow
          ? { height: `${shown}dvh`, width: "100%" }
          : { width: `${shown}vw` }
      }
    >
      <div
        className={`flex flex-col bg-vf-bg ${
          narrow ? "border-b border-vf-rule" : "h-full border-r border-vf-rule"
        }`}
        style={narrow ? { height: `${size}dvh` } : { width: `${size}vw` }}
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

      {/* Divider: drag to resize. Taller on phones so it's easy to grab. */}
      <div
        role="separator"
        aria-orientation={narrow ? "horizontal" : "vertical"}
        aria-label="Resize the code panel"
        className={`group absolute z-30 touch-none ${
          narrow
            ? "bottom-0 left-0 h-4 w-full cursor-row-resize"
            : "right-0 top-0 h-full w-2 cursor-col-resize"
        }`}
        onPointerDown={startResizing}
        onPointerMove={resize}
        onPointerUp={stopResizing}
        onPointerCancel={stopResizing}
      >
        <div
          className={`absolute transition-all duration-150 ${
            narrow ? "bottom-0 left-0 w-full" : "right-0 top-0 h-full"
          } ${
            isResizing
              ? `bg-vf-acc ${narrow ? "h-0.5" : "w-0.5"}`
              : `bg-transparent group-hover:bg-vf-acc/60 ${
                  narrow ? "h-px group-hover:h-0.5" : "w-px group-hover:w-0.5"
                }`
          }`}
        />
        {/* A small grip, since there's no hover on touch screens. */}
        {narrow && (
          <div className="absolute bottom-1 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-vf-line" />
        )}
      </div>
    </div>
  );
}
