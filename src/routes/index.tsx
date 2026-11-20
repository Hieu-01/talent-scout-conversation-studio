import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, FileStack, MessageSquareText, Users, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";
import stack from "@/assets/cv-stack.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lens — AI CV Screening Studio" },
      { name: "description", content: "Bulk-upload CVs, score them against your job and criteria, and manage candidates with an AI copilot." },
      { property: "og:title", content: "Lens — AI CV Screening Studio" },
      { property: "og:description", content: "Bulk-upload CVs, score them against your job and criteria, and manage candidates with an AI copilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: FileStack, title: "Bulk upload", lines: ["PDF & Word", "Dozens at once", "Text extracted instantly"] },
  { icon: Workflow, title: "Task automation", lines: ["Set up a task once", "Lens runs it for you", "You approve the result"] },
  { icon: MessageSquareText, title: "AI copilot", lines: ["Ask anything", "Edit by command", "Delete with confirm"] },
  { icon: Users, title: "Team access", lines: ["Invite by email", "Shared pipeline", "Saved forever"] },
];

function Landing() {
  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="relative flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[2rem] glass">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Logo />
          <Button asChild variant="glow" size="sm"><Link to="/auth">Login</Link></Button>
        </header>
        <div className="grid flex-1 items-center gap-10 px-6 pb-10 md:grid-cols-2 md:px-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">AI recruiting studio</span>
            <h1 className="mt-5 text-5xl font-light leading-[1.05] md:text-6xl">
              Ready to get<br />your work<br /><span className="text-gradient">done?</span>
            </h1>
            <p className="mt-5 max-w-md text-sm text-muted-foreground">
              Dude what else u want me to say? Let just go ahead and automate ur boring, repetitive task bruh (Am done promotin')
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild variant="pill"><Link to="/jobs">Open studio <ArrowRight /></Link></Button>
              <Button asChild variant="glass"><Link to="/auth">Create account</Link></Button>
            </div>
          </motion.div>
          <div className="relative">
            <motion.img
              src={stack}
              alt="Stack of glowing glass CV cards"
              width={1280}
              height={1024}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="float-slow w-full rounded-3xl mix-blend-lighten"
            />
            <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-3 md:-bottom-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.12 }}
                  whileHover={{ y: -4 }}
                  className="glass-strong rounded-2xl p-4"
                >
                  <f.icon className="size-4 text-primary-glow" />
                  <p className="mt-2 text-sm font-medium">{f.title}</p>
                  {f.lines.map((l) => <p key={l} className="text-[11px] text-muted-foreground">{l}</p>)}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
