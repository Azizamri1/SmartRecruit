export function linesToHtml(lines: string[]): string {
  const clean = (lines || []).map(s => s.trim()).filter(Boolean);
  if (!clean.length) return "";
  // prefer UL if user wrote bullet items
  return `<ul>${clean.map(li => `<li>${li}</li>`).join("")}</ul>`;
}

export function htmlToLines(html: string): string[] {
  if (!html) return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // prefer list items
  const lis = Array.from(tmp.querySelectorAll("li")).map(li => li.textContent?.trim() || "").filter(Boolean);
  if (lis.length) return lis;

  // fallback: split paragraphs / br
  const blocks = Array.from(tmp.querySelectorAll("p,div")).map(p => p.textContent?.trim() || "").filter(Boolean);
  if (blocks.length) return blocks;

  // last resort: text by lines
  return (tmp.textContent || "")
    .split(/\r?\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

