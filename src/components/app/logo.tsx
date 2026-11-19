import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid size-7 place-items-center rounded-lg bg-gradient-primary glow">
        <span className="size-2.5 rounded-full border-2 border-primary-foreground" />
      </span>
      <span className="font-display text-base font-medium tracking-tight">Lens</span>
    </span>
  );
}
