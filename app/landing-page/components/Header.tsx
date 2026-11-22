"use client";

import Link from "next/link";
import { useSupabase } from "@/components/Auth/SupabaseProvider";
import Logo from "@/components/Logo";
import { Btn, GITHUB_URL, WRAP } from "./parts";

const links = [
  { href: "#features", label: "Features" },
  { href: "#views", label: "Views" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

const linkClass =
  "hidden text-vf-dim transition-colors hover:text-vf-text md:block";

export default function Header() {
  const { user, isLoading } = useSupabase();

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
        <Link href="/" className="mr-auto">
          <Logo animated />
        </Link>

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
        {!isLoading &&
          (user ? (
            <Link href="/protected/settings" className={linkClass}>
              Account
            </Link>
          ) : (
            <Link href="/auth/login" className={linkClass}>
              Sign in
            </Link>
          ))}

        <Btn href="/editor">Open editor</Btn>
      </div>
    </nav>
  );
}
