import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Criterion } from "@/lib/cv.functions";
import type { Job } from "@/lib/data";

export function JobDialog({ job, trigger }: { job?: Job; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(job?.title ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [criteria, setCriteria] = useState<Criterion[]>(job?.criteria ?? []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  function addCriterion(importance: Criterion["importance"]) {
    const label = draft.trim();
    if (!label) return;
    setCriteria((c) => [...c, { id: crypto.randomUUID(), label, importance }]);
    setDraft("");
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Give the job a title");
      return;
    }
    setBusy(true);
    const payload = { title: title.trim(), description, criteria: criteria as never };
    if (job) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", job.id);
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Job updated — re-score CVs to apply new criteria");
      qc.invalidateQueries({ queryKey: ["job", job.id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("jobs")
        .insert({ ...payload, created_by: u.user?.id ?? null })
        .select("id")
        .single();
      setBusy(false);
      if (error || !data) {
        toast.error(error?.message ?? "Could not create job");
        return;
      }
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
      navigate({ to: "/jobs/$jobId", params: { jobId: data.id } });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">{job ? "Edit job" : "New job"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Job title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Job description</span>
            <Textarea rows={7} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the full job description…" />
          </label>
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Your criteria</span>
            <div className="flex flex-wrap gap-2">
              {criteria.map((c) => (
                <span key={c.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${c.importance === "must" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  <span className="opacity-70">{c.importance === "must" ? "Must" : "Nice"}</span> {c.label}
                  <button type="button" aria-label="Remove" onClick={() => setCriteria((x) => x.filter((y) => y.id !== c.id))}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {criteria.length === 0 && <span className="text-xs text-muted-foreground">e.g. “5+ years React”, “Fluent English”, “Based in Ho Chi Minh City”</span>}
            </div>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCriterion("must");
                  }
                }}
                placeholder="Add a requirement…"
              />
              <Button type="button" variant="glow" size="sm" className="h-9" onClick={() => addCriterion("must")}><Plus /> Must</Button>
              <Button type="button" variant="glass" size="sm" className="h-9" onClick={() => addCriterion("nice")}><Plus /> Nice</Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="glass" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="pill" onClick={save} disabled={busy}>{job ? "Save changes" : "Create job"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
