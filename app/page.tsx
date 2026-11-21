import Header from "./landing-page/components/Header";
import Hero from "./landing-page/components/Hero";
import Features from "./landing-page/components/Features";
import Views from "./landing-page/components/Views";
import HowItWorks from "./landing-page/components/HowItWorks";
import Pricing from "./landing-page/components/Pricing";
import Footer from "./landing-page/components/Footer";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen scroll-smooth bg-vf-bg font-vf-sans text-base leading-[1.55] text-vf-text antialiased"
    >
      <Header />
      <main>
        <Hero />
        <Features />
        <Views />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
