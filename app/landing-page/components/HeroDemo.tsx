"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's demo clips: silent, looping, recorded from the real editor
 * (scripts/record-demo.mjs).
 *
 * There are two, and CSS shows one of them:
 * - wide screens get the whole editor (code, views, inspector), in a small
 *   or large file depending on the screen's pixel density;
 * - phones get a tall close-up (code above its graph), because the whole
 *   editor shrunk to phone width can't be read.
 *
 * Each clip's poster is its first frame. That's what shows while the video
 * loads, and all that shows without JavaScript, when autoplay is refused, or
 * for anyone who asks their device for reduced motion. No video file is
 * fetched until this component decides which one this screen needs.
 */

const DESKTOP_LABEL =
  "A short tour of the editor: JSON on the left and its graph in the middle; a node is selected, which highlights its lines in the code and opens the inspector on the right; then the same file is shown as a tree and as a 3D model.";
const PHONE_LABEL =
  "A short tour: a few lines of JSON above the graph they become; nodes are selected, which highlights their lines in the code; then the same file is shown as a tree and as a 3D model.";

const WIDE = "(min-width: 768px)";
/** Screens dense enough to benefit from the 2400px file. */
const DENSE = "(min-resolution: 1.5dppx)";

export default function HeroDemo() {
  const desktop = useRef<HTMLVideoElement>(null);
  const phone = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      const active = wide.matches ? desktop.current : phone.current;
      const idle = wide.matches ? phone.current : desktop.current;
      idle?.pause();
      if (!active) return;

      if (reduce.matches) {
        active.pause();
        return; // poster only; nothing is downloaded
      }
      if (!active.getAttribute("src")) {
        active.src = wide.matches
          ? window.matchMedia(DENSE).matches
            ? "/demos/editor-demo.mp4"
            : "/demos/editor-demo-small.mp4"
          : "/demos/editor-demo-phone.mp4";
      }
      // Autoplay can be refused (e.g. data saver); the poster stays instead.
      active.play().catch(() => {});
    };

    sync();
    wide.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
    };
  }, []);

  const shared = {
    muted: true,
    loop: true,
    playsInline: true,
    preload: "none" as const,
  };

  return (
    <>
      <video
        ref={desktop}
        {...shared}
        className="hidden h-auto w-full md:block"
        width={1600}
        height={1000}
        poster="/demos/editor-demo-poster.jpg"
        aria-label={DESKTOP_LABEL}
        data-clip="desktop"
      />
      <video
        ref={phone}
        {...shared}
        className="block h-auto w-full md:hidden"
        width={1050}
        height={1600}
        poster="/demos/editor-demo-phone-poster.jpg"
        aria-label={PHONE_LABEL}
        data-clip="phone"
      />
    </>
  );
}
