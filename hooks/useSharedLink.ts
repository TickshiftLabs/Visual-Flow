import { useCallback, useEffect, useState } from "react";
import { pathToId } from "@/app/editor/components/Visualizers/graph/buildGraph";
import { errorToast } from "@/lib/toast";
import { useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { decodeShare, isShareHash } from "@/utils/shareLink";
import { storageService } from "@/utils/storageService";

const clearHash = () =>
  window.history.replaceState(null, "", window.location.pathname + window.location.search);

/**
 * Opens share links (see utils/shareLink.ts).
 *
 * If the visitor already has their own saved work, the shared file is shown
 * without replacing it: `isViewingShared` is true and autosave should pause
 * until they choose `keep` (make the shared file theirs) or `restore` (go
 * back to their own). With nothing to lose, the shared file simply loads.
 */
export function useSharedLink() {
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    const open = async () => {
      if (!isShareHash(window.location.hash)) return;
      const shared = await decodeShare(window.location.hash);
      if (!shared) {
        errorToast("That share link is damaged or incomplete");
        clearHash();
        return;
      }

      const mine = storageService.getJsonData().content ?? "";
      const store = useJsonStore.getState();
      store.setJsonData(shared.json);
      store.setVisualizationJson(shared.json);
      store.setFileName("shared.json");
      // The sender's view applies to this visit only; it isn't saved as a preference.
      if (shared.view) useJsonStore.setState({ view: shared.view });
      useGraphStore
        .getState()
        .select(shared.selected ? pathToId(shared.selected) : null, shared.selected);

      if (mine.trim() && mine !== shared.json) {
        setPrevious(mine); // keep the link in the address bar until they decide
      } else {
        clearHash();
      }
    };

    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  const keep = useCallback(() => {
    storageService.saveJsonData(useJsonStore.getState().jsonData);
    setPrevious(null);
    clearHash();
  }, []);

  const restore = useCallback(() => {
    if (previous === null) return;
    const store = useJsonStore.getState();
    store.setJsonData(previous);
    store.setVisualizationJson(previous);
    store.setFileName("untitled.json");
    useJsonStore.setState({ view: storageService.getSettings().view ?? "graph" });
    useGraphStore.getState().select(null);
    setPrevious(null);
    clearHash();
  }, [previous]);

  return { isViewingShared: previous !== null, keep, restore };
}
