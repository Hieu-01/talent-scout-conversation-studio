import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCandidate } from "@/lib/cv.functions";
import { extractText } from "@/lib/extract";
import { cn } from "@/lib/utils";

type Item = { key: string; name: string; state: "reading" | "scoring" | "done" | "error"; error?: string };

export function UploadZone({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const analyze = useServerFn(analyzeCandidate);
  const qc = useQueryClient();

  const set = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const processOne = useCallback(
    async (file: File, key: string) => {
      try {
        const { data: row, error } = await supabase
          .from("candidates")
          .insert({ job_id: jobId, file_name: file.name, status: "processing" })
          .select("id")
          .single();
        if (error || !row) throw new Error(error?.message ?? "Could not save");
        qc.invalidateQueries({ queryKey: ["candidates", jobId] });
        const path = `${jobId}/${row.id}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        const [{ error: upErr }, text] = await Promise.all([
          supabase.storage.from("cvs").upload(path, file, { upsert: true }),
          extractText(file).catch(() => ""),
        ]);
        if (upErr) throw new Error(upErr.message);
        await supabase.from("candidates").update({ file_path: path, raw_text: text }).eq("id", row.id);
        set(key, { state: "scoring" });
        const res = await analyze({ data: { candidateId: row.id } });
        set(key, res.ok ? { state: "done" } : { state: "error", error: res.error ?? "Could not read this CV" });
      } catch (e) {
        set(key, { state: "error", error: e instanceof Error ? e.message : "Failed" });
      } finally {
        qc.invalidateQueries({ queryKey: ["candidates", jobId] });
        qc.invalidateQueries({ queryKey: ["job-counts"] });
      }
    },
    [analyze, jobId, qc],
  );

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (files.length === 0) {
      toast.error("Please choose PDF or Word (.docx) files");
      return;
    }
    const batch = files.map((f) => ({ file: f, key: crypto.randomUUID() }));
    setItems((xs) => [...batch.map((b) => ({ key: b.key, name: b.file.name, state: "reading" as const })), ...xs].slice(0, 60));
    const queue = [...batch];
    const worker = async () => {
      while (queue.length) {
        const next = queue.shift()!;
        await processOne(next.file, next.key);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    toast.success(`${files.length} CV${files.length > 1 ? "s" : ""} processed`);
  }

  const active = items.filter((i) => i.state === "reading" || i.state === "scoring").length;

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group flex w-full items-center gap-4 rounded-3xl border border-dashed border-border p-5 text-left transition glass",
          over && "glow border-primary",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-primary glow transition group-hover:scale-105">
          {active ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
        </span>
        <span>
          <span className="block text-sm font-medium">{active ? `Processing ${active} CV${active > 1 ? "s" : ""}…` : "Drop CVs here or click to upload"}</span>
          <span className="block text-xs text-muted-foreground">PDF or Word · select many at once · scored automatically</span>
        </span>
      </button>
      <input ref={input} type="file" multiple accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      <AnimatePresence>
        {items.length > 0 && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 max-h-40 space-y-1 overflow-y-auto">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                {i.state === "done" ? <CheckCircle2 className="size-3.5 text-success" /> : i.state === "error" ? <XCircle className="size-3.5 text-destructive" /> : <Loader2 className="size-3.5 animate-spin text-primary-glow" />}
                <span className="truncate">{i.name}</span>
                <span className="ml-auto shrink-0">{i.state === "reading" ? "Reading" : i.state === "scoring" ? "Scoring" : i.state === "done" ? "Done" : i.error}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
