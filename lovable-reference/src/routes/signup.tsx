import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";
import { OtpAuthCard } from "@/components/auth/otp-auth-card";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your account — DesignAI" },
      {
        name: "description",
        content: "Create a DesignAI account and start generating AI interior designs in 2D and 3D.",
      },
      { property: "og:title", content: "Create your DesignAI account" },
      {
        property: "og:description",
        content: "Start creating intelligent interior designs with AI.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthLayout caption="From room requirements to an interactive 3D home — in minutes.">
      <OtpAuthCard
        mode="signup"
        title="Create Your DesignAI Account"
        subtitle="Start creating intelligent interior designs with AI."
        verifyLabel="Create Account"
      />
    </AuthLayout>
  );
}
