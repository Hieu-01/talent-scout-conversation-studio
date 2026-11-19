import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThreadStrip, useNewThread } from "@/components/app/chat-threads";
import { LensAvatar } from "@/components/app/lens-avatar";

export const Route = createFileRoute("/_authenticated/jobs/$jobId/")({
  component: ChatStart,
});

const examples = ["Who are the top 5 candidates and why?", "Who has 3+ years and meets all must-haves?", "Compare the two highest scores in a table"];

function ChatStart() {
  const { jobId } = Route.useParams();
  const newThread = useNewThread(jobId);
  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-3xl glass">
      <ThreadStrip jobId={jobId} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <LensAvatar />
        <h2 className="text-xl font-light">Ask Lens about your candidates</h2>
        <p className="max-w-xs text-xs text-muted-foreground">It can search, compare, edit details and — with your confirmation — delete candidates.</p>
        <div className="space-y-1.5">
          {examples.map((e) => <p key={e} className="rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">{e}</p>)}
        </div>
        <Button variant="pill" onClick={newThread}>Start a conversation</Button>
      </div>
    </div>
  );
}
