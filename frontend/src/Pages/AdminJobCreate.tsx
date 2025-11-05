import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SRMultiStep, { SRSection } from "../components/forms/SRMultiStep";
import { useFormWizard } from "../components/forms/useFormWizard";
import { createJob } from "../Services/jobsApi";
import { getCompanyMe } from "../Services/companyApi";
import SuccessModal from "../components/common/SuccessModal";
import RichTextModal from "../components/form/RichTextModal";
import { linesToHtml, htmlToLines } from "../utils/richList";
import { Trash2, Pencil } from "lucide-react";

const steps = ["Basics", "Contract & Location", "Qualifications", "Role Content", "Compensation & Timeline", "Preview"];

function SkillsChips({ value, onChange }: { value: string[]; onChange: (arr: string[]) => void }) {
  const [txt, setTxt] = React.useState("");
  const add = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const next = Array.from(new Set([...(value || []), v]));
    onChange(next);
  };
  const remove = (v: string) => onChange((value || []).filter(x => x !== v));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {(value || []).map(v => (
          <span key={v} style={{ border: "1px solid #9CA3AF", borderRadius: 999, padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {v}
            <button type="button" onClick={() => remove(v)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#000", fontSize: '16px', padding: '0.1em 0.1em' }} aria-label={`Remove ${v}`}>Ã—</button>
          </span>
        ))}
      </div>
      <input
        className="srForm__input"
        value={txt}
        placeholder="Type a skill and press Enter"
        onChange={e => setTxt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(txt);
            setTxt("");
          } else if (e.key === "Backspace" && txt === "" && (value || []).length) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={() => { if (txt.trim()) { add(txt); setTxt(""); } }}
      />
    </div>
  );
}

const EDUCATION_OPTIONS = [
  "High School Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "MBA",
  "PhD / Doctorate",
  "Bootcamp / Certification",
  "No formal education specified",
  "Other"
];

type JobDraft = {
  title?: string; company_name?: string; status?: "draft"|"published"|"archived";
  employment_type?: string; work_mode?: string; location_city?: string; location_country?: string;
  education_level?: string; experience_min?: string; skills?: string[];
  offer_description?: string; missions_text?: string; profile_requirements?: string; company_overview?: string;
  salary_min?: number; salary_max?: number; salary_currency?: string; salary_is_confidential?: boolean; deadline?: string;
};

export default function AdminJobCreate(){
  const nav = useNavigate();
  const { step, steps: s, data, patch, next, prev, isLast } = useFormWizard<JobDraft>(steps, { status:"published" });
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Track step index for modal management
  const ROLE_STEP_INDEX = 3; // "Role Content" is step 3 (0-based index)

  // Rich text editor modals - default to false to prevent auto-opening
  const [showCompanyOverviewEditor, setShowCompanyOverviewEditor] = useState(false);
  const [showOfferDescriptionEditor, setShowOfferDescriptionEditor] = useState(false);
  const [showProfileRequirementsEditor, setShowProfileRequirementsEditor] = useState(false);

  // Missions rich text state
  const [missions, setMissions] = useState<string[]>([]);
  const [missionsHTML, setMissionsHTML] = useState<string>("");
  const [showMissionsEditor, setShowMissionsEditor] = useState(false);

  // Sync missions HTML when missions array changes
  React.useEffect(() => {
    setMissionsHTML(linesToHtml(missions));
  }, [missions]);

  // Close all modals when leaving the Role step
  React.useEffect(() => {
    if (step !== ROLE_STEP_INDEX) {
      setShowCompanyOverviewEditor(false);
      setShowOfferDescriptionEditor(false);
      setShowProfileRequirementsEditor(false);
      setShowMissionsEditor(false);
    }
  }, [step]);

  // Autofill from company profile
  useEffect(() => {
    let alive = true;
    getCompanyMe().then(u => {
      if (!alive || !u) return;

      // Autofill only empty fields
      patch({
        company_name: data.company_name || u.company_name || "",
        location_city: data.location_city || u.location_city || "",
        location_country: data.location_country || u.location_country || "",
      } as Partial<JobDraft>);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
        if (!data.title || data.title.trim() === "") {
            e.title = "Required";
        } else if (data.title.length < 3 || data.title.length > 120) {
            e.title = "Must be between 3 and 120 characters.";
        }
    }
    if (step === 1) {
        if ((data.location_city && data.location_city.trim() !== "") && (!data.location_country || data.location_country.trim() === "")) {
            e.location_country = "Required if city is provided.";
        }
        if ((data.location_country && data.location_country.trim() !== "") && (!data.location_city || data.location_city.trim() === "")) {
            e.location_city = "Required if country is provided.";
        }
        if (!data.employment_type || data.employment_type.trim() === "") e.employment_type = "Required";
    }
    if (step === 2) {
        if (data.skills && data.skills.length > 20) {
            e.skills = "Maximum 20 skills.";
        }
    }
    if (step === 3) {
        if (!data.offer_description || data.offer_description.trim() === "") e.offer_description = "Required";
    }
    if (step === 4) {
        if (data.salary_min !== undefined && (isNaN(data.salary_min) || !Number.isInteger(data.salary_min) || data.salary_min < 0)) {
            e.salary_min = "Must be an integer â‰¥ 0.";
        }
        if (data.salary_max !== undefined && (isNaN(data.salary_max) || !Number.isInteger(data.salary_max) || data.salary_max < 0)) {
            e.salary_max = "Must be an integer â‰¥ 0.";
        }
        if ((data.salary_min !== undefined || data.salary_max !== undefined) && data.salary_min !== undefined && data.salary_max !== undefined && data.salary_min > data.salary_max) {
            e.salary_range = "Minimum salary must be less than or equal to maximum.";
        }
        if (data.deadline && data.deadline.trim() !== "" && new Date(data.deadline) < new Date(new Date().toDateString())) {
            e.deadline = "Deadline must be today or later.";
        }
        if (data.salary_is_confidential && (data.salary_min !== undefined || data.salary_max !== undefined)) {
            e.salary_confidential = "If confidential, salary range should be empty.";
        }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function buildJobPayload(state: any) {
    const splitLines = (txt?: string) =>
      (txt || "")
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);

    const unique = (arr?: string[]) =>
      Array.isArray(arr) ? Array.from(new Set(arr.map(s => s.trim()).filter(Boolean))) : [];

    const toInt = (v: any) =>
      (v === "" || v === null || v === undefined) ? undefined : Number.parseInt(String(v), 10);

    const payload = {
      // Basic Job Info
      title: String(state.title || "").trim(),
      status: (state.status || "published") as "published" | "draft" | "archived",

      // Company Info
      company_name: state.company_name?.trim() || undefined,
      company_overview: state.company_overview?.trim() || undefined,

      // Employment Details
      employment_type: state.employment_type?.trim() || undefined,
      work_mode: state.work_mode?.trim() || undefined,
      location_city: state.location_city?.trim() || undefined,
      location_country: state.location_country?.trim() || undefined,

      // Position Description
      offer_description: state.offer_description?.trim() || undefined,
      missions,
      profile_requirements: state.profile_requirements?.trim() || undefined,

      // Requirements
      education_level: state.education_level || undefined,
      experience_min: state.experience_min?.trim() || undefined,
      skills: unique(state.skills),

      // Compensation & Deadlines
      salary_min: toInt(state.salary_min),
      salary_max: toInt(state.salary_max),
      salary_currency: state.salary_currency?.trim() || undefined,
      salary_is_confidential: Boolean(state.salary_is_confidential ?? false),
      deadline: state.deadline || undefined,
    };

    return Object.fromEntries(Object.entries(payload).filter(([,v]) => v !== undefined));
  }

  const formatPreview = (obj: any): any => {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length <= 3) return [k, v];
          return [k, `${v.slice(0, 3).join(", ")} (+${v.length - 3} more)`];
        }
        return [k, v];
      })
    );
  };

  const formatLocation = (city?: string, country?: string) => {
    if (city && country) return `${city}, ${country}`;
    return city || country || '';
  };

  const formatSalary = (min?: number, max?: number, currency?: string, confidential?: boolean) => {
    if (confidential) return 'Confidential';
    const parts: string[] = [];
    if (min !== undefined) parts.push(`${min} ${currency}`);
    if (max !== undefined) parts.push(`${max} ${currency}`);
    return parts.join(' - ') || 'Not specified';
  };

  const renderChips = (items?: string[]) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const clean = Array.from(new Set(items.map(s => s.trim()).filter(Boolean)));
    const visible = clean.slice(0, 3);
    const more = clean.length > 3 ? clean.length - 3 : 0;
    return (
      <div className="chips" style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
        {visible.map((item, i) => (
          <span key={i} style={{padding: '4px 8px', background: '#f0f0f0', borderRadius: '12px', fontSize: '14px'}}>
            {item}
          </span>
        ))}
        {more > 0 && (
          <span style={{padding: '4px 8px', background: '#e0e0e0', borderRadius: '12px', fontSize: '14px', color: '#666'}}>
            +{more} more
          </span>
        )}
      </div>
    );
  };

  const handleNext = () => { if (validate()) next(); };
  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = buildJobPayload(data);
    const result = await createJob(payload);
    setCreatedId(result.id || null);
    setShowSuccess(true);
  };

  const handleSaveDraft = async () => {
    patch({ status: "draft" as const });
    if (!validate()) return;
    const payload = buildJobPayload({ ...data, status: "draft" });
    await createJob(payload);
    setShowSuccess(true);
  };

  return (
    <>
    <SRMultiStep title="Create a Job" subtitle="Use the steps below to publish a job offer" steps={s} active={step}>
      {step===0 && (
        <>
          <SRSection title="Basics">
            <div className="srForm__field">
              <label className="srForm__label">Job Title</label>
              <input className="srForm__input" placeholder="Senior React Developer" value={data.title||""} onChange={e=>patch({title:e.target.value})}/>
              {errors.title && <div className="srForm__error">{errors.title}</div>}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Company Name</label>
              <input className="srForm__input" value={data.company_name||""} onChange={e=>patch({company_name:e.target.value})}/>
              <div className="srForm__hint">Shown on the job card and detail page.</div>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Status</label>
              <select className="srForm__select" value={data.status} onChange={e=>patch({status:e.target.value as JobDraft["status"]})}>
                <option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
              </select>
              <div className="srForm__hint">Draft keeps the offer private.</div>
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev} disabled>Back</button>
            <div>
              <button className="srBtn srBtn--ghost" onClick={handleSaveDraft}>Save draft</button>
              <button className="srBtn srBtn--primary" onClick={handleNext} style={{marginLeft:12}}>Next</button>
            </div>
          </div>
        </>
      )}

      {step===1 && (
        <>
          <SRSection title="Contract & Location">
            <div className="srForm__field">
              <label className="srForm__label">Employment Type</label>
              <select className="srForm__select" value={data.employment_type||""} onChange={e=>patch({employment_type:e.target.value})}>
                <option value="">Select…</option><option>CDI</option><option>CDD</option><option>Internship</option><option>Apprenticeship</option>
              </select>
              {errors.employment_type && <div className="srForm__error">{errors.employment_type}</div>}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Work mode</label>
              <select className="srForm__select" value={data.work_mode||""} onChange={e=>patch({work_mode:e.target.value})}>
                <option value="">Select…</option><option>On-site</option><option>Remote</option><option>Hybrid</option>
              </select>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">City</label>
              <input className="srForm__input" value={data.location_city||""} onChange={e=>patch({location_city:e.target.value})}/>
              {errors.location_city && <div className="srForm__error">{errors.location_city}</div>}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Country</label>
              <input className="srForm__input" value={data.location_country||""} onChange={e=>patch({location_country:e.target.value})}/>
              <div className="srForm__hint">City and country appear together.</div>
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
            <button className="srBtn srBtn--primary" onClick={handleNext}>Next</button>
          </div>
        </>
      )}

      {step===2 && (
        <>
          <SRSection title="Qualifications">
            <div className="srForm__field">
              <label className="srForm__label">Education Level</label>
              <select className="srForm__select" value={data.education_level || ""} onChange={e=>patch({education_level: e.target.value || undefined})}>
                <option value="">Select education level</option>
                {EDUCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Experience</label>
              <input className="srForm__input" placeholder="1–2 years" value={data.experience_min||""} onChange={e=>patch({experience_min:e.target.value})}/>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Skills</label>
              <SkillsChips value={data.skills || []} onChange={(arr)=>patch({skills: arr})}/>
              {errors.skills && <div className="srForm__error">{errors.skills}</div>}
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
            <button className="srBtn srBtn--primary" onClick={handleNext}>Next</button>
          </div>
        </>
      )}

      {step===3 && (
        <>
          <SRSection title="Role Content">
            <div className="srForm__field">
              <label className="srForm__label">Company Overview</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button
                  type="button"
                  className="srBtn srBtn--ghost"
                  onClick={() => setShowCompanyOverviewEditor(true)}
                  style={{flex: 1, justifyContent: 'flex-start'}}
                >
                  {data.company_overview ? 'âœï¸ Edit Company Overview' : 'ðŸ“ Add Company Overview'}
                </button>
                {data.company_overview && (
                  <button
                    type="button"
                    className="srBtn srBtn--ghost"
                    onClick={() => patch({company_overview: ''})}
                    style={{padding: '8px'}}
                  >
                    ðŸ—‘ï¸
                  </button>
                )}
              </div>
              {data.company_overview && (
                <div className="previewClamped" dangerouslySetInnerHTML={{__html: data.company_overview}} />
              )}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Offer Description</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button
                  type="button"
                  className="srBtn srBtn--ghost"
                  onClick={() => setShowOfferDescriptionEditor(true)}
                  style={{flex: 1, justifyContent: 'flex-start'}}
                >
                  {data.offer_description ? 'âœï¸ Edit Offer Description' : 'ðŸ“ Add Offer Description'}
                </button>
                {data.offer_description && (
                  <button
                    type="button"
                    className="srBtn srBtn--ghost"
                    onClick={() => patch({offer_description: ''})}
                    style={{padding: '8px'}}
                  >
                    ðŸ—‘ï¸
                  </button>
                )}
              </div>
              {data.offer_description && (
                <div className="previewClamped" dangerouslySetInnerHTML={{__html: data.offer_description}} />
              )}
              {errors.offer_description && <div className="srForm__error">{errors.offer_description}</div>}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Missions</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button
                  type="button"
                  className="srBtn srBtn--ghost"
                  onClick={() => setShowMissionsEditor(true)}
                  style={{flex: 1, justifyContent: 'flex-start'}}
                >
                  {missionsHTML ? 'âœï¸ Edit Missions' : 'ðŸ“ Add Missions'}
                </button>
                {missionsHTML && (
                  <button
                    type="button"
                    className="srBtn srBtn--ghost"
                    onClick={() => { setMissions([]); setMissionsHTML(""); }}
                    style={{padding: '8px'}}
                  >
                    ðŸ—‘ï¸
                  </button>
                )}
              </div>
              {missionsHTML && (
                <div className="previewClamped" dangerouslySetInnerHTML={{ __html: missionsHTML }} />
              )}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Profile Requirements</label>
              <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                <button
                  type="button"
                  className="srBtn srBtn--ghost"
                  onClick={() => setShowProfileRequirementsEditor(true)}
                  style={{flex: 1, justifyContent: 'flex-start'}}
                >
                  {data.profile_requirements ? 'âœï¸ Edit Profile Requirements' : 'ðŸ“ Add Profile Requirements'}
                </button>
                {data.profile_requirements && (
                  <button
                    type="button"
                    className="srBtn srBtn--ghost"
                    onClick={() => patch({profile_requirements: ''})}
                    style={{padding: '8px'}}
                  >
                    ðŸ—‘ï¸
                  </button>
                )}
              </div>
              {data.profile_requirements && (
                <div className="previewClamped" dangerouslySetInnerHTML={{__html: data.profile_requirements}} />
              )}
              <div className="srForm__hint">Write freely. This is shown as a paragraph/section.</div>
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
            <button className="srBtn srBtn--primary" onClick={handleNext}>Next</button>
          </div>
        </>
      )}

      {step===4 && (
        <>
          <SRSection title="Compensation & Timeline">
            <div className="srForm__field">
              <label className="srForm__label">Salary Min</label>
              <input type="number" className="srForm__input" disabled={data.salary_is_confidential} value={data.salary_min ?? ''} onChange={e=>patch({salary_min:e.target.value === '' ? undefined : +e.target.value})}/>
              {errors.salary_min && <div className="srForm__error">{errors.salary_min}</div>}
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Salary Max</label>
              <input type="number" className="srForm__input" disabled={data.salary_is_confidential} value={data.salary_max ?? ''} onChange={e=>patch({salary_max:e.target.value === '' ? undefined : +e.target.value})}/>
              {errors.salary_max && <div className="srForm__error">{errors.salary_max}</div>}
            </div>
            {errors.salary_range && <div className="srForm__error">{errors.salary_range}</div>}
            <div className="srForm__field">
              <label className="srForm__label">Currency</label>
              <input className="srForm__input" placeholder="DT, EUR, USD" value={data.salary_currency||"EUR"} onChange={e=>patch({salary_currency:e.target.value})}/>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">
                <input type="checkbox" checked={data.salary_is_confidential||false} onChange={e=>patch({salary_is_confidential:e.target.checked})}/>
                Salary is confidential
              </label>
            </div>
            <div className="srForm__field">
              <label className="srForm__label">Application Deadline</label>
              <input type="date" className="srForm__input" value={data.deadline||""} onChange={e=>patch({deadline:e.target.value})}/>
              {errors.deadline && <div className="srForm__error">{errors.deadline}</div>}
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
            <button className="srBtn srBtn--primary" onClick={handleNext}>Next</button>
          </div>
        </>
      )}

      {step===5 && (
        <>
          <SRSection title="Job Summary" columns="two">
            <div style={{background: '#fafafa', padding: '16px', borderRadius: '8px'}}>
              <div style={{fontSize: '20px', fontWeight: 'bold', marginBottom: '12px'}}>{data.title}</div>
              {data.company_name && <div style={{fontSize: '16px', color: '#666', marginBottom: '8px'}}>{data.company_name}</div>}
              {data.status && data.status !== 'published' && <div style={{display: 'inline-block', background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', marginBottom: '8px'}}>{data.status.toUpperCase()}</div>}
              <div style={{marginBottom: '8px'}}><strong>Location:</strong> {formatLocation(data.location_city, data.location_country)}</div>
              <div style={{marginBottom: '8px'}}><strong>Employment:</strong> {data.employment_type} - {data.work_mode}</div>
              <div style={{marginBottom: '8px'}}><strong>Education:</strong> {data.education_level || 'Not specified'} | <strong>Experience:</strong> {data.experience_min || 'Not specified'}</div>
              <div style={{marginBottom: '8px'}}>
                <strong>Skills:</strong>
                {renderChips(data.skills)}
              </div>
              <div style={{marginBottom: '12px'}}>
                <strong>Missions:</strong>
                <ul style={{paddingLeft: "1.25rem", margin: "8px 0"}}>
                  {missions.slice(0,6).map((m,i)=> <li key={i}>{m}</li>)}
                </ul>
              </div>
              <div style={{marginBottom: '8px'}}><strong>Salary:</strong> {formatSalary(data.salary_min, data.salary_max, data.salary_currency, data.salary_is_confidential)}</div>
              {data.deadline && <div><strong>Deadline:</strong> {data.deadline}</div>}
            </div>
          </SRSection>
          <SRSection title="Offer Content" columns="two">
            <div style={{background: '#fafafa', padding: '16px', borderRadius: '8px', minHeight: '300px'}}>
              {data.company_overview && <div style={{marginBottom: '8px'}}><strong>Company Overview:</strong> {data.company_overview}</div>}
              {data.offer_description && <div style={{marginBottom: '8px'}}><strong>Offer Description:</strong> {data.offer_description}</div>}
              {data.profile_requirements && <div><strong>Profile Requirements:</strong> {data.profile_requirements}</div>}
            </div>
          </SRSection>
          <div className="srForm__btns">
            <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
            <div>
              <button className="srBtn srBtn--ghost">Save draft</button>
              <button className="srBtn srBtn--primary" onClick={handleSubmit} style={{marginLeft:12}}>Publish</button>
            </div>
          </div>
        </>
      )}
    </SRMultiStep>
    <SuccessModal
      open={showSuccess}
      title={data.title || ""}
      onClose={() => setShowSuccess(false)}
      createdId={createdId}
      status={data.status || "published"}
    />

    {/* Rich Text Editor Modals - Only mount when on Role Content step */}
    {step === ROLE_STEP_INDEX && showCompanyOverviewEditor && (
      <RichTextModal
        title="Company Overview"
        value={data.company_overview || ""}
        onSave={(html) => {
          patch({ company_overview: html });
          setShowCompanyOverviewEditor(false);
        }}
        onClose={() => setShowCompanyOverviewEditor(false)}
        placeholder="Describe your company, its mission, values, and culture..."
      />
    )}

    {step === ROLE_STEP_INDEX && showOfferDescriptionEditor && (
      <RichTextModal
        title="Offer Description"
        value={data.offer_description || ""}
        onSave={(html) => {
          patch({ offer_description: html });
          setShowOfferDescriptionEditor(false);
        }}
        onClose={() => setShowOfferDescriptionEditor(false)}
        placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
      />
    )}

    {step === ROLE_STEP_INDEX && showProfileRequirementsEditor && (
      <RichTextModal
        title="Profile Requirements"
        value={data.profile_requirements || ""}
        onSave={(html) => {
          patch({ profile_requirements: html });
          setShowProfileRequirementsEditor(false);
        }}
        onClose={() => setShowProfileRequirementsEditor(false)}
        placeholder="Describe the required skills, experience, and qualifications..."
      />
    )}

    {/* Mount the modal ONLY on the role-content step */}
    {step === ROLE_STEP_INDEX && showMissionsEditor && (
      <RichTextModal
        title="Missions"
        value={missionsHTML}
        onClose={() => setShowMissionsEditor(false)}
        onSave={(html) => {
          setShowMissionsEditor(false);
          setMissionsHTML(html || "");
          setMissions(htmlToLines(html || ""));
        }}
      />
    )}
    </>
  );
}
