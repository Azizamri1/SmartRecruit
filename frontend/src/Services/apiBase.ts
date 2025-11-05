export const apiUrl = (path: string) => {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const clean = (path || "").replace(/^\/+/, "");
  return `${base}/${clean}`;
};

