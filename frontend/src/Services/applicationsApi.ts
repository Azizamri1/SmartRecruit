import api from "./apiClient";

export type AdminJob = {
  id: number;
  title: string;
  status: string;
  deadline?: string | null;
  applications?: number;
};

export type AdminJobApp = {
  id: number;
  job_id: number;
  job_title: string;
  status: "pending" | "accepted" | "rejected";
  score: number | null;
  applied_at: string | null;
  cv_id?: number | null;
  candidate_email?: string;
};

export const fetchAdminJobs = async () => {
  const res = await api.get<AdminJob[]>("/company/analytics/jobs");
  return res.data;
};

// sort: "score_desc" | "score_asc"; status optional: "pending" | "accepted" | "rejected"
export const fetchAdminJobApplications = async (
  jobId: number,
  opts?: { sort?: "score_desc" | "score_asc"; status?: "pending" | "accepted" | "rejected" }
) => {
  const params = new URLSearchParams();
  if (opts?.sort) {
    // server accepts: score_desc | date_desc | date_asc
    const allowed = new Set(["score_desc", "date_desc", "date_asc"]);
    const wanted = opts.sort === "score_asc" ? "score_desc" : opts.sort;
    if (allowed.has(wanted)) params.set("sort", wanted as any);
  }
  if (opts?.status) params.set("status", opts.status);
  const qs = params.toString();
  const res = await api.get<AdminJobApp[]>(
    `/company/analytics/jobs/${jobId}/applications${qs ? `?${qs}` : ""}`
  );
  return res.data;
};

export const setApplicationStatus = async (
  applicationId: number,
  status: "accepted" | "rejected"
) => {
  const res = await api.patch<{ id: number; status: "accepted" | "rejected" }>(
    `/applications/${applicationId}/status`,
    { status }
  );
  return res.data;
};

export const bulkSetApplicationStatus = async (
  ids: number[],
  status: "accepted" | "rejected"
) => {
  // no bulk endpoint yet; do fan-out
  const results = await Promise.allSettled(ids.map((id) => setApplicationStatus(id, status)));
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  return { ok, fail };
};

// --- Debug score (admin-only) ---
export async function debugScore(cv_id: number, job_id: number) {
  const { data } = await api.post("/applications/_debug/score", null, {
    params: { cv_id, job_id },
  });
  return data as {
    cv_id: number;
    job_id: number;
    tokens: number;
    components: {
      sim: number;
      skills: number;
      requirements: number;
      profile: number;
      langs: number;
      len_penalty: number;
      must_cap: number | null;
      base_before_penalties: number;
    };
    preview?: string;
  };
}
