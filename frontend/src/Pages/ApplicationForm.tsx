import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SRMultiStep, { SRSection } from "../components/forms/SRMultiStep";
import { useFormWizard } from "../components/forms/useFormWizard";
import api from "../Services/apiClient";
import SuccessModal from "../components/common/SuccessModal";
import "./ApplicationForm.css";

interface Job {
  id: number;
  title: string;
  description: string;
  location?: string;
  duration?: string;
  requirements?: string[];
  deadline?: string;
  contract_type?: string;
  company_name?: string;
  employment_type?: string;
}

const steps = ["Personal Info", "Education & Experience", "Cover Letter & CV", "Review & Submit"];

type ApplicationData = {
  job_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  education_level: string;
  years_experience: number;
  linkedin_url?: string;
  cover_letter: string;
  cv_id?: number | null;
};

type CurrentCV = { id: number; file_path: string; uploaded_at: string } | null;

async function uploadCv(file: File) {
  const fd = new FormData();
  fd.append("file", file); // key must be "file" to match FastAPI param name

  try {
    // do NOT set Content-Type explicitly; axios will add the multipart boundary
    const { data } = await api.post("/cvs", fd);
    return data; // expect { id, file_path, uploaded_at } per CVRead
  } catch (err: any) {
    // bubble up server message if present, so you can see it in the UI
    const detail =
      err?.response?.data?.detail ??
      err?.message ??
      "Failed to upload CV. Please try again.";
    throw new Error(detail);
  }
}

