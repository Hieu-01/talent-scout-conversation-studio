import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { JobDialog } from "@/components/app/job-dialog";
import { Button } from "@/components/ui/button";
import { jobCountsQuery, jobsQuery, useMe } from "@/lib/data";
import stack from "@/assets/cv-stack.jpg";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({
    meta: [
      { title: "Jobs — Lens CV Screening Studio" },
      { name: "description", content: "Your open roles and their ranked candidate pipelines." },
      { property: "og:title", content: "Jobs — Lens CV Screening Studio" },
      { property: "og:description", content: "Your open roles and their ranked candidate pipelines." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { data: me } = useMe();
  const { data: jobs = [], isLoading } = useQuery({ ...jobsQuery, enabled: !!me?.hasAccess });
  const { data: counts = {} } = useQuery({ ...jobCountsQuery, enabled: !!me?.hasAccess });

  return (
    <AppShell footer={`${String(jobs.length).padStart(2, "0")} — Open roles`}>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Pipeline</span>
            <h1 className="mt-4 text-4xl font-light md:text-5xl">Your open roles</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create a job, drop in CVs, and let Lens rank them.</p>
          </div>
          <JobDialog trigger={<Button variant="pill"><Plus /> New job</Button>} />
        </div>

        {!isLoading && jobs.length === 0 ? (
          <div className="mt-12 grid items-center gap-8 rounded-3xl glass p-8 md:grid-cols-2">
            <img src={stack} alt="" width={1280} height={1024} className="float-slow w-full rounded-2xl mix-blend-lighten" />
            <div>
              <h2 className="text-3xl font-light">Start with your first role</h2>
              <p className="mt-3 text-sm text-muted-foreground">Paste the job description and add must-have criteria. Then bulk-upload CVs — each one gets scored with reasons.</p>
              <JobDialog trigger={<Button variant="glow" className="mt-6"><Plus /> Create a job</Button>} />
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j, i) => (
              <motion.div key={j.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}>
                <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="group block h-full rounded-3xl glass p-6 transition hover:glow">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-light leading-tight">{j.title}</h3>
                    <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary-glow" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{j.description || "No description yet"}</p>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-light tabular-nums">{counts[j.id]?.count ?? 0}</p>
                      <p className="text-[11px] text-muted-foreground">candidates</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-light tabular-nums text-primary-glow">{counts[j.id]?.top || "–"}</p>
                      <p className="text-[11px] text-muted-foreground">top score</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {j.criteria.slice(0, 3).map((c) => (
                      <span key={c.id} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{c.label}</span>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
