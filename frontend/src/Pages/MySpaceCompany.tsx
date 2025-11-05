import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyMe, updateCompanyMe } from "../Services/companyApi";
import { changeEmail, changePassword } from "../Services/userApi";
import { toAbsoluteMedia } from "../Services/media";
import { SECTEURS } from "./CompanySignup";
import { Globe, MapPin, LineChart, Briefcase, PlusCircle, FolderOpen, Mail, Lock, LogOut, Save } from "lucide-react";
import "./MySpaceCompany.css";

export default function MySpaceCompany() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"overview" | "profile" | "security">("overview");
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Profile form state
  const [form, setForm] = useState({
    company_name: "",
    sector: "",
    overview: "",
    location_city: "",
    location_country: "",
    company_website: "",
  });

  // Security
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });
  const [mail, setMail] = useState({ password: "", new_email: "" });

  useEffect(() => {
    getCompanyMe().then(u => {
      if (u.account_type !== "company") { nav("/jobs"); return; }
      setMe(u);
      setForm({
        company_name: u.company_name ?? "",
        sector: u.sector ?? "",
        overview: u.company_description ?? u.company_overview ?? "",
        location_city: u.location_city ?? "",
        location_country: u.location_country ?? "",
        company_website: u.company_website ?? "",
      });
    }).catch(() => setErr("Failed to load"));
  }, [nav]);

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 20000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const logoSrc = useMemo(() => toAbsoluteMedia(me?.company_logo_url || null), [me]);

  const onSaveProfile = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const updated = await updateCompanyMe({
        company_name: form.company_name || undefined,
        sector: form.sector || undefined,
        overview: form.overview || undefined,
        location_city: form.location_city || undefined,
        location_country: form.location_country || undefined,
        company_website: form.company_website || undefined,
      });
      setMe(updated);
      setMsg("Profile saved");
      // also sync form with returned values
      setForm({
        company_name: updated.company_name ?? "",
        sector: updated.sector ?? "",
        overview: updated.company_description ?? updated.company_overview ?? "",
        location_city: updated.location_city ?? "",
        location_country: updated.location_country ?? "",
        company_website: updated.company_website ?? "",
      });
      // auto-refresh overview display immediately
      setTab("overview");
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const onChangePwd = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      await changePassword(pwd.current_password, pwd.new_password);
      setMsg("Password updated");
      setPwd({ current_password: "", new_password: "" });
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Password change failed");
    } finally {
      setBusy(false);
    }
  };

  const onChangeEmail = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const res = await changeEmail(mail.password, mail.new_email);
      setMsg(`Email updated to ${res.email}`);
      setMail({ password: "", new_email: "" });
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? "Email change failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("me");
    nav("/auth/signin");
  };

  if (!me) return <div className="msc2-loading">Loading…</div>;

  return (
    <section className="msc2">
      {/* c: Side menu */}
      <aside className="msc2-menu">
        <div className="msc2-menuTitle">MySpace</div>
        <button className={`msc2-menuItem ${tab==="overview" ? "is-active":""}`} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={`msc2-menuItem ${tab==="profile" ? "is-active":""}`} onClick={() => setTab("profile")}>
          Company profile
        </button>
        <button className={`msc2-menuItem ${tab==="security" ? "is-active":""}`} onClick={() => setTab("security")}>
          Account security
        </button>
        <div className="msc2-menuSep" />
        <button className="msc2-menuItem msc2-logout" onClick={logout}>
          <LogOut size={16}/> Logout
        </button>
      </aside>

      {/* right column */}
      <div className="msc2-content">
        {msg && <div className="msc2-alert ok">{msg}</div>}
        {err && <div className="msc2-alert err">{err}</div>}

        {/* a: Identity + Overview (always visible in Overview tab) */}
        {tab === "overview" && (
          <>
            <div className="msc2-identity">
              <div className="msc2-brand">
                {logoSrc
                  ? <img className="msc2-brandImg" src={logoSrc} alt="" aria-hidden="true" />
                  : <div className="msc2-brandPh">Logo</div>}
              </div>
              <div className="msc2-idFields">
                <div className="msc2-name">{me.company_name || "—"}</div>
                <div className="msc2-inline">
                  <MapPin size={16} />
                  <span>
                    {(me.location_city || me.location_country)
                      ? [me.location_city, me.location_country].filter(Boolean).join(", ")
                      : "Location not set"}
                  </span>
                </div>
                <div className="msc2-inline">
                  <Globe size={16}/>
                  {me.company_website
                    ? <a href={/^https?:\/\//i.test(me.company_website) ? me.company_website : `https://${me.company_website}`} target="_blank" rel="noreferrer">
                        {me.company_website}
                      </a>
                    : <span>Website not set</span>}
                </div>
              </div>
            </div>

            {/* b: Overview text + Shortcuts */}
            <div className="msc2-card">
              <h3 className="msc2-name">Company overview</h3>
              <p className="msc2-overview">{(me.company_description || me.company_overview || "No overview yet.")}</p>
              <div className="msc2-shortcuts">
                <button className="msc2-chip" onClick={() => nav("/admin/manage-jobs")}>
                  <FolderOpen size={16}/> Manage jobs
                </button>
                <button className="msc2-chip" onClick={() => nav("/admin/applications")}>
                  <Briefcase size={16}/> Manage applications
                </button>
                <button className="msc2-chip" onClick={() => nav("/admin/create-job")}>
                  <PlusCircle size={16}/> Post a job
                </button>
                <button className="msc2-chip" onClick={() => nav("/admin/applications#analytics")}>
                  <LineChart size={16}/> View analytics
                </button>
              </div>
            </div>
          </>
        )}

        {/* Profile editor */}
        {tab === "profile" && (
          <div className="msc2-card">
            <h3 className="msc2-name">Company profile</h3>
            <div className="msc2-grid2">
              <label><span>Company name</span>
                <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}/>
              </label>
              <label><span>Sector</span>
                <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}>
                  <option value="">Select your industry sector</option>
                  {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <label><span>Overview</span>
              <textarea rows={5} value={form.overview} onChange={e => setForm({ ...form, overview: e.target.value })}/>
            </label>

            <div className="msc2-grid2">
              <label><span>City</span>
                <input value={form.location_city} onChange={e => setForm({ ...form, location_city: e.target.value })}/>
              </label>
              <label><span>Country</span>
                <input value={form.location_country} onChange={e => setForm({ ...form, location_country: e.target.value })}/>
              </label>
            </div>

            <label><span>Website</span>
              <input placeholder="example.com" value={form.company_website} onChange={e => setForm({ ...form, company_website: e.target.value })}/>
            </label>

            <div className="msc2-row">
              <button className="btn btn--primary" disabled={busy} onClick={onSaveProfile}>
                <Save size={16}/> {busy ? "Saving…" : "Save"}
              </button>
              <button className="btn" onClick={() => {
                setForm({
                  company_name: me.company_name ?? "",
                  sector: me.sector ?? "",
                  overview: me.company_description ?? me.company_overview ?? "",
                  location_city: me.location_city ?? "",
                  location_country: me.location_country ?? "",
                  company_website: me.company_website ?? "",
                });
                setMsg(null); setErr(null);
              }}>Reset</button>
            </div>
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
              <button className="btn btn--primary" disabled={busy || !pwd.current_password || !pwd.new_password} onClick={onChangePwd}>
                Update password
              </button>
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
              <button className="btn btn--primary" disabled={busy || !mail.password || !mail.new_email} onClick={onChangeEmail}>
                Update email
              </button>
              <p className="msc2-hint">You’ll need to re-login next time with the new address.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
