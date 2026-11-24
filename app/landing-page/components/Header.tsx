"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { LAB_NAME, LAB_URL, SUPPORT_URL } from "@/constants/site";
import { Btn, GITHUB_URL, WRAP } from "./parts";

const links = [
  { href: "#features", label: "Features" },
  { href: "#views", label: "Views" },
  { href: "#how", label: "How it works" },
  { href: "#free", label: "Free" },
];

const linkClass =
  "hidden text-vf-dim transition-colors hover:text-vf-text md:block";

export default function Header() {
  // The resting look is set inline, not with Tailwind utilities: this project
  // marks utilities !important, which would stop the scroll animation
  // (.vf-nav in main.css) from fading the bar in over the hero.
  return (
    <nav
      className="vf-nav sticky top-0 z-50"
      style={{
        borderBottom: "1px solid #1c1f23",
        backgroundColor: "rgba(11, 12, 14, 0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className={`${WRAP} flex h-[60px] items-center gap-7 text-sm`}>
        {/* Already on this page, so the link alone wouldn't move anything. */}
        <div className="mr-auto flex items-center gap-3">
          <Link href="/" onClick={() => window.scrollTo({ top: 0 })}>
            <Logo animated />
          </Link>
          {/* Who makes it. Hidden on the narrowest screens, where the footer says it instead. */}
          <a
            href={LAB_URL}
            className="hidden whitespace-nowrap text-[13px] text-vf-dim transition-colors hover:text-vf-text sm:block"
          >
            by {LAB_NAME}
          </a>
        </div>

        {links.map((l) => (
          <a key={l.href} href={l.href} className={linkClass}>
            {l.label}
          </a>
        ))}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          GitHub
        </a>
        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          Support
        </a>

        <Btn href="/editor">Open editor</Btn>
      </div>
    </nav>
  );
}
