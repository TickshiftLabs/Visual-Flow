import { useEffect, useMemo, useState } from "react";
import { storageService } from "@/utils/storageService";
import { useJsonStore } from "@/store/useJsonStore";
import { countJsonLines, getJsonDepth } from "@/constants/limits";

/** Status bar: validity and size of the current document, plus active settings. */
export default function Footer() {
  const { jsonData, isValidJson, nodeCount, edgeType } = useJsonStore();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  useEffect(() => {
    const read = () =>
      setAutoSaveEnabled(storageService.getSettings().autoSaveEnabled !== false);
    read();
    window.addEventListener("settings-changed", read);
    return () => window.removeEventListener("settings-changed", read);
  }, []);

  const hasContent = jsonData.trim() !== "";

  const depth = useMemo(() => {
    if (!hasContent || !isValidJson) return 0;
    try {
      return getJsonDepth(JSON.parse(jsonData));
    } catch {
      return 0;
    }
  }, [jsonData, isValidJson, hasContent]);

  return (
    <div className="flex h-[30px] shrink-0 items-center gap-[18px] border-t border-vf-rule bg-vf-bg px-3.5 font-vf-mono text-xs text-vf-dim">
      {!hasContent ? (
        <span>no JSON yet</span>
      ) : isValidJson ? (
        <>
          <span>
            <span className="text-vf-acc">●</span> valid JSON
          </span>
          <span>{countJsonLines(jsonData)} lines</span>
          <span>
            {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
          </span>
          <span className="max-sm:hidden">depth {depth}</span>
        </>
      ) : (
        <span className="text-vf-err">● invalid JSON</span>
      )}

      <span className="ml-auto">autosave {autoSaveEnabled ? "on" : "off"}</span>
      <span className="hidden sm:inline">
        edges: {edgeType === "smoothstep" ? "stepped" : "curved"}
      </span>
    </div>
  );
}
