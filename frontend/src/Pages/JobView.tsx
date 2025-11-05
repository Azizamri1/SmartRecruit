import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getJob, type JobDetail } from "../Services/jobsApi";
import { getCompanyByUserId, type PublicCompany } from "../Services/companyApi";
import { toAbsoluteMedia } from "../Services/media";
import InfoBadge from "../components/common/InfoBadge";
import "../components/common/InfoBadge.css";
import {
  Briefcase,        // employment type
  Globe,            // work mode
  GraduationCap,    // education
  Wallet,           // salary
  MapPin,           // location
  Clock,            // experience
} from "lucide-react";
import "./JobView.css";

const fmtMoney = (v?: number | null, curr?: string | null) =>
  typeof v === "number" ? `${v.toLocaleString()}${curr ? ` ${curr}` : ""}` : null;

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "Not specified");

const joinLocation = (city?: string | null, country?: string | null) =>
  [city, country].filter(Boolean).join(", ") || "Not specified";

const buildSalaryText = (j: any) => {
  if (!j) return "";
  if (j.salary_is_confidential) return "Confidentiel";
  if (j.salary_min && j.salary_max) return `${j.salary_min}â€“${j.salary_max} ${j.salary_currency || ""}`.trim();
  if (j.salary_min) return `${j.salary_min} ${j.salary_currency || ""}`.trim();
  if (j.salary_max) return `${j.salary_max} ${j.salary_currency || ""}`.trim();
  return "";
};

function isBlank(s?: string | null | string[]) {
  if (Array.isArray(s)) return s.length === 0;
  return !s || !String(s).trim();
}

