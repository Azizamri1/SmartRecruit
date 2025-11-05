import { useState } from "react";

export type Filters = { type?: string[]; gov?: string[]; mode?: string[]; specialty?: string[] };

const Section = ({ children, title }:{ children: React.ReactNode; title: string }) => (
  <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
    <div style={{ fontWeight:600, color:"var(--ink-500)" }}>{title}</div>
    <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>{children}</div>
  </div>
);

export default function FilterPills({ value, onChange }:{
  value: Filters; onChange:(next:Filters)=>void;
}) {
  const pill = (label: string, isOn: boolean, toggle: ()=>void) => (
    <button
      type="button"
      onClick={toggle}
      className="jobsThemePill"
      style={
        isOn
          ? { padding:"10px 16px", borderRadius:20, border:"2px solid #0D9488", background:"#0D9488", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }
          : { padding:"10px 16px", borderRadius: 20, border:"2px solid var(--border)", background:"#fff", fontSize:13, fontWeight:600, color:"var(--ink-500)", cursor:"pointer", transition:"all .2s" }
      }
      onMouseEnter={(e)=>{ if(!isOn) (e.currentTarget.style.borderColor = "#0D9488", e.currentTarget.style.color = "#0D9488"); }}
      onMouseLeave={(e)=>{ if(!isOn) (e.currentTarget.style.borderColor = "var(--border)", e.currentTarget.style.color = "var(--ink-500)"); }}
    >
      {label}
    </button>
  );

  const toggleFrom = (key: keyof Filters, opt: string) => {
    const set = new Set(value[key] || []);
    set.has(opt) ? set.delete(opt) : set.add(opt);
    onChange({ ...value, [key]: Array.from(set) });
  };

  return (
    <div style={{ background:"#fff", padding:24, borderBottom:`1px solid var(--border)`, display:"flex", gap:16, flexWrap:"wrap" }}>
      <Section title="Type Contrat">
        {["CDI","CDD","Stage","Freelance"].map(o => pill(o, !!value.type?.includes(o), () => toggleFrom("type", o)))}
      </Section>
      <Section title="Gouvernorat">
        {["Tunis","Ariana","Ben Arous","Manouba","Sfax","Sousse"].map(o => pill(o, !!value.gov?.includes(o), () => toggleFrom("gov", o)))}
      </Section>
      <Section title="TÃ©lÃ©travail">
        {["TÃ©lÃ©travail complet","Hybride","PrÃ©sentiel"].map(o => pill(o, !!value.mode?.includes(o), () => toggleFrom("mode", o)))}
      </Section>
      <Section title="SpÃ©cialitÃ©s">
        {["IT","Marketing","Ventes","RH","Finance"].map(o => pill(o, !!value.specialty?.includes(o), () => toggleFrom("specialty", o)))}
      </Section>
    </div>
  );
}

