import React from "react";

function stripHtmlToPreview(html: string, len = 160) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const text = (div.textContent || "").trim();
  return text.length > len ? text.slice(0, len - 1) + "…" : text;
}

type Props = { label: string; value: string; placeholder?: string; onOpen: () => void; };

export default function FieldShell({ label, value, placeholder, onOpen }: Props) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div
        className="input-like"
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      >
        {value ? stripHtmlToPreview(value) : <span className="muted">{placeholder || "Cliquez pour saisir…"}</span>}
      </div>
      <div className="hint muted">Cliquez (ou Entrée/Espace) pour éditer</div>
    </div>
  );
}
