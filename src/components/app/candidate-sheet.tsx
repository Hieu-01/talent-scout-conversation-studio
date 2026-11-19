import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, Download, Save, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Candidate } from "@/lib/data";
import { ScoreRing } from "./score-ring";

type Form = { full_name: string; email: string; phone: string; location: string; headline: string; years_experience: string; skills: string; notes: string };

export function CandidateSheet({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const qc = useQueryClient();

  const [f, setF] = useState<Partial<Form>>({});
  useEffect(() => {
    if (!candidate) return;
    setF({
      full_name: candidate.full_name ?? "",
      email: candidate.email ?? "",
      phone: candidate.phone ?? "",
      location: candidate.location ?? "",
      headline: candidate.headline ?? "",
      years_experience: candidate.years_experience?.toString() ?? "",
      skills: candidate.skills.join(", "),
      notes: candidate.notes ?? "",
    });
  }, [candidate]);
  if (!candidate) return <Sheet open={false} />;
  const c = candidate;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["candidates", c.job_id] });
    qc.invalidateQueries({ queryKey: ["job-counts"] });
  };

  async function save() {
    const { error } = await supabase
      .from("candidates")
      .update({
        full_name: f.full_name || null,
        email: f.email || null,
        phone: f.phone || null,
        location: f.location || null,
        headline: f.headline || null,
        years_experience: f.years_experience ? Number(f.years_experience) : null,
        skills: (f.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        notes: f.notes || null,
      })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    refresh();
  }
  async function download() {
    if (!c.file_path) return;
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(c.file_path, 300);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }
  async function remove() {
    const { error } = await supabase.from("candidates").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (c.file_path) await supabase.storage.from("cvs").remove([c.file_path]);
    toast.success("Candidate deleted");
    refresh();
    onClose();
  }

  const field = (key: keyof Form, label: string, type = "text") => (
    <label className="block space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Input type={type} value={f[key] ?? ""} onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))} />
    </label>
  );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="glass-strong w-full overflow-y-auto border-l-border sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <ScoreRing score={c.score} size={64} />
            <div>
              <SheetTitle className="text-2xl font-light">{c.full_name || c.file_name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{c.headline}</p>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          {c.error && <p className="rounded-xl bg-destructive/15 p-3 text-xs text-destructive">{c.error}</p>}
          {c.score_reason && <p className="text-sm text-muted-foreground">{c.score_reason}</p>}

          {c.criteria_results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Criteria</h3>
              {c.criteria_results.map((r) => (
                <div key={r.label} className="flex gap-3 rounded-2xl glass p-3">
                  {r.status === "met" ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : r.status === "partial" ? <CircleDashed className="size-4 shrink-0 text-warning" /> : <XCircle className="size-4 shrink-0 text-destructive" />}
                  <div>
                    <p className="text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {c.summary && (
            <div>
              <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Summary</h3>
              <p className="text-sm">{c.summary}</p>
            </div>
          )}

          {c.experience.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Experience</h3>
              <ul className="space-y-2 border-l border-border pl-4">
                {c.experience.map((e, i) => (
                  <li key={i} className="text-sm">
                    {e.title} <span className="text-muted-foreground">· {e.company}</span>
                    {e.period && <span className="block text-[11px] text-muted-foreground">{e.period}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {field("full_name", "Name")}
              {field("headline", "Headline")}
              {field("email", "Email", "email")}
              {field("phone", "Phone")}
              {field("location", "Location")}
              {field("years_experience", "Years of experience", "number")}
            </div>
            {field("skills", "Skills (comma separated)")}
            <label className="block space-y-1">
              <span className="text-[11px] text-muted-foreground">Notes</span>
              <Textarea rows={3} value={f.notes ?? ""} onChange={(e) => setF((x) => ({ ...x, notes: e.target.value }))} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="pill" onClick={save}><Save /> Save</Button>
            {c.file_path && <Button variant="glass" onClick={download}><Download /> Open CV</Button>}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="ml-auto text-destructive"><Trash2 /> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-strong">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
                  <AlertDialogDescription>This permanently removes their details and CV file.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
