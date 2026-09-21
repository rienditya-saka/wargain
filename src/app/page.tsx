import { Navbar } from "@/components/sections/navbar";
import { HeroSection } from "@/components/sections/hero";
import { TickerNewsSection } from "@/components/sections/ticker-news";
import { WargaCommerceSection } from "@/components/sections/warga-commerce";
import { BentoValuePropSection } from "@/components/sections/bento-value-prop";
import { TestimonialsSection } from "@/components/sections/testimonials";
import { OnboardingSection } from "@/components/sections/onboarding";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <TickerNewsSection />
        <WargaCommerceSection />
        <BentoValuePropSection />
        <TestimonialsSection />
        <OnboardingSection />
      </main>
      <Footer />
    </div>
  );
}
