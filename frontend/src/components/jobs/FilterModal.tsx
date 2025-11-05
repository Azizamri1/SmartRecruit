import { useMemo, useState } from "react";
import "./FilterModal.css";

export default function FilterModal({
  title, options, selected, onApply, onClear, onClose
}:{
  title: string;
  options: string[];
  selected: string[];
  onApply:(sel:string[])=>void;
  onClear:()=>void;
  onClose:()=>void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>(selected || []);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? options : options.filter(o => o.toLowerCase().includes(s));
  }, [q, options]);

  const toggle = (o:string) => {
    const set = new Set(sel);
    set.has(o) ? set.delete(o) : set.add(o);
    setSel(Array.from(set));
  };

  return (
    <div className="fm-scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="fm-card" onClick={e=>e.stopPropagation()}>
        <header className="fm-header">
          <h3>{title}</h3>
          <button className="fm-close" onClick={onClose}>âœ•</button>
        </header>

        <div className="fm-search">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Chercher parmi les choix..." />
        </div>

        <div className="fm-list">
          {shown.map(o => (
            <label key={o} className="fm-row">
              <input type="checkbox" checked={sel.includes(o)} onChange={()=>toggle(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>

        <footer className="fm-footer">
          <button className="fm-btn fm-btn--ghost" onClick={onClear}>Effacer</button>
          <button className="fm-btn fm-btn--apply" onClick={()=>onApply(sel)}>Appliquer ({sel.length})</button>
        </footer>
      </div>
    </div>
  );
}

