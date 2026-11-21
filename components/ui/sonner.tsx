"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

/** Toast container. Individual toasts are drawn by lib/toast.tsx. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    // Top right, just under the top bar. It's the one corner of the editor
    // with nothing in it: the view switcher is top-left and the zoom buttons,
    // legend and status bar run along the bottom.
    position="top-right"
    offset={{ top: 60, right: 16 }}
    visibleToasts={3}
    {...props}
  />
);

export { Toaster };
