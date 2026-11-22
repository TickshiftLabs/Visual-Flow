import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Paste or import JSON and explore it as a graph, a tree or in 3D. Everything stays in your browser.",
  alternates: { canonical: "/editor" },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
