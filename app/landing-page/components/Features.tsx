import { Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

const features = [
  {
    tag: "graph",
    title: "Objects become nodes",
    body: "Every object and array is a node, laid out left to right automatically. Drag them anywhere.",
  },
  {
    tag: "validate",
    title: "Checked as you type",
    body: "A full code editor on the left. Syntax errors are flagged the moment they appear.",
  },
  {
    tag: "search",
    title: "Find any key or value",
    body: "Type a term and matching nodes light up while everything else dims.",
  },
  {
    tag: "inspect",
    title: "Click to see the full data",
    body: "Open any node to see its contents and the path that leads to it from the root.",
  },
  {
    tag: "export",
    title: "Save it as an image",
    body: "Export the graph as PNG, JPG or SVG for docs, tickets and slides.",
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
        {/* 1px gaps over a rule-coloured background draw the hairlines between cells */}
        <div className="grid gap-px overflow-hidden rounded-xl border border-vf-rule bg-vf-rule md:grid-cols-3">
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
      </Reveal>
    </section>
  );
}
