import { Heart } from "lucide-react";
import { LAB_NAME, SUPPORT_URL } from "@/constants/site";
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
        {/* Support: set apart from the grid above, quiet but clearly a card. */}
        <div className="mt-14 flex flex-col gap-6 rounded-xl border border-vf-rule bg-vf-bg2 px-7 py-8 md:flex-row md:items-center md:gap-10 md:px-10 md:py-9">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-vf-acc/25 bg-vf-acc/[0.07]">
            <Heart className="size-5 text-vf-acc" />
          </span>
          <div className="md:mr-auto">
            <h3 className="text-[19px] font-semibold tracking-[-0.01em]">
              Built by {LAB_NAME}, free for everyone.
            </h3>
            <p className="mt-1.5 max-w-[52ch] text-[15px] text-vf-dim">
              We are a small independent lab. If Visual Flow saves you time, a
              small contribution helps keep it maintained and free of ads.
            </p>
          </div>
          <Btn
            href={SUPPORT_URL}
            variant="line"
            size="lg"
            external
            className="shrink-0 self-start md:self-auto"
          >
            Support the project
          </Btn>
        </div>
      </Reveal>
    </section>
  );
}
