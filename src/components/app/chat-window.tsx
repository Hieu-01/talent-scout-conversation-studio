import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import {
  Confirmation, ConfirmationAccepted, ConfirmationAction, ConfirmationActions,
  ConfirmationRejected, ConfirmationRequest, ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { LensAvatar } from "./lens-avatar";

const toolLabels: Record<string, string> = {
  search_candidates: "Searched candidates",
  get_candidate: "Read candidate",
  update_candidate: "Edited candidate",
  delete_candidate: "Delete candidate",
};

export function ChatWindow({ jobId, threadId, initialMessages }: { jobId: string; threadId: string; initialMessages: UIMessage[] }) {
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, stop, addToolApprovalResponse } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
      fetch: async (input, init) => {
        const { data } = await supabase.auth.getSession();
        const headers = new Headers(init?.headers);
        if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
        return fetch(input, { ...init, headers });
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["candidates", jobId] });
      qc.invalidateQueries({ queryKey: ["threads", jobId] });
      qc.invalidateQueries({ queryKey: ["job-counts"] });
      textareaRef.current?.focus();
    },
    onError: (e) => {
      const msg = e.message || "";
      toast.error(/402|credit/i.test(msg) ? "AI credits are used up — add credits in workspace billing." : /429/.test(msg) ? "Too many requests, try again shortly." : msg.slice(0, 200) || "Chat failed");
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const busy = status === "submitted" || status === "streaming";
  const last = messages[messages.length - 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <LensAvatar />
              <p className="text-sm text-muted-foreground">Ask anything about this role's candidates, or tell me what to change.</p>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              {m.role === "assistant" && <LensAvatar />}
              <MessageContent className={m.role === "user" ? "!bg-primary !text-primary-foreground rounded-2xl" : "bg-transparent"}>
                {m.parts.map((p, i) => {
                  if (p.type === "text") return <MessageResponse key={i}>{p.text}</MessageResponse>;
                  if (p.type === "reasoning" && p.text)
                    return <p key={i} className="border-l-2 border-border pl-3 text-xs italic text-muted-foreground">{p.text}</p>;
                  if (isToolUIPart(p)) {
                    const name = getToolName(p);
                    if (name === "delete_candidate" && p.approval) {
                      const input = p.input as { name?: string } | undefined;
                      return (
                        <Confirmation key={i} approval={p.approval} state={p.state} className="glass">
                          <ConfirmationTitle>
                            <ConfirmationRequest>Delete <b>{input?.name ?? "this candidate"}</b> permanently?</ConfirmationRequest>
                            <ConfirmationAccepted>Deleted {input?.name}</ConfirmationAccepted>
                            <ConfirmationRejected>Kept {input?.name}</ConfirmationRejected>
                          </ConfirmationTitle>
                          <ConfirmationActions>
                            <ConfirmationAction variant="glass" onClick={() => addToolApprovalResponse({ id: p.approval!.id, approved: false })}>Keep</ConfirmationAction>
                            <ConfirmationAction variant="destructive" onClick={() => addToolApprovalResponse({ id: p.approval!.id, approved: true })}>Delete</ConfirmationAction>
                          </ConfirmationActions>
                        </Confirmation>
                      );
                    }
                    return (
                      <Tool key={i} defaultOpen={false}>
                        <ToolHeader title={toolLabels[name] ?? name} type={p.type as never} state={p.state} />
                        <ToolContent>
                          <ToolInput input={p.input} />
                          <ToolOutput output={p.output} errorText={p.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {busy && last?.role === "user" && (
            <Message from="assistant">
              <LensAvatar />
              <MessageContent className="bg-transparent">
                <span className="flex gap-1 py-2">
                  {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-primary-glow" style={{ animationDelay: `${d * 120}ms` }} />)}
                </span>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput
          onSubmit={(msg) => {
            if (busy) {
              void stop();
              return;
            }
            const text = msg.text?.trim();
            if (!text) return;
            void sendMessage({ text });
          }}
          className="glass rounded-2xl"
        >
          <PromptInputTextarea ref={textareaRef} placeholder="Ask or command Lens…" />
          <PromptInputFooter>
            <PromptInputTools>
              <span className="pl-2 text-[11px] text-muted-foreground">Edits save instantly</span>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
