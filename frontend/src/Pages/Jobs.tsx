import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./jobs.theme.css";
import "../components/jobs/JobCardsGrid.css";
import "../components/jobs/JobCard.css";
import HeroSearch from "../components/jobs/HeroSearch";
import FilterBar from "../components/jobs/FilterBar";
import type { Filters } from "../components/jobs/FilterBar";
import "../components/jobs/FilterBar.css";
import JobCardsGrid from "../components/jobs/JobCardsGrid";
import { type JobCardProps } from "../components/jobs/JobCard";
import { getJobs } from "../Services/jobsListApi";
import type { JobDetail } from "../Services/jobsApi";
import { toAbsoluteMedia } from "../Services/media";

type User = {
  full_name?: string;
  is_admin?: boolean;
  account_type?: "admin" | "company" | "candidate";
  company_name?: string | null;
};

export default function Jobs(){
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ type: [], gov: [], mode: [], specialty: [] });
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("me");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const isCompany = !!(user?.account_type === "company" || user?.company_name);

  const handleApply = (jobId: number) => {
    if (!user) {
      navigate('/auth/signin');
    } else if (!isCompany) {
      navigate(`/apply/${jobId}`);
    }
  };

  const handleView = (jobId: number) => {
    navigate(`/jobs/${jobId}`);
  };

  // Map API job data to JobCardProps including logoUrl
  const toCard = (j: JobDetail): JobCardProps => ({
    id: j.id,
    title: j.title,
    company_name: j.company_name || null,
    company_logo_url: j.company_logo_url || null,
    experience_min: j.experience_min || null,
    employment_type: j.employment_type || null,
    work_mode: j.work_mode || null,
    salary_min: j.salary_min || null,
    salary_max: j.salary_max || null,
    salary_currency: j.salary_currency || null,
    salary_is_confidential: j.salary_is_confidential || false,
    skills: j.skills || [],
    posted_at: j.posted_at || null,
    updated_at: j.updated_at || null,
    has_applied: j.has_applied || false,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // server filtering later; for now grab page and filter client-side
        const data = await getJobs();
        setJobs(data);
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(j => {
      // search fields: title, company, skills, descriptions
      const txt = [
        j.title, j.company_name, (j.skills || []).join(" "),
        j.offer_description, j.company_overview
      ].filter(Boolean).join(" ").toLowerCase();
      const qOk = !q || txt.includes(q);

      // filters (AND within each category group)
      const typeOk = !filters.type?.length || (j.employment_type && filters.type.includes(j.employment_type));
      const modeOk = !filters.mode?.length || (j.work_mode && filters.mode.includes(j.work_mode));
      const govOk  = !filters.gov?.length  || (j.location_city && filters.gov.includes(j.location_city) || (j as any).governorate && filters.gov!.includes((j as any).governorate));
      const specOk = !filters.specialty?.length || ((j as any).specialty && filters.specialty.includes((j as any).specialty));

      return qOk && typeOk && modeOk && govOk && specOk;
    });
  }, [jobs, query, filters]);

  const cards: JobCardProps[] = useMemo(
    () => filtered.map(toCard),
    [filtered]
  );

  return (
    <div className="jobsTheme">
      <HeroSearch
        defaultQuery=""
        onSubmit={(q)=> setQuery(q)}
      />

      <FilterBar
        value={filters}
        onChange={setFilters}
        count={filtered.length}
      />

      <div className="jobsPageContainer">
        <div className="jobGrid">
          {loading && <div style={{padding:"16px"}}>Chargementâ€¦</div>}
          {!loading && cards.length > 0 && (
            <JobCardsGrid
              jobs={cards}
              onApply={handleApply}
              onView={handleView}
            />
          )}
          {!loading && cards.length === 0 && (
            <div style={{padding:"32px", textAlign:"center"}}>
              <div style={{fontSize:"20px"}}>Aucune offre ne correspond Ã  votre recherche</div>
              <div style={{color:"var(--ink-500)"}}>Essayez d'effacer des filtres ou utilisez d'autres mots-clÃ©s.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
