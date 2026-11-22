import { Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

const features = [
  {
    tag: "graph",
    title: "Objects become nodes",
    body: "Every object and array is a node, laid out automatically, left to right or top to bottom. Drag them anywhere.",
  },
  {
    tag: "views",
    title: "Graph, tree or 3D",
    body: "Switch between a node graph, a foldable outline and a 3D model of the same file, without losing your place.",
  },
  {
    tag: "search",
    title: "Find any key or value",
    body: "Type a term and matches light up in whichever view you're in, while everything else fades.",
  },
  {
    tag: "link",
    title: "Click a node, find its code",
    body: "Select anything and its lines are highlighted in the editor, which scrolls to them. Syntax errors are flagged as you type.",
  },
  {
    tag: "export",
    title: "Save it as an image",
    body: "Export the whole graph as PNG, JPG or true vector SVG, in a fraction of a second, for docs, tickets and slides.",
    pro: true,
  },
  {
    tag: "ocr",
    title: "JSON from a screenshot",
    body: "Drop in an image of JSON and get the text back, repaired and formatted.",
    pro: true,
  },
];

export default function Features() {
  return (
    <section id="features" className={`${WRAP} scroll-mt-20 pt-[104px]`}>
      <Reveal>
        <SectionHead label="01 / Features">
          Everything you need to read a payload you didn&apos;t write.
        </SectionHead>
      </Reveal>
      {/* The cards stagger in themselves (.vf-stagger), so they sit outside the block reveal. */}
      <div>
        {/* 1px gaps over a rule-coloured background draw the hairlines between cells */}
        <div className="vf-stagger grid gap-px overflow-hidden rounded-xl border border-vf-rule bg-vf-rule md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.tag}
              className="bg-vf-bg px-[26px] pb-[30px] pt-7 transition-colors duration-200 hover:bg-vf-bg2"
            >
              <Mono>{f.tag}</Mono>
              <h3 className="mb-1.5 mt-3.5 text-[17px] font-semibold tracking-[-0.01em]">
                {f.title}
                {f.pro && (
                  <span className="ml-2 rounded border border-vf-line px-1.5 py-px align-[2px] font-vf-mono text-[10.5px] font-normal text-vf-acc">
                    PRO
                  </span>
                )}
              </h3>
              <p className="text-[15px] text-vf-dim">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
