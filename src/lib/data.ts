import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Criterion, CriterionResult } from "./cv.functions";

export type Job = Omit<Tables<"jobs">, "criteria"> & { criteria: Criterion[] };
export type Candidate = Omit<Tables<"candidates">, "criteria_results" | "experience"> & {
  criteria_results: CriterionResult[];
  experience: { title: string; company: string; period: string | null }[];
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const r = (roles ?? []).map((x) => x.role);
    return { id: u.user.id, email: u.user.email ?? "", isOwner: r.includes("owner"), hasAccess: r.length > 0 };
  },
});
export const useMe = () => useQuery(meQuery);

export const jobsQuery = queryOptions({
  queryKey: ["jobs"],
  queryFn: async () => {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as Job[];
  },
});

export const jobCountsQuery = queryOptions({
  queryKey: ["job-counts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("candidates").select("job_id, score");
    if (error) throw error;
    const map: Record<string, { count: number; top: number }> = {};
    for (const r of data ?? []) {
      const m = (map[r.job_id] ??= { count: 0, top: 0 });
      m.count++;
      m.top = Math.max(m.top, r.score ?? 0);
    }
    return map;
  },
});

export const jobQuery = (id: string) =>
  queryOptions({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Job;
    },
  });

export const candidatesQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["candidates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", jobId)
        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Candidate[];
    },
  });

export const threadsQuery = (jobId: string) =>
  queryOptions({
    queryKey: ["threads", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, updated_at")
        .eq("job_id", jobId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
