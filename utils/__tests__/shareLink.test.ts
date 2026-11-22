/**
 * @jest-environment node
 */
import { decodeShare, encodeShare, isShareHash, MAX_LINK } from "../shareLink";

describe("share links", () => {
  const json = JSON.stringify({ order: 4821, customer: { name: "Ada" } }, null, 2);

  it("round-trips the document exactly, formatting included", async () => {
    const hash = await encodeShare({ json });
    expect(await decodeShare(hash)).toEqual({ json, view: undefined, selected: undefined });
    expect(await decodeShare("#" + hash)).toMatchObject({ json });
  });

  it("carries the view and the selected path", async () => {
    const hash = await encodeShare({ json, view: "tree", selected: ["items", 0, "sku"] });
    expect(await decodeShare(hash)).toEqual({
      json,
      view: "tree",
      selected: ["items", 0, "sku"],
    });
  });

  it("handles non-English text and emoji", async () => {
    const text = JSON.stringify({ name: "José 漢字 🙂", "ключ": "значение" });
    expect((await decodeShare(await encodeShare({ json: text })))?.json).toBe(text);
  });

  it("produces text that is safe in a link", async () => {
    const hash = await encodeShare({ json: JSON.stringify({ a: "??>>~~<<" }) });
    expect(hash).toMatch(/^s=[A-Za-z0-9_-]+$/);
    expect(isShareHash("#" + hash)).toBe(true);
    expect(isShareHash("#pricing")).toBe(false);
  });

  it("makes repetitive JSON much smaller", async () => {
    const big = JSON.stringify(
      Array.from({ length: 200 }, (_, i) => ({ id: i, status: "paid", currency: "GBP" }))
    );
    const hash = await encodeShare({ json: big });
    expect(hash.length).toBeLessThan(big.length / 3);
    expect(hash.length).toBeLessThan(MAX_LINK);
  });

  it("returns null for anything that isn't a valid share link", async () => {
    const good = await encodeShare({ json });
    expect(await decodeShare("")).toBeNull();
    expect(await decodeShare("#pricing")).toBeNull();
    expect(await decodeShare("s=not-a-real-link")).toBeNull();
    expect(await decodeShare(good.slice(0, good.length - 12))).toBeNull(); // cut short
  });

  it("ignores a bad view or selection rather than failing", async () => {
    // Build a payload by hand with junk in the optional fields.
    const raw = JSON.stringify({ v: 1, j: json, w: "sideways", s: [{}, 1] });
    const packed = new Uint8Array(
      await new Response(
        new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"))
      ).arrayBuffer()
    );
    const hash = "s=" + Buffer.from(packed).toString("base64url");
    expect(await decodeShare(hash)).toEqual({ json, view: undefined, selected: undefined });
  });
});
