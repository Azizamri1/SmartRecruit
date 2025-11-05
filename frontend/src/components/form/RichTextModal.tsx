import React, { useEffect, useRef, useState } from "react";
import ModalPortal from "../common/ModalPortal";

type Props = {
  title: string;
  value: string;                // initial HTML
  onSave: (html: string) => void;
  onClose: () => void;
  placeholder?: string;
};

const ALLOWED_TAGS = new Set(["B","STRONG","I","EM","U","BR","P","UL","OL","LI","A"]);
const ALLOWED_ATTRS = new Set(["href","title","target","rel"]);

function sanitizeLight(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT, null);
  // strip disallowed tags/attrs
  let node: HTMLElement | null = walker.nextNode() as HTMLElement;
  while (node) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      const parent = node.parentNode;
      while (node.firstChild) parent?.insertBefore(node.firstChild, node);
      parent?.removeChild(node);
      node = walker.nextNode() as HTMLElement | null;
      continue;
    }
    // scrub attributes
    for (let attr of node.attributes as any) {
      if (!ALLOWED_ATTRS.has(attr.name)) node.removeAttribute(attr.name);
    }
    node = walker.nextNode() as HTMLElement | null;
  }
  return div.innerHTML;
}

export default function RichTextModal({ title, value, onSave, onClose, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [local, setLocal] = useState<string>(value || "");

  // âœ… INIT ONCE: put initial HTML in the editor but never overwrite during typing
  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      editorRef.current.innerHTML = local || "";
      initialized.current = true;
    }
  }, [local]);

  // Close on ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const commit = () => {
    const raw = editorRef.current?.innerHTML || "";
    onSave(sanitizeLight(raw));
    onClose();
  };

  // Simple native commands
  const cmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Clear content function
  const clearContent = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setLocal("");
    editorRef.current?.focus();
  };

  return (
    <ModalPortal>
      {/* Force LTR at container level and neutralize transforms */}
      <div className="rtm-overlay" dir="ltr" onClick={onClose}>
        <div
          className="rtm-dialog"
          dir="ltr"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header className="rtm-header"><h3>{title}</h3></header>
          <div className="rtm-toolbar">
            <button type="button" onClick={() => cmd("bold")}><b>B</b></button>
            <button type="button" onClick={() => cmd("italic")}><i>I</i></button>
            <button type="button" onClick={() => cmd("underline")}><u>U</u></button>
            <button type="button" onClick={() => cmd("insertUnorderedList")}>• List</button>
            <button type="button" onClick={() => cmd("insertOrderedList")}>1. List</button>
            <button type="button" onClick={() => {
              const url = prompt("Link URL:");
              if (url) cmd("createLink", url);
            }}>ðŸ”— Link</button>
            <button type="button" onClick={clearContent}>Clear</button>
          </div>
          <div className="rtm-body">
            <div
              ref={editorRef}
              className="rtm-editor"
              contentEditable
              dir="ltr"
              data-placeholder={placeholder || "Saisissez votre contenu…"}
              style={{ direction: "ltr" }}
              // âœ… Update state but DO NOT write back to DOM
              onInput={(e) => {
                const html = (e.target as HTMLDivElement).innerHTML;
                setLocal(html); // state is just for Save/preview; avoid DOM writes
              }}
              onKeyDown={(e) => { e.stopPropagation(); }}
            />
          </div>
          <footer className="rtm-footer">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={commit}>Save</button>
          </footer>
        </div>
      </div>
    </ModalPortal>
  );
}

