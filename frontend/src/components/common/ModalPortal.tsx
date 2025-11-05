import { useEffect, useMemo } from "react";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children }: { children: ReactNode }) {
  const el = useMemo(() => document.createElement("div"), []);
  useEffect(() => {
    let root = document.getElementById("modal-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "modal-root";
      document.body.appendChild(root);
    }
    root.appendChild(el);
    return () => { try { root?.removeChild(el); } catch {} };
  }, [el]);
  return createPortal(children, el);
}

