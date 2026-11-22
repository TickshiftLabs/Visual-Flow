"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import ImageLightbox from "./ImageLightbox";
import { Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

/**
 * "Three ways to look at the same file": the editor's real views, live.
 *
 * Wide screens get a list beside one large live stage; the views are heavy,
 * so nothing is downloaded until the section is near the viewport.
 *
 * Narrow screens get three still images in a row to swipe through, each of
 * which opens larger when tapped. Live views there would fight the swipe:
 * a drag could pan a graph or turn the 3D scene instead of moving the row.
 */

function FrameNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center font-vf-mono text-xs text-vf-dim">
      {children}
    </div>
  );
}

const loading = () => <FrameNote>loading…</FrameNote>;
const Graph = dynamic(
  () => import("@/app/editor/components/Visualizers/JsonFlowChart"),
  { ssr: false, loading }
);
const Tree = dynamic(
  () => import("@/app/editor/components/Visualizers/TreeView"),
  { ssr: false, loading }
);
const Graph3D = dynamic(
  () => import("@/app/editor/components/Visualizers/Graph3D"),
  { ssr: false, loading }
);

/** Small enough to read as a graph, deep enough to be interesting in 3D. */
const DEMO_JSON = JSON.stringify({
  mission: "Aurora-7",
  status: "scheduled",
  launch: { site: "Kourou", weatherGo: true },
  vehicle: { name: "Halcyon II", stages: 3 },
  crew: [
    { name: "Ada Reyes", role: "commander" },
    { name: "Kenji Sato", role: "pilot" },
  ],
  payload: {
    type: "satellite",
    orbit: { kind: "sun-synchronous", altitudeKm: 620 },
    instruments: ["imager", "radar"],
  },
});

type ViewId = "graph" | "tree" | "3d";

/**
 * Stills of the live views (public/demos). Each view has two: a tall one laid
 * out for the phone frame, and a wide one for the enlarged view. The phone
 * frame uses the tall still's exact shape, so nothing is ever cropped.
 */
const TALL = { width: 1194, height: 1494 };
const WIDE_STILL = { width: 2226, height: 1293 };

const views: Array<{
  id: ViewId;
  label: string;
  color: string;
  short: string;
  body: string;
  /** File name stem: `/demos/view-<stem>.png` and `…-tall.png`. */
  still: string;
  alt: string;
}> = [
  {
    id: "graph",
    label: "Graph",
    color: "#8ab4ff",
    short: "Read values and follow links.",
    body: "Node cards with every key and value. Follow the links, fold branches, drag things where you want them.",
    still: "graph",
    alt: "Graph view: a root card linked to cards for launch, vehicle, two crew members and payload, with the orbit card selected",
  },
  {
    id: "tree",
    label: "Tree",
    color: "#f5b56b",
    short: "Work through big files.",
    body: "An indented list you can fold, like a file explorer. The one to use when a file is too big for a graph.",
    still: "tree",
    alt: "Tree view: the same file as an indented list of keys and values, with the orbit row selected",
  },
  {
    id: "3d",
    label: "3D",
    color: "#c8f169",
    short: "See the whole shape at once.",
    body: "Every object as a point in space. Drag to turn it and get a feel for how big and how deep a file is.",
    still: "3d",
    alt: "3D view: the same file as linked points in space, with the orbit point selected",
  },
];

function LiveView({ id }: { id: ViewId }) {
  if (id === "graph") {
    return <Graph jsonData={DEMO_JSON} edgeType="default" showGrid embedded />;
  }
  if (id === "tree") return <Tree jsonData={DEMO_JSON} compact />;
  return <Graph3D jsonData={DEMO_JSON} zoomable={false} />;
}

const WIDE = "(min-width: 768px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export default function Views() {
  const [active, setActive] = useState<ViewId>("graph");
  const section = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  // Only one layout is mounted, so the views aren't created twice.
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true
  );

  useEffect(() => {
    const el = section.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  const frame =
    "relative overflow-hidden rounded-xl border border-vf-line bg-vf-bg2";

  return (
    <section
      ref={section}
      id="views"
      className={`${WRAP} scroll-mt-20 overflow-x-clip pt-[104px]`}
    >
      <Reveal>
        <SectionHead label="02 / Views">
          Three ways to look at the same file.
        </SectionHead>

        {wide ? (
          // Wide: pick from the list, one large stage.
          <div className="grid grid-cols-[300px_1fr] gap-7" data-layout="stage">
            <div
              role="tablist"
              aria-label="View"
              aria-orientation="vertical"
              className="flex flex-col"
            >
              {views.map((v, i) => {
                const on = active === v.id;
                return (
                  <button
                    key={v.id}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(v.id)}
                    className="relative cursor-pointer border-t border-vf-rule py-[18px] pl-4 text-left last:border-b"
                  >
                    <span
                      className={`absolute bottom-[18px] left-0 top-[18px] w-0.5 transition-colors ${
                        on ? "bg-vf-acc" : "bg-transparent"
                      }`}
                    />
                    <Mono>{String(i + 1).padStart(2, "0")}</Mono>
                    <b
                      className={`my-1 block text-[17px] font-semibold transition-colors ${
                        on ? "text-vf-text" : "text-vf-dim"
                      }`}
                    >
                      {v.label}
                    </b>
                    {on && <p className="text-[15px] text-vf-dim">{v.body}</p>}
                  </button>
                );
              })}
              <Mono className="mt-auto pt-5">live · selection is shared</Mono>
            </div>

            <div
              role="tabpanel"
              aria-label={`${views.find((v) => v.id === active)!.label} view`}
              className={`${frame} aspect-[1050/612]`}
            >
              {seen ? (
                <LiveView key={active} id={active} />
              ) : (
                <FrameNote>…</FrameNote>
              )}
            </div>
          </div>
        ) : (
          // Narrow: three stills in a row to swipe through; tap to enlarge.
          <div data-layout="swipe">
            <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {views.map((v) => (
                <div key={v.id} className="w-[84%] shrink-0 snap-center">
                  <ImageLightbox
                    src={`/demos/view-${v.still}.png`}
                    alt={v.alt}
                    title={`${v.label} view`}
                    {...WIDE_STILL}
                  >
                    <button
                      type="button"
                      aria-label={`Enlarge the ${v.label} view`}
                      className={`${frame} block aspect-[1194/1494] w-full cursor-zoom-in`}
                    >
                      <Image
                        src={`/demos/view-${v.still}-tall.png`}
                        alt={v.alt}
                        {...TALL}
                        sizes="(max-width: 767px) 84vw, 1px"
                        className="h-full w-full"
                      />
                      <span className="absolute bottom-2.5 right-2.5 rounded-full border border-vf-line bg-vf-panel/90 px-2.5 py-1 font-vf-mono text-[11px] text-vf-dim">
                        tap to enlarge
                      </span>
                    </button>
                  </ImageLightbox>
                  <div className="px-0.5 pt-4">
                    <b className="flex items-center gap-2 text-[17px] font-semibold">
                      <span
                        className="block size-2 rounded-[2px]"
                        style={{ background: v.color }}
                      />
                      {v.label}
                    </b>
                    <p className="mt-1.5 text-[15px] text-vf-dim">{v.short}</p>
                  </div>
                </div>
              ))}
            </div>
            <Mono className="mt-4 block text-center">
              swipe to see the other views →
            </Mono>
          </div>
        )}
      </Reveal>
    </section>
  );
}
