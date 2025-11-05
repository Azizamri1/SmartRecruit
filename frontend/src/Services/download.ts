import { apiUrl } from "./apiBase";

function getToken() {
  // adjust if you store token elsewhere
  return localStorage.getItem("token") || "";
}

export async function viewCvPdf(cvId: number) {
  const url = apiUrl(`/cvs/${cvId}/download`);
  const token = getToken();

  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    // if you use cookies instead of tokens, add: credentials: "include"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`CV download failed: ${res.status} ${txt}`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  // Optional cleanup
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
