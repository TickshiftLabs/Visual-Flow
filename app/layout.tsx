import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "@/styles/main.css";
import { Toaster } from "@/components/ui/sonner";
import { SupabaseProvider } from "@/components/Auth/SupabaseProvider";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Visual Flow - Data Visualizer",
  description: "A modern data visualization tool",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
        <Toaster />
      </body>
    </html>
  );
}
