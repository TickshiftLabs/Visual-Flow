"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

// The 3D library is large; fetch it only once the section is on screen.
const Graph3D = dynamic(
  () => import("@/app/editor/components/Visualizers/Graph3D"),
  { ssr: false, loading: () => <FrameNote>loading 3D view…</FrameNote> }
);

function FrameNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center font-vf-mono text-xs text-vf-dim">
      {children}
    </div>
  );
}

/** A small order file, big enough to make an interesting shape in 3D. */
const DEMO_JSON = JSON.stringify({
  store: "Halcyon Supply",
  orders: ["Ada", "Grace", "Alan", "Hedy"].map((name, i) => ({
    id: 4801 + i,
    customer: { name, tier: i % 2 ? "pro" : "free" },
    items: Array.from({ length: 1 + (i % 3) }, (_, k) => ({
      sku: `${"ABCD"[(i + k) % 4]}-${10 + i + k}`,
      qty: 1 + k,
    })),
    shipping: { method: i % 2 ? "express" : "standard", address: { city: ["Leeds", "Berlin", "Lyon", "Osaka"][i] } },
  })),
});

type ViewId = "3d" | "graph" | "tree";

const views: Array<{ id: ViewId; label: string; title: string; body: string }> = [
  {
    id: "3d",
    label: "3D",
    title: "See the whole shape at once",
    body: "Every object becomes a point in space, linked to its parent. Drag to turn it around. Good for getting a feel for how big and how deep a file is.",
  },
  {
    id: "graph",
    label: "Graph",
    title: "Read values and follow links",
    body: "Node cards with every key and value, laid out left to right or top to bottom. Fold branches away, drag things where you want them.",
  },
  {
    id: "tree",
    label: "Tree",
    title: "Work through big files",
    body: "An indented list you can fold, like a file explorer. A huge file is just a longer list, so this is the one to use when the graph gets crowded.",
  },
];

export default function Views() {
  const [active, setActive] = useState<ViewId>("3d");
  const [layout, setLayout] = useState<"constellation" | "cone">("constellation");
  const frame = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  // Don't download or start the 3D scene until the frame is near the viewport.
  useEffect(() => {
    const el = frame.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  const current = views.find((v) => v.id === active)!;

  return (
    <section id="views" className={`${WRAP} scroll-mt-20 pt-[104px]`}>
      <Reveal>
        <SectionHead label="02 / Views">
          Three ways to look at the same file.
        </SectionHead>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <div
            role="tablist"
            aria-label="View"
            className="flex gap-0.5 rounded-[9px] border border-vf-line p-[3px]"
          >
            {views.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={active === v.id}
                onClick={() => setActive(v.id)}
                className={`cursor-pointer rounded-md px-3.5 py-1.5 font-vf-mono text-xs transition-colors ${
                  active === v.id
                    ? "bg-vf-line text-vf-text"
                    : "text-vf-dim hover:text-vf-text"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="max-w-[62ch] text-[15px] text-vf-dim md:text-right">
            <b className="font-semibold text-vf-text">{current.title}.</b>{" "}
            {current.body}
          </p>
        </div>

        <div
          ref={frame}
          role="tabpanel"
          aria-label={`${current.label} view`}
          className="relative aspect-[1050/612] overflow-hidden rounded-xl border border-vf-line bg-vf-bg2"
        >
          {active === "3d" &&
            (seen ? (
              <>
                {/* On touch screens the scene only spins, so swiping still scrolls the page. */}
                <div className="h-full w-full [@media(pointer:coarse)]:pointer-events-none">
                  <Graph3D
                    jsonData={DEMO_JSON}
                    layout={layout}
                    zoomable={false}
                    nameAllUpTo={0}
                  />
                </div>
                <div className="absolute left-3.5 top-3.5 flex gap-0.5 rounded-[9px] border border-vf-line bg-vf-panel/90 p-[3px] backdrop-blur">
                  {(["constellation", "cone"] as const).map((kind) => (
                    <button
                      key={kind}
                      aria-pressed={layout === kind}
                      onClick={() => setLayout(kind)}
                      className={`cursor-pointer rounded-md px-[11px] py-1 font-vf-mono text-xs transition-colors ${
                        layout === kind
                          ? "bg-vf-line text-vf-text"
                          : "text-vf-dim hover:text-vf-text"
                      }`}
                    >
                      {kind === "constellation" ? "Constellation" : "Cone tree"}
                    </button>
                  ))}
                </div>
                <Mono className="pointer-events-none absolute bottom-3.5 left-1/2 hidden -translate-x-1/2 rounded-full border border-vf-line bg-vf-panel/90 px-3 py-1 [@media(pointer:fine)]:block">
                  live · drag to rotate · click a point
                </Mono>
              </>
            ) : (
              <FrameNote>3D view</FrameNote>
            ))}

          {active === "graph" && (
            <Image
              src="/demos/graph-top-down.png"
              alt="Graph view laid out top to bottom: a root card with five child cards beneath it and two more below those, one selected"
              width={2100}
              height={1224}
              sizes="(max-width: 1120px) 100vw, 1072px"
              className="block h-full w-full object-cover"
            />
          )}

          {active === "tree" && (
            <Image
              src="/demos/tree-outline.png"
              alt="Tree view: the same file as an indented list with some branches folded and one row selected"
              width={1400}
              height={1224}
              sizes="(max-width: 1120px) 100vw, 720px"
              className="mx-auto block h-full w-auto"
            />
          )}
        </div>
      </Reveal>
    </section>
  );
}
