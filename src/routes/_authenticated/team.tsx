import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMe } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — Lens CV Screening Studio" },
      { name: "description", content: "Give teammates access to your CV screening workspace." },
      { property: "og:title", content: "Team — Lens CV Screening Studio" },
      { property: "og:description", content: "Give teammates access to your CV screening workspace." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const { data: invites = [] } = useQuery({
    queryKey: ["invites"],
    enabled: !!me?.isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.from("team_invites").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    enabled: !!me?.isOwner,
    queryFn: async () => (await supabase.from("profiles").select("email")).data ?? [],
  });
  const joined = new Set(profiles.map((p) => p.email.toLowerCase()));

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("team_invites").insert({ email: email.trim().toLowerCase(), invited_by: me?.id ?? null });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Already invited" : error.message);
      return;
    }
    toast.success("Access granted — they can sign up or sign in with that email.");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["invites"] });
  }
  async function revoke(id: string) {
    const { error } = await supabase.from("team_invites").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Access removed");
    qc.invalidateQueries({ queryKey: ["invites"] });
  }

  return (
    <AppShell footer="02 — Team">
      <section className="mx-auto max-w-3xl px-5 py-10">
        <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Access</span>
        <h1 className="mt-4 text-4xl font-light">Team</h1>
        {!me?.isOwner ? (
          <p className="mt-4 text-sm text-muted-foreground">Only the workspace owner can manage access.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">People you add here share all jobs, candidates and chats.</p>
            <form onSubmit={invite} className="mt-8 flex gap-2">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
              <Button variant="pill" type="submit"><UserPlus /> Give access</Button>
            </form>
            <div className="mt-6 divide-y divide-border rounded-3xl glass">
              <div className="flex items-center justify-between p-4 text-sm">
                <span>{me.email}</span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">Owner</span>
              </div>
              {invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-4 text-sm">
                  <span>{i.email}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground">{joined.has(i.email.toLowerCase()) ? "Active" : "Not signed up yet"}</span>
                    <Button size="icon-sm" variant="ghost" aria-label="Remove access" onClick={() => revoke(i.id)}><Trash2 /></Button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
