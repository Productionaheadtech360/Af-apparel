export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import TrustStrip from "@/components/home/TrustStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import HowItWorks from "@/components/home/HowItWorks";
import WhoWeServe from "@/components/home/WhoWeServe";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import Certifications from "@/components/home/Certifications";
import FaqSection from "@/components/home/FaqSection";
import CtaSection from "@/components/home/CtaSection";
import { productsService } from "@/services/products.service";

export default async function HomePage() {
  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    categories = await productsService.getCategories();
  } catch {
    // Backend unreachable from SSR
  }

  return (
    <>
      <Header />
      <main style={{ fontFamily: "var(--font-jakarta)" }}>
        <HeroSection />
        <TrustStrip />
        <CategoryGrid categories={categories} />
        <HowItWorks />
        <WhoWeServe />
        <WhyChooseUs />
        <Certifications />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
