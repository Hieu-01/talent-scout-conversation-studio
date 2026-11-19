import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NameDialog } from "./name-dialog";

export function AppShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editName, setEditName] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navCls = "rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground";
  const activeCls = "!text-foreground bg-accent";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/50 bg-background/40 px-5 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-8">
          <Link to="/jobs"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/jobs" className={navCls} activeProps={{ className: activeCls }}>Jobs</Link>
            {me?.isOwner && (
              <Link to="/team" className={navCls} activeProps={{ className: activeCls }}>Team</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditName(true)}
            title={me?.email ? `${me.email} · click to change your name` : undefined}
            className="hidden items-center gap-2 rounded-full glass px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground sm:flex"
          >
            <span className="size-1.5 rounded-full bg-success" /> {me?.displayName ?? me?.email}
          </button>
          <Button size="sm" variant="glow" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1">
        {isLoading ? null : me && !me.hasAccess ? <NoAccess email={me.email} /> : children}
      </main>
      {me && (
        <NameDialog
          userId={me.id}
          required={!me.displayName}
          open={!me.displayName || editName}
          initial={me.displayName}
          onOpenChange={setEditName}
        />
      )}
      <footer className="flex items-center justify-between px-6 py-3 text-[11px] text-muted-foreground md:px-8">
        <span>{footer ?? "01 — Lens Studio"}</span>
        <span>Saved automatically</span>
      </footer>
    </div>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <ShieldAlert className="mx-auto size-10 text-primary-glow" />
        <h1 className="mt-4 text-2xl font-light">Waiting for access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're signed in as <span className="text-foreground">{email}</span>. Ask the workspace owner to add this email on their Team page, then refresh.
        </p>
      </div>
    </div>
  );
}
