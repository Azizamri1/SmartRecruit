import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toAbsoluteMedia } from "../../Services/media";
import { Eye, Rocket } from "lucide-react";
import "./JobCard.css";

type User = {
  full_name?: string;
  is_admin?: boolean;
  account_type?: "admin" | "company" | "candidate";
  company_name?: string | null;
};

export type JobCardProps = {
  id: number;
  title: string;
  company_name?: string | null;
  company_logo_url?: string | null;
  experience_min?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_is_confidential?: boolean | null;
  skills?: string[];
  posted_at?: string | null;
  updated_at?: string | null;
  has_applied?: boolean;
  onApply?: (id: number) => void;
  onView?: (id: number) => void;
};

function fact(label:string, value:string) {
  return (
    <div className="factItem">
      <div className="factLabel">{label}</div>
      <div className="factValue">{value}</div>
    </div>
  );
}

export default function JobCard(props: JobCardProps){
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("me");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const isCompany = !!(user?.account_type === "company" || user?.company_name);
  const {
    id, title, company_name, company_logo_url,
    experience_min, employment_type, work_mode,
    salary_min, salary_max, salary_currency, salary_is_confidential,
    skills = [], posted_at, updated_at, has_applied, onApply, onView
  } = props;

  const logo = toAbsoluteMedia(company_logo_url || null);

  const salary = useMemo(() => {
    if (salary_is_confidential) return "Confidentiel";

    const currency = salary_currency || "DT";
    const hasMin = salary_min !== null && salary_min !== undefined;
    const hasMax = salary_max !== null && salary_max !== undefined;

    if (hasMin && hasMax) {
      return `${salary_min} - ${salary_max} ${currency}`;
    } else if (hasMin) {
      return `â‰¥ ${salary_min} ${currency}`;
    } else if (hasMax) {
      return `â‰¤ ${salary_max} ${currency}`;
    } else {
      return "Salaire non spécifié";
    }
  }, [salary_min, salary_max, salary_currency, salary_is_confidential]);

  return (
    <article className="jobCard jobCard--tj group">
      {/* Header */}
      <header className="jobCard__header">
        {/* logo on the far left of header */}
        {logo && (
          <div className="jobCard__brand">
            <img className="jobCard__brandImg" src={logo} alt="" aria-hidden="true" />
          </div>
        )}
        <div className="jobCard__left">
          <div className="jobCard__headText">
            <h3 className="jobCard__title">{title}</h3>
            {company_name && <div className="jobCard__company">{company_name}</div>}
          </div>
        </div>
      </header>

      {/* Info grid (always 2 columns) */}
      <div className="jobCard__facts jobCard__facts--tj">
        {fact("Expérience", experience_min ?? "—")}
        {fact("Type d'emploi", employment_type ?? "—")}
        {fact("Mode de travail", work_mode ?? "—")}
        {fact("Rémunération", salary)}
      </div>

      {/* Compétences section title like TuniJobs */}
      {!!(skills?.length) && <div className="jobCard__sectionTitle">Compétences</div>}

      {/* Skills (â‰¤3 + +N) */}
      {!!(skills?.length) && (
        <ul className="jlSkills">
          {skills.slice(0,3).map((s,i)=><li key={i} className="jlSkill">{s}</li>)}
          {skills.length > 3 && <li className="jlSkill jlSkill--more">+{skills.length-3} de plus</li>}
        </ul>
      )}

      {/* Dates + buttons */}
      <div className="jobCard__footer">
        <div className="jobCard__dates jobCard__dates--tj">
          <span>Publié: {posted_at ? new Date(posted_at).toLocaleDateString() : "—"}</span>
          <span>Modifié: {updated_at ? new Date(updated_at).toLocaleDateString() : "—"}</span>
        </div>
        <div className="jobCard__actions jobCard__actions--tj">
          <Link className="jlBtn jlBtn--outlineTeal" to={`/jobs/${id}`}><Eye size={16} />&nbsp; Voir l'offre</Link>
          {has_applied ? (
            <span className="jlBtn jlBtn--applied" aria-disabled="true">
              <Rocket size={16} />&nbsp; Postulé
            </span>
          ) : (
            <a
              className="jlBtn jlBtn--outlineBlue"
              href={user && !isCompany ? `/apply/${id}` : !user ? '/auth/signin' : undefined}
              {...(isCompany ? { 'aria-disabled': true, style: { pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' } } : {})}
            >
              <Rocket size={16} />&nbsp; Postuler
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
