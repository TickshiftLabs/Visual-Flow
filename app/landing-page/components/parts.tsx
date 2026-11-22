import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Small monospace label used for section numbers, tags and metadata. */
export function Mono({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-vf-mono text-[12.5px] tracking-[0.02em] text-vf-dim",
        className
      )}
    >
      {children}
    </span>
  );
}

interface BtnProps {
  href: string;
  children: ReactNode;
  variant?: "solid" | "line";
  size?: "md" | "lg";
  external?: boolean;
  className?: string;
}

export function Btn({
  href,
  children,
  variant = "solid",
  size = "md",
  external,
  className,
}: BtnProps) {
  const classes = cn(
    "inline-block rounded-[7px] font-semibold transition duration-150 hover:-translate-y-px",
    size === "lg" ? "px-[22px] py-[13px] text-[15px]" : "px-4 py-2.5 text-sm",
    variant === "solid"
      ? "bg-vf-acc text-vf-bg hover:brightness-110"
      : "border border-vf-line text-vf-text hover:border-[#4a5058]",
    className
  );

  if (external || href.startsWith("#")) {
    return (
      <a
        href={href}
        className={classes}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/** Numbered section heading: mono label on the left, title on the right. */
export function SectionHead({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-10 grid items-baseline gap-x-6 gap-y-3 md:grid-cols-[180px_1fr]">
      <Mono>{label}</Mono>
      <h2 className="max-w-[20ch] text-[clamp(28px,4vw,40px)] font-semibold leading-[1.08] tracking-[-0.03em]">
        {children}
      </h2>
    </div>
  );
}

export const WRAP = "mx-auto w-full max-w-[1120px] px-6";
export { GITHUB_URL } from "@/constants/site";
