import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { AiTools } from "@/components/landing/ai-tools";
import { TwoToThree, HowItWorks, WhyUs, FinalCta } from "@/components/landing/sections";

const TITLE = "DesignAI — AI Interior Design, 2D Floor Plans & 3D Homes";
const DESC =
  "Plan rooms in 2D, see them in 3D and restyle walls, furniture and decor with AI. Sign in with just your email.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <AiTools />
        <TwoToThree />
        <HowItWorks />
        <WhyUs />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
