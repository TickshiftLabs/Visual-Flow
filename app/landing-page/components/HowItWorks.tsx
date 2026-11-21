import Image from "next/image";
import { Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

const steps = [
  {
    title: "Paste or drop a file",
    body: "Into the editor, or drag a .json file onto the page.",
  },
  {
    title: "Read the graph",
    body: "The structure appears beside your text, colour-coded by type.",
  },
  {
    title: "Dig in",
    body: "Fold branches, search, switch views, and click a node to find it in the code.",
  },
  {
    title: "Take it with you",
    body: "Download the JSON or export the graph as an image.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className={`${WRAP} scroll-mt-20 pt-[104px]`}>
      <Reveal>
        <SectionHead label="03 / How it works">
          Four steps, about ten seconds.
        </SectionHead>
        <div className="grid items-center gap-14 md:grid-cols-[1fr_1.15fr]">
          <ol className="border-b border-vf-rule">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[44px_1fr] border-t border-vf-rule py-[18px]"
              >
                <Mono>{String(i + 1).padStart(2, "0")}</Mono>
                <div>
                  <b className="block font-semibold">{s.title}</b>
                  <span className="text-[15px] text-vf-dim">{s.body}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="overflow-hidden rounded-xl border border-vf-rule bg-vf-bg2">
            <Image
              src="/demos/graph-closeup.png"
              alt="Close-up of the graph: a root node linked to a customer node and two item nodes, with the first item selected"
              width={1284}
              height={832}
              sizes="(max-width: 768px) 100vw, 560px"
              className="block h-auto w-full"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
