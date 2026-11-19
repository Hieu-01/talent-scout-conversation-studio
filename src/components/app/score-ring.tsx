import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = 44, className }: { score: number | null; size?: number; className?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const v = score ?? 0;
  const tone = v >= 75 ? "stroke-success" : v >= 50 ? "stroke-primary-glow" : v > 0 ? "stroke-warning" : "stroke-muted";
  return (
    <div className={cn("relative grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="fill-none stroke-border" strokeWidth={3} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={cn("fill-none", tone)}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * v) / 100 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">{score ?? "–"}</span>
    </div>
  );
}
