import Image from "next/image";
import { Btn, Mono, WRAP } from "./parts";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <>
      <header className={`${WRAP} pb-14 pt-24 text-center`}>
        <Mono className="mb-[26px] inline-block rounded-full border border-vf-rule px-3 py-[5px]">
          JSON <span className="text-vf-acc">→</span> graph, in your browser
        </Mono>
        <h1 className="mx-auto mb-[22px] max-w-[12ch] text-[clamp(44px,7.4vw,84px)] font-semibold leading-[0.98] tracking-[-0.045em]">
          See the shape of your JSON.
        </h1>
        <p className="mx-auto mb-[30px] max-w-[46ch] text-lg text-vf-dim">
          Paste any JSON and get a graph you can search, collapse and export.
          Nothing to install, no account needed.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Btn href="/editor" size="lg">
            Open the editor
          </Btn>
          <Btn href="#how" size="lg" variant="line">
            How it works
          </Btn>
        </div>
      </header>

      <Reveal className={WRAP}>
        <div className="overflow-hidden rounded-xl border border-vf-line bg-vf-bg2 shadow-[0_40px_120px_-40px_rgba(200,241,105,0.16)]">
          <div className="flex items-center gap-3.5 border-b border-vf-rule px-3.5 py-2.5">
            <Mono>data.json</Mono>
            <Mono className="hidden sm:inline">46 lines</Mono>
            <Mono className="ml-auto">
              <span className="text-vf-acc">●</span> valid · 19 nodes
            </Mono>
          </div>
          <Image
            src="/demos/demo.jpg"
            alt="The Visual Flow editor: JSON on the left, node graph on the right"
            width={2555}
            height={1268}
            priority
            sizes="(max-width: 1120px) 100vw, 1072px"
            className="block h-auto w-full"
          />
        </div>
      </Reveal>
    </>
  );
}
