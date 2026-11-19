import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Columns3, Pencil, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { JobDialog } from "@/components/app/job-dialog";
import { UploadZone } from "@/components/app/upload-zone";
import { CandidateSheet } from "@/components/app/candidate-sheet";
import { CompareOverlay } from "@/components/app/compare-sheet";
import { ScoreRing } from "@/components/app/score-ring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { candidatesQuery, jobQuery, useMe, type Candidate } from "@/lib/data";
import { analyzeCandidate } from "@/lib/cv.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job workspace — Lens" },
      { name: "description", content: "Ranked candidates, filters and your AI copilot for this role." },
      { property: "og:title", content: "Job workspace — Lens" },
      { property: "og:description", content: "Ranked candidates, filters and your AI copilot for this role." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { jobId } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeCandidate);
  const { data: job } = useQuery({ ...jobQuery(jobId), enabled: !!me?.hasAccess });
  const { data: candidates = [] } = useQuery({
    ...candidatesQuery(jobId),
    enabled: !!me?.hasAccess,
    refetchInterval: (q) => ((q.state.data ?? []).some((c) => c.status === "processing") ? 3000 : false),
  });
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [mustOnly, setMustOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const mustLabels = useMemo(() => (job?.criteria ?? []).filter((c) => c.importance === "must").map((c) => c.label), [job]);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return candidates.filter((c) => {
      if ((c.score ?? 0) < minScore && c.status === "ready") return false;
      if (s && ![c.full_name, c.headline, c.location, c.summary, ...c.skills].join(" ").toLowerCase().includes(s)) return false;
      if (mustOnly && mustLabels.some((l) => c.criteria_results.find((r) => r.label === l)?.status !== "met")) return false;
      return true;
    });
  }, [candidates, q, minScore, mustOnly, mustLabels]);
  const open = candidates.find((c) => c.id === openId) ?? null;
  const compareItems = comparing ? candidates.filter((c) => selected.includes(c.id)) : [];

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]));
  }

  async function rescore(list: Candidate[]) {
    setRescoring(true);
    const ids = list.filter((c) => c.raw_text).map((c) => c.id);
    await supabase.from("candidates").update({ status: "processing" }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["candidates", jobId] });
    const queue = [...ids];
    const worker = async () => {
      while (queue.length) await analyze({ data: { candidateId: queue.shift()! } }).catch(() => null);
    };
    await Promise.all([worker(), worker(), worker()]);
    setRescoring(false);
    qc.invalidateQueries({ queryKey: ["candidates", jobId] });
    toast.success("Re-scoring finished");
  }

  const ready = candidates.filter((c) => c.status === "ready");
  const avg = ready.length ? Math.round(ready.reduce((a, c) => a + (c.score ?? 0), 0) / ready.length) : 0;

  return (
    <AppShell footer={`${String(candidates.length).padStart(2, "0")} — ${job?.title ?? "Job"}`}>
      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 md:px-8 xl:grid-cols-[1fr_440px]">
        <section className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to="/jobs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3" /> All jobs</Link>
              <h1 className="mt-3 text-4xl font-light">{job?.title}</h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job?.criteria.map((c) => (
                  <span key={c.id} className={cn("rounded-full px-2.5 py-0.5 text-[11px]", c.importance === "must" ? "bg-primary text-primary-foreground" : "bg-secondary")}>{c.label}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {job && <JobDialog job={job} trigger={<Button variant="glass" size="sm"><Pencil /> Edit job</Button>} />}
              <Button variant="glass" size="sm" disabled={rescoring || ready.length === 0} onClick={() => rescore(candidates)}>
                <RefreshCw className={cn(rescoring && "animate-spin")} /> Re-score all
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[["Candidates", candidates.length], ["Average score", avg || "–"], ["Strong fits (75+)", ready.filter((c) => (c.score ?? 0) >= 75).length]].map(([l, v]) => (
              <div key={l} className="rounded-2xl glass p-4">
                <p className="text-3xl font-light tabular-nums">{v}</p>
                <p className="text-[11px] text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>

          <UploadZone jobId={jobId} />

          <div className="flex flex-wrap items-center gap-3 rounded-2xl glass p-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, skill, location…" className="border-0 bg-transparent pl-9" />
            </div>
            <div className="flex w-48 items-center gap-3 text-xs text-muted-foreground">
              Min {minScore}
              <Slider value={[minScore]} onValueChange={(v) => setMinScore(v[0] ?? 0)} max={100} step={5} />
            </div>
            {mustLabels.length > 0 && (
              <Button size="sm" variant={mustOnly ? "glow" : "glass"} onClick={() => setMustOnly((m) => !m)}>All must-haves met</Button>
            )}
            <Button size="sm" variant="pill" disabled={selected.length < 2} onClick={() => setComparing(true)}>
              <Columns3 /> Compare {selected.length > 0 && `(${selected.length})`}
            </Button>
          </div>

          <ul className="space-y-2">
            {filtered.map((c, i) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className={cn("group flex items-center gap-4 rounded-2xl glass p-4 transition hover:-translate-y-0.5 hover:bg-accent", selected.includes(c.id) && "glow")}
              >
                <input type="checkbox" aria-label="Select to compare" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-primary" />
                <button type="button" onClick={() => setOpenId(c.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <span className="w-6 text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <ScoreRing score={c.status === "ready" ? c.score : null} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.full_name || c.file_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.status === "processing" ? "Reading and scoring…" : c.status === "error" ? c.error : [c.headline, c.years_experience != null && `${c.years_experience} yrs`, c.location].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="hidden max-w-[40%] flex-wrap justify-end gap-1 md:flex">
                    {c.criteria_results.slice(0, 4).map((r) => (
                      <span key={r.label} title={r.reason} className={cn("size-2 rounded-full", r.status === "met" ? "bg-success" : r.status === "partial" ? "bg-warning" : "bg-destructive")} />
                    ))}
                  </span>
                </button>
                {c.status === "error" && c.raw_text && (
                  <Button size="xs" variant="glass" onClick={() => rescore([c])}>Retry</Button>
                )}
              </motion.li>
            ))}
            {candidates.length > 0 && filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No candidates match these filters.</p>}
            {candidates.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No CVs yet — upload some above.</p>}
          </ul>
        </section>

        <aside className="xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]">
          <Outlet />
        </aside>
      </div>
      <CandidateSheet candidate={open} onClose={() => setOpenId(null)} />
      <CompareOverlay items={compareItems} onClose={() => setComparing(false)} />
    </AppShell>
  );
}
