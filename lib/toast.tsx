"use client";
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { Check, CircleAlert, Info } from "lucide-react";
import React from "react";

type Tone = "success" | "error" | "info";

const icons: Record<Tone, React.ReactNode> = {
  success: <Check className="size-[15px] text-vf-acc" strokeWidth={2.5} />,
  error: <CircleAlert className="size-[15px] text-vf-err" strokeWidth={2.2} />,
  info: <Info className="size-[15px] text-vf-dim" strokeWidth={2.2} />,
};

/**
 * One compact line: an icon that carries the meaning, then the message.
 * No "Success"/"Error" heading; the icon and wording already say it.
 */
function show(tone: Tone, message: string, options?: ExternalToast) {
  return sonnerToast.custom(
    () => (
      <div
        role={tone === "error" ? "alert" : "status"}
        data-tone={tone}
        className="vf-toast ml-auto flex w-fit max-w-[420px] items-start gap-2.5 rounded-[9px] border border-vf-line bg-vf-panel px-3.5 py-2.5 font-vf-sans text-[13.5px] leading-[1.45] text-vf-text shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
      >
        <span className="mt-[2.5px] shrink-0">{icons[tone]}</span>
        <span>{message}</span>
      </div>
    ),
    { duration: tone === "error" ? 4500 : 3000, ...options }
  );
}

export const successToast = (message: string, options?: ExternalToast) =>
  show("success", message, options);

export const errorToast = (message: string, options?: ExternalToast) =>
  show("error", message, options);

export const infoToast = (message: string, options?: ExternalToast) =>
  show("info", message, options);

// Re-export the original toast for other use cases
export const toast = sonnerToast;
