"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import type { ReactNode } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Shown above the enlarged image. */
  title: string;
  /** The thumbnail (or anything else) that opens the lightbox when pressed. */
  children: ReactNode;
}

/**
 * Opens an image full screen. The image is shown taller than a phone is
 * wide, so a wide picture can be panned sideways instead of being shrunk.
 */
export default function ImageLightbox({
  src,
  alt,
  width,
  height,
  title,
  children,
}: ImageLightboxProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[61] flex flex-col font-vf-sans text-vf-text outline-none"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Dialog.Title className="font-vf-mono text-xs text-vf-dim">
              {title}
            </Dialog.Title>
            <Dialog.Close className="cursor-pointer rounded-md border border-vf-line bg-vf-panel px-3 py-1.5 font-vf-mono text-xs text-vf-text">
              close ✕
            </Dialog.Close>
          </div>
          {/* Scrolls both ways; the image keeps its height so text stays readable. */}
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-4">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              sizes="200vw"
              className="h-[min(72vh,620px)] w-auto max-w-none rounded-lg border border-vf-line"
            />
          </div>
          <p className="pb-4 text-center font-vf-mono text-xs text-vf-dim">
            drag to look around
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
