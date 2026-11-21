/**
 * Copies text to the clipboard and reports whether it worked.
 *
 * The modern clipboard API only exists on secure pages (https or localhost).
 * Opened any other way, e.g. over a LAN address like http://192.168.x.x, it
 * is simply missing, so fall back to the older selection-based copy.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused: try the fallback.
    }
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  // Off screen, but still selectable.
  area.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
  const previous = document.activeElement as HTMLElement | null;
  // An open menu or dialog keeps focus inside itself, so the field has to
  // live inside it to be focusable; otherwise the page body is fine.
  const host =
    previous?.closest<HTMLElement>('[role="menu"], [role="dialog"]') ??
    document.body;
  host.appendChild(area);
  try {
    // Focus first: copying takes the selection of the focused element, and an
    // open menu or dialog may be holding focus elsewhere.
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    // Only report success if the text really was selected in a focused field.
    return document.activeElement === area && document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus?.();
  }
}
