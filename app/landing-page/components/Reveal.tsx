import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fades content up as it scrolls into view. CSS only (see `.vf-reveal` in
 * styles/main.css), so content is always visible if scripts fail to load, the
 * browser lacks scroll-driven animations, or the user prefers reduced motion.
 */
export default function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("vf-reveal", className)}>{children}</div>;
}
