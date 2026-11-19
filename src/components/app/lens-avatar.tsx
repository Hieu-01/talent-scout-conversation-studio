export function LensAvatar() {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-primary glow">
      <span className="size-3 rounded-full border-2 border-primary-foreground" />
      <span className="absolute bottom-1.5 right-1.5 h-1 w-1.5 rotate-45 rounded-full bg-primary-foreground" />
    </span>
  );
}
