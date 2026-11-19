import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { threadsQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export function useNewThread(jobId: string) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ job_id: jobId, created_by: u.user?.id ?? null })
      .select("id")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not start a conversation");
      return;
    }
    qc.invalidateQueries({ queryKey: ["threads", jobId] });
    navigate({ to: "/jobs/$jobId/chat/$threadId", params: { jobId, threadId: data.id } });
  };
}

export function ThreadStrip({ jobId, activeId }: { jobId: string; activeId?: string }) {
  const { data: threads = [] } = useQuery(threadsQuery(jobId));
  const newThread = useNewThread(jobId);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function del(id: string) {
    await supabase.from("chat_threads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["threads", jobId] });
    if (id === activeId) navigate({ to: "/jobs/$jobId", params: { jobId } });
  }
  return (
    <div className="flex items-center gap-2 border-b border-border p-3">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {threads.map((t) => (
          <div key={t.id} className={cn("group flex shrink-0 items-center rounded-full text-xs", t.id === activeId ? "bg-pill text-pill-foreground" : "bg-secondary text-muted-foreground")}>
            <Link to="/jobs/$jobId/chat/$threadId" params={{ jobId, threadId: t.id }} className="max-w-36 truncate py-1 pl-3 pr-1">
              {t.title}
            </Link>
            <button type="button" aria-label="Delete conversation" onClick={() => del(t.id)} className="pr-2 opacity-0 transition group-hover:opacity-70">
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <Button size="icon-sm" variant="glow" aria-label="New conversation" onClick={newThread}>
        <MessageSquarePlus />
      </Button>
    </div>
  );
}
