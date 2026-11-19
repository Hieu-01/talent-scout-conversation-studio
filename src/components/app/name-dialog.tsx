import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DISPLAY_NAME_MAX, normalizeDisplayName } from "@/lib/display-name";

/**
 * Asks "What should we call you?". When `required`, it can't be dismissed
 * (first sign-in); otherwise it's an edit box opened from the header.
 */
export function NameDialog({
  userId,
  open,
  required,
  initial,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  required: boolean;
  initial?: string | null;
  onOpenChange?: (open: boolean) => void;
}) {
  const [name, setName] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) setName(initial ?? "");
  }, [open, initial]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeDisplayName(name);
    if (!clean) {
      toast.error(`Please enter a name (up to ${DISPLAY_NAME_MAX} characters)`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: clean }).eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["me"] });
    toast.success(`Nice to meet you, ${clean}!`);
    onOpenChange?.(false);
  }

  const block = (e: Event) => required && e.preventDefault();

  return (
    <Dialog open={open} onOpenChange={(o) => (required ? undefined : onOpenChange?.(o))}>
      <DialogContent
        className={`glass-strong rounded-3xl sm:max-w-md ${required ? "[&>button:last-child]:hidden" : ""}`}
        onEscapeKeyDown={block}
        onInteractOutside={block}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary-glow">
            <Sparkles className="size-5" />
          </span>
          <DialogTitle className="pt-2 text-2xl font-light">What should we call you?</DialogTitle>
          <DialogDescription>This name shows instead of your email around the studio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <Input
            autoFocus
            value={name}
            maxLength={DISPLAY_NAME_MAX}
            placeholder="Your name"
            aria-label="Your name"
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-full px-5"
          />
          <Button type="submit" variant="glow" className="h-11 w-full rounded-full" disabled={busy || !name.trim()}>
            {busy && <Loader2 className="animate-spin" />}
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
