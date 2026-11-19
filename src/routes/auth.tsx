import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { LoginScene } from "@/components/app/login-scene";
import { GoogleButton } from "@/components/app/google-button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Lens CV Screening Studio" },
      { name: "description", content: "Sign in to your private CV screening workspace." },
      { property: "og:title", content: "Sign in — Lens CV Screening Studio" },
      { property: "og:description", content: "Sign in to your private CV screening workspace." },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "h-11 w-full rounded-full bg-pill px-5 text-sm text-pill-foreground placeholder:text-pill-foreground/45 outline-none ring-0 focus:ring-2 focus:ring-primary-glow transition";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/jobs" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/jobs" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your inbox.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/jobs" });
  }

  const title = mode === "signin" ? "LOGIN" : mode === "signup" ? "REGISTER" : "RESET";
  const sub =
    mode === "signin" ? "Enter your credentials to login" : mode === "signup" ? "Create your account" : "We'll email you a reset link";

  return (
    <LoginScene>
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="font-display text-3xl font-semibold tracking-tight"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        <p className="mt-2 text-sm opacity-80">{sub}</p>
      </div>

      {mode !== "forgot" && (
        <div className="mx-auto mt-7 flex w-fit rounded-full bg-pill/25 p-1 text-xs">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="relative rounded-full px-4 py-1.5 font-medium transition-colors"
            >
              {mode === m && (
                <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-pill" transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
              )}
              <span className={`relative ${mode === m ? "text-pill-foreground" : "opacity-80"}`}>
                {m === "signin" ? "Sign in" : "Register"}
              </span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium">Email</span>
          <input className={inputCls} type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== "forgot" && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium">Password</span>
            <span className="relative block">
              <input
                className={inputCls + " pr-12"}
                type={show ? "text" : "password"}
                required
                minLength={6}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-pill-foreground/60">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
        )}
        {mode === "signin" && (
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 opacity-90">
              <input type="checkbox" defaultChecked className="size-3.5 accent-primary" /> Remember me
            </label>
            <button type="button" onClick={() => setMode("forgot")} className="font-semibold hover:underline">
              Forgot Password?
            </button>
          </div>
        )}
        <Button type="submit" variant="login" className="mt-4 h-11 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {mode === "signin" ? "Login" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      {mode !== "forgot" ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs opacity-70">
            <span className="h-px flex-1 bg-login-foreground/30" /> or <span className="h-px flex-1 bg-login-foreground/30" />
          </div>
          <GoogleButton onClick={google} />
        </>
      ) : (
        <p className="mt-6 text-center text-sm">
          <button type="button" onClick={() => setMode("signin")} className="font-semibold underline">Back to login</button>
        </p>
      )}
      <p className="mt-6 text-center text-xs opacity-70">
        Private workspace · <Link to="/" className="underline">About Lens</Link>
      </p>
    </LoginScene>
  );
}
