const API = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export function toAbsoluteMedia(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;  // already absolute
  if (url.startsWith("/")) return `${API}${url}`;
  return `${API}/${url.replace(/^\/+/, "")}`;
}