// Render HTML safely
function HTML({ html }: { html?: string | null }) {
  if (!html || !html.trim()) return null;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// Render text or array
function RenderText({ text }: { text?: string | null | string[] }) {
  if (isBlank(text)) return null;
  if (Array.isArray(text)) {
    return (
      <ul>
        {text.map((item, i) => (
          <li key={i}>{RenderText({ text: item })}</li>
        ))}
      </ul>
    );
  }
  const parts = String(text).trim().split(/\n{2,}/g);
  return (
    <>
      {parts.map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </>
  );
}

type User = {
  full_name?: string;
  is_admin?: boolean;
  account_type?: "admin" | "company" | "candidate";
  company_name?: string | null;
};

export default function JobView() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [company, setCompany] = useState<PublicCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!jobId) return;
      setLoading(true);
      try {
        const j = await getJob(Number(jobId));
        if (cancelled) return;
        setJob(j);

        if (j && typeof j.owner_user_id === "number") {
          const c = await getCompanyByUserId(j.owner_user_id);
          if (!cancelled) setCompany(c);
        } else {
          if (!cancelled) setCompany(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("me");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const logoUrl = toAbsoluteMedia(company?.logo_url || job?.company_logo_url || null);
  const companyDescription = company?.company_overview || job?.company_overview || "No company description available.";

  const salaryText = useMemo(() => {
    if (!job) return "Not specified";
    if (job.salary_is_confidential) return "Confidential";
    const min = fmtMoney(job.salary_min, job.salary_currency);
    const max = fmtMoney(job.salary_max, job.salary_currency);
    if (min && max) return `${min} â€“ ${max}`;
    return min || max || "Not specified";
  }, [job]);

  const isCompany = !!(user?.account_type === "company" || user?.company_name);

  const sections = [
    {
      id: "company-overview",
      title: "Company overview",
      content: job?.company_overview ?? company?.company_overview ?? null,
    },
    {
      id: "job-description",
      title: "Job description",
      content: job?.offer_description ?? null,
    },
    {
      id: "missions",
      title: "Missions",
      content: job?.missions ?? null,
    },
    {
      id: "profile-requirements",
      title: "Profile requirements",
      content: job?.profile_requirements ?? null,
    },
  ];
  const visibleSections = sections.filter(s => !isBlank(s.content));

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page">
        <p>Job offer not found.</p>
      </div>
    );
  }

  return (
    <div className="job-offer-container">
      <header className="job-header">
        <Link to="/jobs" className="back-button">
          <span>&larr;</span> Back to listings
        </Link>
        <div className="job-title-section">
          {logoUrl ? (
            <img src={logoUrl} alt={`${job.company_name ?? "Company"} logo`} className="company-logo" />
          ) : (
            <div className="company-logo-placeholder" style={{ width: 64, height: 64, background: "#222", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24, color: "#fff", fontWeight: 600 }}>{(job.company_name || "??").slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="job-title-text">
            <h1>{job.title}</h1>
            <h2>{job.company_name ?? "Company Name"}</h2>
          </div>
        </div>
        <div className="quick-info-badges">
          {/* Experience */}
          <InfoBadge
            tone="blue"
            compact
            label="ExpÃ©rience"
            value={job?.experience_min || "â€”"}
            icon={<Clock aria-hidden />}
          />

          {/* Employment type */}
          <InfoBadge
            tone="green"
            compact
            label="Type d'emploi"
            value={job?.employment_type || "â€”"}
            icon={<Briefcase aria-hidden />}
          />

          {/* Work mode */}
          <InfoBadge
            tone="amber"
            compact
            label="Mode de travail"
            value={job?.work_mode || "â€”"}
            icon={<Globe aria-hidden />}
          />

          {/* Education */}
          <InfoBadge
            tone="pink"
            compact
            label="Niveau d'Ã©tude"
            value={job?.education_level || "â€”"}
            icon={<GraduationCap aria-hidden />}
          />

          {/* Location (optional 5th card) */}
          {!!(job?.location_city || job?.location_country) && (
            <InfoBadge
              tone="gray"
              compact
              label="Localisation"
              value={joinLocation(job?.location_city, job?.location_country)}
              icon={<MapPin aria-hidden />}
            />
          )}

          {/* Salary (optional 6th card) */}
          {(() => {
            const s = buildSalaryText(job);
            return s ? (
              <InfoBadge
                tone="blue"
                compact
                label="Salaire"
                value={s}
                icon={<Wallet aria-hidden />}
              />
            ) : null;
          })()}
        </div>
      </header>

      <div className="job-view-layout">
        <main className="main-content">
          {visibleSections.map(sec => (
            <section key={sec.id} id={sec.id} className="job-section">
              <h3>{sec.title}</h3>
              {sec.id === "missions" ? (
                <RenderText text={sec.content!} />
              ) : (
                <HTML html={sec.content as string} />
              )}
            </section>
          ))}

          {job.skills && job.skills.length > 0 && (
            <section className="job-section">
              <h3>Required Skills</h3>
              <div className="skills-tags">
                {job.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="sidebar">
          <div className="card job-overview-card">
            <div className="job-details-card">
              <div className="detail-row">
                <span className="detail-label">Posted Date</span>
                <span className="detail-value">{fmtDate(job.posted_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Deadline</span>
                <span className="detail-value">{fmtDate(job.deadline)}</span>
              </div>
            </div>
            <button
              className="apply-now-btn"
              onClick={() => navigate(`/apply/${jobId}`)}
              {...(isCompany ? { 'aria-disabled': true, style: { pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' } } : {})}
            >
              Apply Now
            </button>
          </div>

          <div className="card company-info-card">
            {logoUrl ? (
              <img src={logoUrl} alt={`${job.company_name ?? "Company"} logo`} className="company-logo" />
            ) : (
              <div className="company-logo-placeholder" style={{ width: 64, height: 64, background: "#222", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 24, color: "#fff", fontWeight: 600 }}>{(job.company_name || "??").slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <h4>{job.company_name ?? "Company Name"}</h4>
            <p>{companyDescription}</p>
            <a href="#">View Company Profile</a>
          </div>
          <div className="card action-buttons">
            <button className="save-job-btn">Save Job</button>
            <button className="share-btn">Share</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
