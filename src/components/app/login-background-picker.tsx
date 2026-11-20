import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import wave from "@/assets/login-wave.jpg";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTR,
  MAX_IMAGE_MB,
  MAX_VIDEO_MB,
  MAX_VIDEO_SECONDS,
  checkVideoPlayable,
  validateBackgroundFile,
  type StoredBackground,
} from "@/lib/login-background";

type Props = {
  custom: { bg: StoredBackground; url: string } | null;
  dim: number;
  onDim: (n: number) => void;
  onPick: (bg: StoredBackground) => Promise<void>;
  onReset: () => Promise<void>;
};

export function LoginBackgroundPicker({ custom, dim, onDim, onPick, onReset }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const check = validateBackgroundFile(file);
    if (!check.ok) return void toast.error(check.error);
    setBusy(true);
    try {
      if (check.kind === "video") {
        const problem = await checkVideoPlayable(file);
        if (problem) return void toast.error(problem);
      }
      await onPick({ blob: file, kind: check.kind, name: file.name });
      toast.success("Login background updated");
    } catch {
      toast.error("Couldn't save it on this device — try a smaller file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const tile = "relative aspect-video overflow-hidden rounded-xl border-2 transition hover:scale-[1.03]";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Customize login background"
          className="group glass-login absolute bottom-5 right-5 z-20 flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition hover:scale-105 md:bottom-7 md:right-7"
        >
          <Pencil className="size-4" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-40 sm:max-w-40">
            Customize
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={12} className="glass-strong w-80 rounded-3xl p-5">
        <h2 className="font-display text-base font-medium">Login background</h2>
        <p className="mt-1 text-xs text-muted-foreground">Saved on this device only.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => custom && onReset()}
            className={cn(tile, !custom ? "border-primary-glow" : "border-transparent")}
          >
            <img src={wave} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-background/60 px-2 py-1 text-left text-[11px]">Default wave</span>
            {!custom && <Selected />}
          </button>

          {custom ? (
            <div className={cn(tile, "border-primary-glow")}>
              {custom.bg.kind === "video" ? (
                <video src={custom.url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <img src={custom.url} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-background/60 px-2 py-1 text-left text-[11px]">{custom.bg.name}</span>
              <Selected />
            </div>
          ) : (
            <UploadTile busy={busy} onClick={() => input.current?.click()} className={tile} />
          )}
        </div>

        {custom && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent py-2 text-xs transition hover:bg-secondary"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />} Choose another
            </button>
            <button
              type="button"
              onClick={() => onReset()}
              className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs transition hover:bg-secondary"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs">
            <span>Darken</span>
            <span className="text-muted-foreground">{Math.round(dim * 100)}%</span>
          </div>
          <Slider value={[dim]} min={0} max={0.8} step={0.05} onValueChange={([v]) => onDim(v ?? 0)} aria-label="Darken background" />
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Pictures &amp; GIFs up to {MAX_IMAGE_MB} MB. Videos up to {MAX_VIDEO_SECONDS}s and {MAX_VIDEO_MB} MB — they play muted on loop.
        </p>
        <input ref={input} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </PopoverContent>
    </Popover>
  );
}

function Selected() {
  return (
    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
      <Check className="size-3" />
    </span>
  );
}

function UploadTile({ busy, onClick, className }: { busy: boolean; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(className, "grid place-items-center border-dashed border-border bg-muted text-xs text-muted-foreground hover:text-foreground")}
    >
      <span className="flex flex-col items-center gap-1.5">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        Upload from device
      </span>
    </button>
  );
}
