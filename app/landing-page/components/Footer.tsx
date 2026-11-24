import { LAB_NAME, LAB_URL, SUPPORT_URL } from "@/constants/site";
import { Btn, GITHUB_URL, Mono, WRAP } from "./parts";
import Reveal from "./Reveal";

export default function Footer() {
  return (
    <>
      <Reveal className={`${WRAP} pb-28 pt-32 text-center`}>
        <h2 className="mx-auto mb-[26px] max-w-[16ch] text-[clamp(34px,5.4vw,60px)] font-semibold leading-[1.08] tracking-[-0.03em]">
          Paste some JSON and see for yourself.
        </h2>
        <Btn href="/editor" size="lg">
          Open the editor
        </Btn>
      </Reveal>

      <footer className="border-t border-vf-rule py-[26px]">
        <div className={`${WRAP} flex flex-wrap gap-x-6 gap-y-2`}>
          <Mono className="mr-auto">
            Visual Flow is made by{" "}
            <a
              href={LAB_URL}
              className="text-vf-text underline-offset-4 hover:underline"
            >
              {LAB_NAME}
            </a>{" "}
            · MIT licensed
          </Mono>
          <a href={`${LAB_URL}/#work`}>
            <Mono className="transition-colors hover:text-vf-text">
              More from the labs
            </Mono>
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Mono className="transition-colors hover:text-vf-text">GitHub</Mono>
          </a>
          <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
            <Mono className="transition-colors hover:text-vf-text">Support</Mono>
          </a>
        </div>
      </footer>
    </>
  );
}
