"use client";

import type React from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";

/** Toast container. Individual toasts are drawn by lib/toast.tsx. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="dark"
    // Bottom centre, lifted above the editor's status bar and zoom buttons.
    // The top-left holds the view switcher and the right side the inspector.
    position="bottom-center"
    offset={92}
    // Column width; matches the widest a toast can be (see lib/toast.tsx).
    style={{ "--width": "420px" } as React.CSSProperties}
    visibleToasts={3}
    {...props}
  />
);

export { Toaster };
