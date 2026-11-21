import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import Header from "./landing-page/components/Header";
import Hero from "./landing-page/components/Hero";
import Features from "./landing-page/components/Features";
import HowItWorks from "./landing-page/components/HowItWorks";
import Pricing from "./landing-page/components/Pricing";
import Footer from "./landing-page/components/Footer";

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

export default function LandingPage() {
  return (
    <div
      className={`${interTight.variable} ${jetbrainsMono.variable} min-h-screen scroll-smooth bg-vf-bg font-vf-sans text-base leading-[1.55] text-vf-text antialiased`}
    >
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
