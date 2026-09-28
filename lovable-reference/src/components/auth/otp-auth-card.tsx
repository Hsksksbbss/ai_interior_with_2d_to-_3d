import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";

const RESEND_SECONDS = 45;

type Props = {
  mode: "login" | "signup";
  title: string;
  subtitle: string;
  verifyLabel: string;
};

export function OtpAuthCard({ mode, title, subtitle, verifyLabel }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function sendCode(isResend = false) {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: mode === "signup" },
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setStep("code");
    setCooldown(RESEND_SECONDS);
    toast.success(isResend ? "New code sent." : `Code sent to ${trimmed}.`);
  }

  async function verify() {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    setBusy(false);

    if (error || !data.session) {
      toast.error(error?.message ?? "That code didn't work. Try again.");
      return;
    }
    toast.success("You're in.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="w-full max-w-md">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Home
      </Link>

      <div className="rounded-3xl border border-border bg-card p-7 shadow-soft sm:p-9">
        <span className="grid size-11 place-items-center rounded-2xl gradient-brand shadow-glow">
          {step === "email" ? (
            <Mail className="size-5 text-primary-foreground" />
          ) : (
            <ShieldCheck className="size-5 text-primary-foreground" />
          )}
        </span>

        <h1 className="mt-5 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

        {step === "email" ? (
          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null} Send OTP
            </Button>
          </form>
        ) : (
          <div className="mt-7 space-y-5">
            <p className="text-sm text-foreground">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-gradient">{email}</span>.
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={() => void verify()}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin" /> : null} {verifyLabel}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => void sendCode(true)}
                >
                  Resend OTP
                </button>
              )}
            </div>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStep("email");
                setCode("");
              }}
            >
              Use a different email
            </button>
          </div>
        )}

        <p className="mt-7 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Login
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
