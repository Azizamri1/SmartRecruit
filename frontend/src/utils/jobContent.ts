export function htmlToMissionItems(html: string): string[] {
  if (!html || !html.trim()) return [];
  const container = document.createElement("div");
  container.innerHTML = html;

  // Prefer <li>
  const lis = Array.from(container.querySelectorAll("li")).map(li => (li.textContent || "").trim()).filter(Boolean);
  if (lis.length) return lis;

  // Fallback: split by lines
  return (container.textContent || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function previewText(html: string, len = 160): string {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const text = (div.textContent || "").trim();
  return text.length > len ? text.slice(0, len - 1) + "…" : text;
}

