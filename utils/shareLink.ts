import type { JsonPath } from "@/app/editor/components/Visualizers/graph/buildGraph";

/**
 * Shareable links: the document travels inside the link, compressed, in the
 * part of the address after `#`. Browsers never send that part to a server,
 * so nothing is uploaded or stored anywhere.
 */

export type SharedView = "graph" | "tree" | "3d";

export interface SharedState {
  /** The document, exactly as typed (formatting included). */
  json: string;
  view?: SharedView;
  /** Path of the selected node or value, if any. */
  selected?: JsonPath;
}

const PREFIX = "s=";
const VERSION = 1;

/** Past this, some chat and email apps cut links short. */
export const LONG_LINK = 8_000;
/** Past this a link isn't dependable anywhere; share the file instead. */
export const MAX_LINK = 60_000;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string) => {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

/** Packs the state into the text that goes after `#`. */
export async function encodeShare(state: SharedState): Promise<string> {
  const payload = JSON.stringify({
    v: VERSION,
    j: state.json,
    ...(state.view ? { w: state.view } : {}),
    ...(state.selected ? { s: state.selected } : {}),
  });
  const packed = await pipe(
    new TextEncoder().encode(payload),
    new CompressionStream("deflate-raw")
  );
  return PREFIX + toBase64Url(packed);
}

/** Reads state back out of a link's hash. Null if it isn't a share link or is damaged. */
export async function decodeShare(hash: string): Promise<SharedState | null> {
  const text = hash.replace(/^#/, "");
  if (!text.startsWith(PREFIX)) return null;
  try {
    const unpacked = await pipe(
      fromBase64Url(text.slice(PREFIX.length)),
      new DecompressionStream("deflate-raw")
    );
    const data = JSON.parse(new TextDecoder().decode(unpacked));
    if (data?.v !== VERSION || typeof data.j !== "string") return null;

    const view = ["graph", "tree", "3d"].includes(data.w) ? (data.w as SharedView) : undefined;
    const selected =
      Array.isArray(data.s) &&
      data.s.every((seg: unknown) => typeof seg === "string" || Number.isInteger(seg))
        ? (data.s as JsonPath)
        : undefined;
    return { json: data.j, view, selected };
  } catch {
    return null; // truncated or otherwise damaged link
  }
}

export const isShareHash = (hash: string) => hash.replace(/^#/, "").startsWith(PREFIX);
