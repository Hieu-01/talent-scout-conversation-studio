import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createGateway, reasoningOptions } from "./ai/gateway.server";
import { withLovableAiGatewayRunIdHeader } from "./ai/run-id.server";
import { supabaseForRequest } from "./supabase-user.server";

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "content-type": "application/json" } });

export async function handleChat(request: Request) {
  const auth = await supabaseForRequest(request);
  if (!auth) return json(401, "Please sign in again.");
  const { supabase } = auth;

  const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
  const threadId = z.string().uuid().parse(body.threadId);
  const messages = body.messages;

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, job_id, title, jobs(title, description, criteria)")
    .eq("id", threadId)
    .single();
  if (!thread) return json(404, "Conversation not found or you don't have access.");
  const jobId = thread.job_id;
  const job = thread.jobs as unknown as { title: string; description: string; criteria: { label: string; importance: string }[] };

  const candidateFields =
    "id, full_name, email, phone, location, headline, years_experience, skills, education, summary, score, score_reason, criteria_results, status, notes, file_name";

  const tools = {
    search_candidates: tool({
      description:
        "List candidates for this job, ranked by score. Optionally filter by minimum score, skill (case-insensitive substring), minimum years of experience, or a name/text query.",
      inputSchema: z.object({
        min_score: z.number().nullable(),
        skill: z.string().nullable(),
        min_years: z.number().nullable(),
        query: z.string().nullable(),
        limit: z.number().nullable(),
      }),
      execute: async ({ min_score, skill, min_years, query, limit }) => {
        let q = supabase
          .from("candidates")
          .select("id, full_name, headline, years_experience, skills, score, status, location")
          .eq("job_id", jobId)
          .order("score", { ascending: false, nullsFirst: false });
        if (min_score != null) q = q.gte("score", min_score);
        if (min_years != null) q = q.gte("years_experience", min_years);
        if (query) q = q.or(`full_name.ilike.%${query.replace(/[,()]/g, "")}%,summary.ilike.%${query.replace(/[,()]/g, "")}%`);
        const { data, error } = await q.limit(200);
        if (error) return { error: error.message };
        let rows = data ?? [];
        if (skill) rows = rows.filter((r) => r.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase())));
        return { count: rows.length, candidates: rows.slice(0, Math.min(limit ?? 25, 50)) };
      },
    }),
    get_candidate: tool({
      description: "Get full details for one candidate by id.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { data, error } = await supabase.from("candidates").select(candidateFields).eq("job_id", jobId).eq("id", id).single();
        return error ? { error: "Candidate not found" } : data;
      },
    }),
    update_candidate: tool({
      description:
        "Edit a candidate's details. Only include the fields to change (others null). skills replaces the whole list, so include existing skills you want to keep.",
      inputSchema: z.object({
        id: z.string(),
        full_name: z.string().nullable(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        location: z.string().nullable(),
        headline: z.string().nullable(),
        years_experience: z.number().nullable(),
        skills: z.array(z.string()).nullable(),
        education: z.string().nullable(),
        summary: z.string().nullable(),
        notes: z.string().nullable(),
        score: z.number().nullable(),
      }),
      execute: async ({ id, ...fields }) => {
        const patch = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null));
        if (Object.keys(patch).length === 0) return { error: "Nothing to update" };
        const { data, error } = await supabase
          .from("candidates")
          .update(patch as never)
          .eq("job_id", jobId)
          .eq("id", id)
          .select("id, full_name")
          .single();
        return error ? { error: error.message } : { updated: data, fields: Object.keys(patch) };
      },
    }),
    delete_candidate: tool({
      description: "Permanently delete a candidate and their CV file. The user must approve.",
      inputSchema: z.object({ id: z.string(), name: z.string() }),
      needsApproval: true,
      execute: async ({ id }) => {
        const { data: c } = await supabase.from("candidates").select("file_path").eq("job_id", jobId).eq("id", id).single();
        const { error } = await supabase.from("candidates").delete().eq("job_id", jobId).eq("id", id);
        if (error) return { error: error.message };
        if (c?.file_path) await supabase.storage.from("cvs").remove([c.file_path]);
        return { deleted: id };
      },
    }),
  };

  const criteria = (job.criteria ?? []).map((c) => `- ${c.importance === "must" ? "MUST" : "NICE"}: ${c.label}`).join("\n");
  const instructions = `You are Lens, the recruiting copilot inside CV Screening Studio. You help screen candidates for the job "${job.title}".
Job description: ${job.description?.slice(0, 4000) || "(none)"}
Criteria:\n${criteria || "(none)"}

Always use tools to look up real data; never invent candidates. When the user asks to edit, call update_candidate. When asked to delete, call delete_candidate once per candidate (the app asks the user to confirm). Refer to candidates by name. Keep answers concise and use markdown tables or bullet lists for comparisons.`;

  const { model, runIdFetch } = createGateway(request);
  const result = streamText({
    model,
    instructions,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(50),
    abortSignal: request.signal,
    providerOptions: reasoningOptions,
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onFinish: async ({ messages: all }) => {
        const { error: delErr } = await supabase.from("chat_messages").delete().eq("thread_id", threadId);
        if (delErr) console.error("chat persist (delete) failed", delErr);
        const rows = all.map((m, i) => ({
          thread_id: threadId,
          message: m as unknown as never,
          created_at: new Date(Date.now() + i).toISOString(),
        }));
        const { error: insErr } = await supabase.from("chat_messages").insert(rows);
        if (insErr) console.error("chat persist (insert) failed", insErr);
        const firstUser = all.find((m) => m.role === "user");
        const firstText = firstUser?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
        const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
        if (thread.title === "New conversation" && firstText?.text) patch.title = firstText.text.slice(0, 60);
        await supabase.from("chat_threads").update(patch).eq("id", threadId);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (/402|credit/i.test(msg)) return "AI credits are used up. Add credits in workspace billing settings.";
        if (/429/.test(msg)) return "Too many requests — please try again in a moment.";
        return "Something went wrong talking to the AI.";
      },
    }),
    runIdFetch,
  );
}
