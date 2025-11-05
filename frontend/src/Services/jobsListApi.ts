import api from "./apiClient";
import type { JobDetail } from "./jobsApi";

export async function getJobs(): Promise<JobDetail[]> {
  const res = await api.get<JobDetail[]>("/jobs"); // swap to paged route if needed
  return res.data;
}

export type JobStatus = "published" | "draft" | "archived";

export async function getCompanyJobs(status: JobStatus, owner: "me" | undefined = "me") {
  const params: Record<string, string> = { status };
  if (owner) params.owner = owner;
  const { data } = await api.get("/jobs", { params });
  return data as any[]; // Use your Job type if you have it
}

export async function patchJobStatus(jobId: number, status: JobStatus) {
  const { data } = await api.patch(`/jobs/${jobId}/status`, { status });
  return data;
}

export async function deleteJob(jobId: number) {
  await api.delete(`/jobs/${jobId}`);
}

export async function bulkStatus(ids: number[], status: JobStatus) {
  const ops = ids.map(id => patchJobStatus(id, status));
  return Promise.allSettled(ops);
}

export async function bulkDelete(ids: number[]) {
  const ops = ids.map(id => deleteJob(id));
  return Promise.allSettled(ops);
}

export async function getJob(id: number) {
  const { data } = await api.get(`/jobs/${id}`);
  return data;
}

export async function updateJob(id: number, payload: Partial<JobDetail>) {
  const { data } = await api.patch(`/jobs/${id}`, payload);
  return data;
}
