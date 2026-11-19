import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { Candidate } from "@/lib/data";
import { ScoreRing } from "./score-ring";

export function CompareOverlay({ items, onClose }: { items: Candidate[]; onClose: () => void }) {
  const labels = Array.from(new Set(items.flatMap((c) => c.criteria_results.map((r) => r.label))));
  const rows: [string, (c: Candidate) => React.ReactNode][] = [
    ["Headline", (c) => c.headline],
    ["Experience", (c) => (c.years_experience != null ? `${c.years_experience} yrs` : "–")],
    ["Location", (c) => c.location],
    ["Education", (c) => c.education],
    ["Top skills", (c) => c.skills.slice(0, 6).join(", ")],
    ...labels.map((l): [string, (c: Candidate) => React.ReactNode] => [
      l,
      (c) => {
        const r = c.criteria_results.find((x) => x.label === l);
        if (!r) return "–";
        const tone = r.status === "met" ? "text-success" : r.status === "partial" ? "text-warning" : "text-destructive";
        return <span className={tone}>{r.status === "met" ? "Met" : r.status === "partial" ? "Partial" : "Missing"}</span>;
      },
    ]),
  ];
  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-4 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ x: 80, opacity: 0, filter: "blur(8px)" }}
            animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-5xl overflow-auto rounded-3xl glass-strong p-6"
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-pill text-pill-foreground">
              <X className="size-4" />
            </button>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-40" />
                  {items.map((c) => (
                    <th key={c.id} className="border-l border-border px-4 pb-4 text-center font-normal">
                      <ScoreRing score={c.score} size={56} className="mx-auto" />
                      <p className="mt-2 text-base">{c.full_name || c.file_name}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, fn]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{label}</td>
                    {items.map((c) => (
                      <td key={c.id} className="border-l border-border px-4 py-3 text-center text-xs">{fn(c) || "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
