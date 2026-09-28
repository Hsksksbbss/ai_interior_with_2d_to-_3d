import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";
import { OtpAuthCard } from "@/components/auth/otp-auth-card";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login — DesignAI" },
      { name: "description", content: "Sign in to DesignAI with a one-time code sent to your email." },
      { property: "og:title", content: "Login — DesignAI" },
      { property: "og:description", content: "Sign in to continue designing your dream home." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout caption="Your plans, rooms and 3D homes — right where you left them.">
      <OtpAuthCard
        mode="login"
        title="Welcome Back"
        subtitle="Sign in to continue designing your dream home."
        verifyLabel="Verify & Continue"
      />
    </AuthLayout>
  );
}
