import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, patchMe, uploadAvatar } from "../Services/userApi";
import { getCurrentCV, uploadCV } from "../Services/cvApi";
import { changeEmail, changePassword } from "../Services/userApi";
import { toAbsoluteMedia } from "../Services/media";
import { viewCvPdf } from "../Services/download";
import { Globe, MapPin, Github, Linkedin, FileUp, FileText, Mail, Lock, LogOut, Save, ExternalLink, Briefcase, FolderOpen, PlusCircle, LineChart } from "lucide-react";
import "./MySpaceCompany.css";

type TabKey = "overview" | "profile" | "documents" | "security";

export default function MySpaceCandidate() {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cv, setCv] = useState<any>(null);

  // profile form
  const [form, setForm] = useState({
    full_name: "",
    linkedin_url: "",
    github_url: "",
  });

  // security
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });
  const [mail, setMail] = useState({ password: "", new_email: "" });

  useEffect(() => {
    getMe().then(u => {
      setMe(u);
      setForm({
        full_name: u.full_name ?? "",
        linkedin_url: u.linkedin_url ?? "",
        github_url: u.github_url ?? "",
      });
    }).catch(() => setErr("Failed to load profile"));

    getCurrentCV().then(setCv).catch(() => setCv(null));
  }, []);

  // Auto-clear success message after 20 seconds
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg(null);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const avatarSrc = useMemo(() => toAbsoluteMedia(me?.profile_picture_url || null), [me]);

  const onAvatarPick = async (file?: File) => {
    if (!file) return;
    setMsg(null); setErr(null);
    try {
      const res = await uploadAvatar(file);
      setMe((prev: any) => prev ? { ...prev, profile_picture_url: res.profile_picture_url } : prev);
      setMsg("Profile picture updated");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Avatar upload failed");
    }
  };

  const onSaveProfile = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const updated = await patchMe({
        full_name: form.full_name || undefined,
        linkedin_url: form.linkedin_url || undefined,
        github_url: form.github_url || undefined,
      });
      setMe(updated);
      setMsg("Profile saved");
      setForm({
        full_name: updated.full_name ?? "",
        linkedin_url: updated.linkedin_url ?? "",
        github_url: updated.github_url ?? "",
      });
      setTab("overview");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const onUploadCV = async (file?: File) => {
    if (!file) return;
    setBusy(true); setMsg(null); setErr(null);
    try {
      const res = await uploadCV(file);
      setCv(res);
      setMsg("CV uploaded");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "CV upload failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/auth/signin");
  };

  if (!me) return <div className="msc2-loading">Loading…</div>;

  return (
    <section className="msc2">
      {/* side menu */}
      <aside className="msc2-menu">
        <div className="msc2-menuTitle">MySpace</div>
        <button className={`msc2-menuItem ${tab==="overview" ? "is-active":""}`} onClick={() => setTab("overview")}>Overview</button>
        <button className={`msc2-menuItem ${tab==="profile" ? "is-active":""}`} onClick={() => setTab("profile")}>Profile</button>
        <button className={`msc2-menuItem ${tab==="documents" ? "is-active":""}`} onClick={() => setTab("documents")}>Documents</button>
        <button className={`msc2-menuItem ${tab==="security" ? "is-active":""}`} onClick={() => setTab("security")}>Account security</button>
        <div className="msc2-menuSep" />
        <button className="msc2-menuItem msc2-logout" onClick={logout}><LogOut size={16}/> Logout</button>
      </aside>

      {/* content */}
      <div className="msc2-content">
        {msg && <div className="msc2-alert ok">{msg}</div>}
        {err && <div className="msc2-alert err">{err}</div>}

        {/* Overview: avatar + links */}
        {tab === "overview" && (
          <>
            <div className="msc2-identity">
              <div className="msc2-brand" title="Click to upload a new photo">
                <input id="msc2_avatar_in" type="file" accept="image/*" style={{display:"none"}}
                       onChange={(e) => onAvatarPick(e.target.files?.[0] || undefined)} />
                <div className="msc2-logoClickable" onClick={() => document.getElementById("msc2_avatar_in")?.click()}>
                  {avatarSrc ? <img className="msc2-brandImg" src={avatarSrc} alt="" aria-hidden="true" />
                             : <div className="msc2-brandPh">Photo</div>}
                </div>
              </div>
              <div className="msc2-idFields">
                <div className="msc2-name">{me.full_name || me.email}</div>
                <div className="msc2-inline">
                  <Linkedin size={16}/>
                  {me.linkedin_url ? <a href={/^https?:\/\//i.test(me.linkedin_url) ? me.linkedin_url : `https://${me.linkedin_url}`} target="_blank" rel="noreferrer">{me.linkedin_url}</a> : <span>LinkedIn not set</span>}
                </div>
                <div className="msc2-inline">
                  <Github size={16}/>
                  {me.github_url ? <a href={/^https?:\/\//i.test(me.github_url) ? me.github_url : `https://${me.github_url}`} target="_blank" rel="noreferrer">{me.github_url}</a> : <span>GitHub not set</span>}
                </div>
                {cv && (
                  <div className="msc2-inline">
                    <FileText size={16}/>
                    <button
                      type="button"
                      className="msc2-link-like"
                      onClick={() => viewCvPdf(cv.id)}
                    >
                      View latest CV
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="msc2-card">
              <h3>My applications</h3>
              <p className="msc2-muted">Use the Applications page or keep this area for future widgets.</p>
              <div className="msc2-shortcuts">
                <button className="msc2-chip" onClick={() => nav("/applications/me")}>
                  <Briefcase size={16}/> My applications
                </button>
                <button className="msc2-chip" onClick={() => nav("/jobs")}>
                  <FolderOpen size={16}/> Find jobs
                </button>
              </div>
            </div>
          </>
        )}

        {/* Profile edit */}
        {tab === "profile" && (
          <div className="msc2-card">
            <h3>Profile</h3>
            <div className="msc2-grid2">
              <label><span>Full name</span>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/>
              </label>
              <label><span>LinkedIn</span>
                <input placeholder="linkedin.com/in/username" value={form.linkedin_url} onChange={e => setForm({ ...form, linkedin_url: e.target.value })}/>
              </label>
              <label><span>GitHub</span>
                <input placeholder="github.com/username" value={form.github_url} onChange={e => setForm({ ...form, github_url: e.target.value })}/>
              </label>
            </div>
            <div className="msc2-row">
              <button className="btn btn--primary" disabled={busy} onClick={onSaveProfile}>
                <Save size={16}/> {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* Documents (CV upload/replace) */}
        {tab === "documents" && (
          <div className="msc2-card">
            <h3>My CV</h3>
            <div className="msc2-grid2">
              <label><span>Upload / Replace CV (PDF)</span>
                <input type="file" accept="application/pdf" onChange={(e) => onUploadCV(e.target.files?.[0] || undefined)} />
              </label>
              {cv ? (
                <div>
                  <div className="msc2-inline"><FileText size={16}/><span>Latest uploaded at: {new Date(cv.uploaded_at || "").toLocaleString()}</span></div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => viewCvPdf(cv.id)}
                  >
                    <ExternalLink size={16}/> Open current CV
                  </button>
                </div>
              ) : (
                <p className="msc2-muted">No CV yet. Upload a PDF to store it on your profile.</p>
              )}
            </div>
            <p className="msc2-hint">When you apply to a job, we'll auto-use this latest CV (you can still replace it during the application).</p>
          </div>
        )}

        {/* Account security */}
        {tab === "security" && (
          <div className="msc2-security-grid">
            <div className="msc2-card">
              <h3><Lock size={18}/> Change password</h3>
              <label><span>Current password</span>
                <input type="password" value={pwd.current_password} onChange={e => setPwd({ ...pwd, current_password: e.target.value })}/>
              </label>
              <label><span>New password</span>
                <input type="password" value={pwd.new_password} onChange={e => setPwd({ ...pwd, new_password: e.target.value })}/>
              </label>
              <button className="btn btn--primary" disabled={busy || !pwd.current_password || !pwd.new_password} onClick={async () => {
                setBusy(true); setErr(null); setMsg(null);
                try { await changePassword(pwd.current_password, pwd.new_password); setMsg("Password updated"); setPwd({ current_password: "", new_password: "" }); }
                catch (e:any) { setErr(e?.response?.data?.detail ?? "Password change failed"); }
                finally { setBusy(false); }
              }}>Update password</button>
              <p className="msc2-hint">Use 8+ characters with letters & numbers.</p>
            </div>

            <div className="msc2-card">
              <h3><Mail size={18}/> Change email</h3>
              <p className="msc2-muted"><b>Current:</b> {me.email}</p>
              <label><span>Password</span>
                <input type="password" value={mail.password} onChange={e => setMail({ ...mail, password: e.target.value })}/>
              </label>
              <label><span>New email</span>
                <input type="email" value={mail.new_email} onChange={e => setMail({ ...mail, new_email: e.target.value })}/>
              </label>
              <button className="btn btn--primary" disabled={busy || !mail.password || !mail.new_email} onClick={async () => {
                setBusy(true); setErr(null); setMsg(null);
                try { const res = await changeEmail(mail.password, mail.new_email); setMsg(`Email updated to ${res.email}`); setMail({ password: "", new_email: "" }); }
                catch (e:any) { setErr(e?.response?.data?.detail ?? "Email change failed"); }
                finally { setBusy(false); }
              }}>Update email</button>
              <p className="msc2-hint">You'll need to re-login next time with the new address.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