export default function ApplicationForm() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [currentCv, setCurrentCv] = useState<CurrentCV>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { step, steps: s, data, patch, next, prev, isLast } = useFormWizard<ApplicationData>(steps, {
    job_id: Number(jobId) || 0,
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    education_level: "",
    years_experience: 0,
    linkedin_url: "",
    cover_letter: "",
    cv_id: null,
  });

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/auth/signin");
      return;
    }

    // Fetch job details
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${jobId}`);
        setJob(response.data);
      } catch (err) {
        setJobError("Failed to load job details.");
      } finally {
        setJobLoading(false);
      }
    };

    // Fetch user profile and current CV for autofill
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const userResponse = await api.get("/users/me");
        const userData = userResponse.data;

        // Autofill form with user data
        patch({
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          linkedin_url: userData.linkedin_url || "",
        });

        // Fetch current CV
        try {
          const cvResponse = await api.get(`/cvs/current`);
          setCurrentCv(cvResponse.data);
          // Update form data with existing CV ID
          if (cvResponse.data) {
            patch({ cv_id: cvResponse.data.id });
          }
        } catch (cvErr) {
          setCurrentCv(null);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };

    if (jobId) fetchJob();
    fetchUserData();
  }, [navigate, jobId]);

  const onReplaceCv = async (file: File) => {
    try {
      const data = await uploadCv(file);
      setCurrentCv(data);
      // Update form data with new CV ID
      if (data) {
        patch({ cv_id: data.id });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      // Defensive guard: Check if user has already applied to this job
      if (job) {
        try {
          const jobDetail = await api.get(`/jobs/${jobId}`);
          if (jobDetail.data.has_applied) {
            alert("You have already applied to this job.");
            return;
          }
        } catch (checkError) {
          console.warn("Could not verify application status, proceeding anyway:", checkError);
        }
      }

      const formPayload = {
        ...data,
        years_experience: Number(data.years_experience),
      };

      const result = await api.post("/applications", formPayload);
      setCreatedId(result.data?.id || null);
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Application submission failed:", error);
      const errorMessage = error.response?.data?.detail || "An error occurred. Please try again.";
      alert(errorMessage);
    }
  };

  if (jobLoading) return (
    <div className="application-form-container">
      <div className="application-card">
        <div className="loading">Loading job details...</div>
      </div>
    </div>
  );

  if (jobError) return (
    <div className="application-form-container">
      <div className="application-card">
        <div className="error-message">{jobError}</div>
        <Link to="/jobs" className="apply-button">Back to Jobs</Link>
      </div>
    </div>
  );

  return (
    <>
      <SRMultiStep title="Apply for Position" subtitle="Complete your application step by step" steps={s} active={step}>
        {step === 0 && (
          <>
            <SRSection title="Personal Information">
              <div className="srForm__field">
                <label className="srForm__label">First Name *</label>
                <input
                  className="srForm__input"
                  value={data.first_name || ""}
                  onChange={e => patch({ first_name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="srForm__field">
                <label className="srForm__label">Last Name *</label>
                <input
                  className="srForm__input"
                  value={data.last_name || ""}
                  onChange={e => patch({ last_name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>
              <div className="srForm__field">
                <label className="srForm__label">Email Address *</label>
                <input
                  type="email"
                  className="srForm__input"
                  value={data.email || ""}
                  onChange={e => patch({ email: e.target.value })}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="srForm__field">
                <label className="srForm__label">Phone Number *</label>
                <input
                  type="tel"
                  className="srForm__input"
                  value={data.phone_number || ""}
                  onChange={e => patch({ phone_number: e.target.value })}
                  placeholder="+216 XX XXX XXX"
                />
              </div>
              <div className="srForm__field">
                <label className="srForm__label">LinkedIn Profile</label>
                <input
                  type="url"
                  className="srForm__input"
                  value={data.linkedin_url || ""}
                  onChange={e => patch({ linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                <div className="srForm__hint">Optional but recommended for networking</div>
              </div>
            </SRSection>
            <div className="srForm__btns">
              <button className="srBtn srBtn--ghost" onClick={prev} disabled>Back</button>
              <button className="srBtn srBtn--primary" onClick={next}>Next</button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <SRSection title="Education & Experience">
              <div className="srForm__field">
                <label className="srForm__label">Education Level *</label>
                <select
                  className="srForm__select"
                  value={data.education_level || ""}
                  onChange={e => patch({ education_level: e.target.value })}
                >
                  <option value="">Select education level</option>
                  <option value="high_school">High School</option>
                  <option value="bachelors">Bachelor's Degree</option>
                  <option value="masters">Master's Degree</option>
                  <option value="doctorate">Doctorate</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="srForm__field">
                <label className="srForm__label">Years of Experience *</label>
                <input
                  type="number"
                  className="srForm__input"
                  value={data.years_experience || ""}
                  onChange={e => patch({ years_experience: Number(e.target.value) || 0 })}
                  min="0"
                  max="50"
                  placeholder="0"
                />
              </div>
            </SRSection>
            <div className="srForm__btns">
              <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
              <button className="srBtn srBtn--primary" onClick={next}>Next</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SRSection title="Cover Letter & CV">
              <div className="srForm__field">
                <label className="srForm__label">Cover Letter *</label>
                <textarea
                  className="srForm__text"
                  rows={8}
                  value={data.cover_letter || ""}
                  onChange={e => patch({ cover_letter: e.target.value })}
                  placeholder="Tell us why you're interested in this position and why you'd be a great fit..."
                />
              </div>

              <div className="cv-section" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: 'rgba(255,255,255,0.9)' }}>CV Upload</h4>
                {currentCv ? (
                  <div style={{ color: '#1db954', fontWeight: '500' }}>
                    âœ“ CV uploaded: {currentCv.file_path.split("/").pop()}
                  </div>
                ) : (
                  <div style={{ color: '#ff6b6b', fontWeight: '500' }}>
                    âš  No CV uploaded yet
                  </div>
                )}
                <label className="cv-upload-btn" style={{
                  display: "inline-block",
                  marginTop: 12,
                  cursor: "pointer",
                  background: "rgba(0, 114, 188, 0.8)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  transition: "all 0.3s ease"
                }}>
                  {currentCv ? 'Replace CV' : 'Upload CV'}
                  <input
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && onReplaceCv(e.target.files[0])}
                  />
                </label>
              </div>
            </SRSection>
            <div className="srForm__btns">
              <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
              <button className="srBtn srBtn--primary" onClick={next}>Next</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SRSection title="Application Summary" columns="two">
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  Personal Information
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Full Name:</strong> {data.first_name} {data.last_name}</div>
                  <div><strong>Email:</strong> {data.email}</div>
                  <div><strong>Phone:</strong> {data.phone_number}</div>
                  <div><strong>LinkedIn:</strong> {data.linkedin_url || "Not provided"}</div>
                </div>

                <h4 style={{ margin: '20px 0 16px 0', color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  Education & Experience
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Education:</strong> {data.education_level || "Not specified"}</div>
                  <div><strong>Experience:</strong> {data.years_experience || 0} years</div>
                </div>

                <h4 style={{ margin: '20px 0 16px 0', color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  Documents
                </h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  <div><strong>Cover Letter:</strong> {data.cover_letter ? "Provided" : "Missing"}</div>
                  <div><strong>CV:</strong> {currentCv ? "Uploaded" : "Missing"}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '12px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                  Job Details
                </h4>
                {job && (
                  <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                    <div><strong>Position:</strong> {job.title}</div>
                    <div><strong>Company:</strong> {job.company_name || "Not specified"}</div>
                    <div><strong>Location:</strong> {job.location || "Not specified"}</div>
                    <div><strong>Type:</strong> {job.employment_type || "Not specified"}</div>
                  </div>
                )}
              </div>
            </SRSection>

            <div className="srForm__btns">
              <button className="srBtn srBtn--ghost" onClick={prev}>Back</button>
              <button className="srBtn srBtn--primary" onClick={handleSubmit}>Submit Application</button>
            </div>
          </>
        )}
      </SRMultiStep>

      <SuccessModal
        open={showSuccess}
        title="Application Submitted!"
        onClose={() => setShowSuccess(false)}
        createdId={createdId}
        status="published"
      />
    </>
  );
}

