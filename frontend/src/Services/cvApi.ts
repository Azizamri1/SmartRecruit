import api from "./apiClient";

export async function getCurrentCV() {
  const { data } = await api.get("/cvs/current"); // returns latest or 404/null
  return data;
}

export async function uploadCV(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/cvs", fd);
  return data as { id: number; file_path: string; uploaded_at: string };
}

