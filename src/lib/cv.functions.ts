import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Criterion = { id: string; label: string; importance: "must" | "nice" };
export type CriterionResult = { label: string; status: "met" | "partial" | "missing"; reason: string };

const analysisSchema = z.object({
  full_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  years_experience: z.number().nullable(),
  skills: z.array(z.string()),
  education: z.string().nullable(),
  summary: z.string(),
  experience: z.array(
    z.object({ title: z.string(), company: z.string(), period: z.string().nullable() }),
  ),
  score: z.number(),
  score_reason: z.string(),
  criteria_results: z.array(
    z.object({ label: z.string(), status: z.enum(["met", "partial", "missing"]), reason: z.string() }),
  ),
});

export const analyzeCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { candidateId: string }) => z.object({ candidateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cand, error } = await supabase
      .from("candidates")
      .select("id, raw_text, file_name, job_id, jobs(title, description, criteria)")
      .eq("id", data.candidateId)
      .single();
    if (error || !cand) throw new Error("Candidate not found");
    const job = cand.jobs as unknown as { title: string; description: string; criteria: Criterion[] };
    const text = (cand.raw_text ?? "").slice(0, 60000);
    if (text.trim().length < 30) {
      await supabase
        .from("candidates")
        .update({ status: "error", error: "Could not read any text from this file (it may be a scanned image)." })
        .eq("id", cand.id);
      return { ok: false };
    }

    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const { createGateway, reasoningOptions } = await import("./ai/gateway.server");
    const { model } = createGateway();
    const criteriaText = (job.criteria ?? [])
      .map((c) => `- [${c.importance === "must" ? "MUST HAVE" : "NICE TO HAVE"}] ${c.label}`)
      .join("\n") || "(no extra criteria)";

    const instructions = `You are an expert technical recruiter. Extract structured data from the CV and evaluate the candidate against the job.
Scoring: score is an integer 0-100 for overall fit to the job description and criteria. Missing a MUST HAVE criterion should cap the score at 60. Be calibrated and honest.
criteria_results must contain exactly one entry per listed criterion, in the same order, using the criterion text as label. Reasons must be one short sentence citing CV evidence.
years_experience: total professional years as a number (estimate from dates). Use null for unknown fields. summary: 2-3 sentences.`;
    const prompt = `JOB TITLE: ${job.title}\n\nJOB DESCRIPTION:\n${job.description || "(none)"}\n\nCRITERIA:\n${criteriaText}\n\nCV (${cand.file_name}):\n${text}`;

    try {
      const result = streamText({
        model,
        instructions,
        prompt,
        output: Output.object({ schema: analysisSchema }),
        providerOptions: reasoningOptions,
      });
      let out: z.infer<typeof analysisSchema>;
      try {
        out = (await result.output) as z.infer<typeof analysisSchema>;
      } catch (e) {
        if (NoObjectGeneratedError.isInstance(e) && e.text) out = analysisSchema.parse(JSON.parse(e.text));
        else throw e;
      }
      const score = Math.max(0, Math.min(100, Math.round(out.score)));
      const { error: upErr } = await supabase
        .from("candidates")
        .update({
          full_name: out.full_name,
          email: out.email,
          phone: out.phone,
          location: out.location,
          headline: out.headline,
          years_experience: out.years_experience,
          skills: out.skills.slice(0, 40),
          education: out.education,
          summary: out.summary,
          experience: out.experience,
          score,
          score_reason: out.score_reason,
          criteria_results: out.criteria_results,
          status: "ready",
          error: null,
        })
        .eq("id", cand.id);
      if (upErr) throw new Error(upErr.message);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI analysis failed";
      const friendly = /402|credit/i.test(msg)
        ? "AI credits are used up. Add credits in your workspace billing settings, then retry."
        : /429/.test(msg)
          ? "Too many requests right now. Please retry in a moment."
          : msg;
      await supabase.from("candidates").update({ status: "error", error: friendly }).eq("id", cand.id);
      return { ok: false, error: friendly };
    }
  });
