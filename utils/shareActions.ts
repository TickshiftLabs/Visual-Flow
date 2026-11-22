import { copyText } from "@/lib/clipboard";
import { errorToast, successToast } from "@/lib/toast";
import { useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { encodeShare, LONG_LINK, MAX_LINK } from "./shareLink";

/** Builds a link to the current document, view and selection, and copies it. */
export async function copyShareLink(): Promise<void> {
  const { jsonData, isValidJson, view } = useJsonStore.getState();
  if (!jsonData.trim() || !isValidJson) {
    errorToast("Add valid JSON before sharing");
    return;
  }

  const hash = await encodeShare({
    json: jsonData,
    view,
    selected: useGraphStore.getState().selectedPath ?? undefined,
  });
  const link = `${window.location.origin}/editor#${hash}`;

  if (link.length > MAX_LINK) {
    errorToast("This file is too big to fit in a link. Save it and send the file instead.");
    return;
  }
  if (!(await copyText(link))) {
    errorToast("Couldn't copy the link");
    return;
  }
  successToast(
    link.length > LONG_LINK
      ? "Link copied. It's long, so some apps may cut it short."
      : "Link copied"
  );
}
