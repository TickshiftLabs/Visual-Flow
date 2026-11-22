import { cn } from "@/lib/utils";

/** The Visual Flow mark: one point branching out to two. Coloured by `currentColor`. */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  /** Draws itself once on load (see .vf-logo-draw in main.css). */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      aria-hidden="true"
      className={cn("size-5", animated && "vf-logo-draw", className)}
    >
      <path pathLength={1} d="M8 16C16 16 14 7.5 23 7.5" />
      <path pathLength={1} d="M8 16C16 16 14 24.5 23 24.5" />
      <g fill="currentColor" stroke="none">
        <circle cx="6.5" cy="16" r="3.6" />
        <circle className="vf-logo-end" cx="25" cy="7.5" r="3.6" />
        <circle className="vf-logo-end" cx="25" cy="24.5" r="3.6" />
      </g>
    </svg>
  );
}

/** Mark plus the product name, as used in the site and editor headers. */
export default function Logo({
  className,
  animated = false,
  wordClassName,
}: {
  className?: string;
  animated?: boolean;
  /** Classes for the name, e.g. to hide it where space is tight. */
  wordClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 font-semibold tracking-[-0.01em] text-vf-text",
        className
      )}
    >
      <LogoMark className="text-vf-acc" animated={animated} />
      <span className={wordClassName}>Visual Flow</span>
    </span>
  );
}
