import type React from "react";
import HeroDemo from "./HeroDemo";
import { Btn, Mono, WRAP } from "./parts";

export default function Hero() {
  return (
    <>
      <header className={`${WRAP} pb-14 pt-24 text-center`}>
        <Mono className="vf-enter mb-[26px] inline-flex items-center gap-[1ch] rounded-full border border-vf-rule px-3 py-[5px]">
          JSON
          {/* Drawn rather than typed: the font's → glyph sits low on the line. */}
          <svg
            aria-hidden
            viewBox="0 0 12 10"
            className="h-[0.7em] w-[0.85em] text-vf-acc"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 5h10M7.5 1.5 11 5 7.5 8.5" />
          </svg>
          graph, in your browser
        </Mono>
        <h1
          style={{ "--i": 1 } as React.CSSProperties}
          className="vf-enter mx-auto mb-[22px] max-w-[12ch] text-[clamp(44px,7.4vw,84px)] font-semibold leading-[0.98] tracking-[-0.045em]">
          See the shape of your JSON.
        </h1>
        <p
          style={{ "--i": 2 } as React.CSSProperties}
          className="vf-enter mx-auto mb-[30px] max-w-[46ch] text-lg text-vf-dim"
        >
          Paste any JSON and get a graph you can search, collapse and export.
          Nothing to install, no account needed.
        </p>
        <div
          style={{ "--i": 3 } as React.CSSProperties}
          className="vf-enter flex flex-wrap items-center justify-center gap-3"
        >
          <Btn href="/editor" size="lg">
            Open the editor
          </Btn>
          <Btn href="#how" size="lg" variant="line">
            How it works
          </Btn>
        </div>
      </header>

      {/* On screen at load, so it joins the entrance instead of the scroll reveal. */}
      <div
        style={{ "--i": 5 } as React.CSSProperties}
        className={`vf-enter ${WRAP}`}
      >
        <div className="overflow-hidden rounded-xl border border-vf-line bg-vf-bg2 shadow-[0_40px_120px_-40px_rgba(200,241,105,0.16)]">
          <HeroDemo />
        </div>
      </div>
    </>
  );
}
