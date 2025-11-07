import { useState } from "react";
import FilterModal from "./FilterModal";
import JobCount from "./JobCount";

export type Filters = { type: string[]; gov: string[]; mode: string[]; specialty: string[] };
const empty: Filters = { type:[], gov:[], mode:[], specialty:[] };

const PRESETS = {
  type: ["CDI","CDD","Stage","Freelance","CIVP","Intérim"],
  gov: ["Tunis","Ariana","Ben Arous","Manouba","Sfax","Sousse"],
  mode: ["Télétravail complet","Hybride","Présentiel"],
  specialty: ["IT","Marketing","Ventes","RH","Finance"]
};

export default function FilterBar({
  value = empty, onChange, count
}:{ value?: Filters; onChange:(f:Filters)=>void; count?: number }){
  const [open, setOpen] = useState<null | keyof Filters>(null);

  const btn = (k: keyof Filters, label: string) => {
    const count = value[k]?.length ?? 0;
    const active = count > 0;
    return (
      <button type="button" onClick={()=>setOpen(k)}
        className={`fb-btn ${active? "is-active":""}`}>
        {label}{active? ` (${count})` : ""}
      </button>
    );
  };

  return (
    <>
      <div className="filterBar">
        {btn("type","Type Contrat")}
        {btn("gov","Gouvernorat")}
        {btn("mode","Télétravail")}
        {btn("specialty","Spécialités")}
        {count !== undefined && <JobCount count={count} />}
      </div>

      {open && (
        <FilterModal
          title={
            open==="type" ? "Type Contrat" :
            open==="gov" ? "Gouvernorat" :
            open==="mode" ? "Télétravail" : "Spécialités"
          }
          options={PRESETS[open]}
          selected={value[open]}
          onClose={()=>setOpen(null)}
          onClear={()=>{ onChange({ ...value, [open]: [] }); setOpen(null); }}
          onApply={(sel)=>{ onChange({ ...value, [open]: sel }); setOpen(null); }}
        />
      )}
    </>
  );
}

