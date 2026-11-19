import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { ThreadStrip } from "@/components/app/chat-threads";
import { ChatWindow } from "@/components/app/chat-window";

export const Route = createFileRoute("/_authenticated/jobs/$jobId/chat/$threadId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("message")
      .eq("thread_id", params.threadId)
      .order("created_at");
    if (error) throw error;
    return { messages: (data ?? []).map((r) => r.message as unknown as UIMessage) };
  },
  component: ChatPage,
});

function ChatPage() {
  const { jobId, threadId } = Route.useParams();
  const { messages } = Route.useLoaderData();
  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-3xl glass">
      <ThreadStrip jobId={jobId} activeId={threadId} />
      <ChatWindow key={threadId} jobId={jobId} threadId={threadId} initialMessages={messages} />
    </div>
  );
}
