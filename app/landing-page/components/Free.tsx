import { SUPPORT_URL } from "@/constants/site";
import { Btn, Mono, SectionHead, WRAP } from "./parts";
import Reveal from "./Reveal";

const points = [
  {
    tag: "free",
    title: "Every feature, no plans",
    body: "All three views, search, sharing and image export. Nothing is held back for a paid tier.",
  },
  {
    tag: "private",
    title: "Nothing is uploaded",
    body: "Your JSON is read and drawn in your browser. Even share links keep the data in the link itself.",
  },
  {
    tag: "open",
    title: "No account",
    body: "Open the editor and start. The code is MIT licensed and on GitHub.",
  },
];

export default function Free() {
  return (
    <section id="free" className={`${WRAP} scroll-mt-20 pt-[104px]`}>
      <Reveal>
        <SectionHead label="04 / Free">
          Free to use, with nothing to sign up for.
        </SectionHead>
        <div className="grid gap-px overflow-hidden rounded-xl border border-vf-rule bg-vf-rule md:grid-cols-3">
          {points.map((p) => (
            <div key={p.tag} className="bg-vf-bg px-[26px] pb-[30px] pt-7">
              <Mono>{p.tag}</Mono>
              <h3 className="mb-1.5 mt-3.5 text-[17px] font-semibold tracking-[-0.01em]">
                {p.title}
              </h3>
              <p className="text-[15px] text-vf-dim">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="text-[15px] text-vf-dim">
            If Visual Flow saves you time, you can chip in to keep it going.
          </p>
          <Btn href={SUPPORT_URL} variant="line" external>
            Support the project
          </Btn>
        </div>
      </Reveal>
    </section>
  );
}
