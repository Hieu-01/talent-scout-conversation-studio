import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoginScene } from "@/components/app/login-scene";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Lens" },
      { name: "description", content: "Choose a new password for your Lens account." },
      { property: "og:title", content: "Reset password — Lens" },
      { property: "og:description", content: "Choose a new password for your Lens account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/jobs" });
  }
  return (
    <LoginScene>
      <h1 className="text-center font-display text-3xl font-semibold">NEW PASSWORD</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="password"
          required
          minLength={6}
          placeholder="Enter a new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 w-full rounded-full bg-pill px-5 text-sm text-pill-foreground outline-none focus:ring-2 focus:ring-primary-glow"
        />
        <Button type="submit" variant="login" className="h-11 w-full" disabled={busy}>Update password</Button>
      </form>
    </LoginScene>
  );
}
