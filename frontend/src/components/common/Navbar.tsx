import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Navbar.css";

type User = {
  full_name?: string;
  username?: string;     // â¬… add (backend may or may not send it)
  email?: string;        // â¬… add (fallback)
  is_admin?: boolean;
  account_type?: "admin" | "company" | "candidate";
  company_name?: string | null;
};

// â¬‡ï¸ add this helper (top-level, above the component)
function computeDisplayName(u: User | null): string {
  if (!u) return "";

  // Show company name for companies
  if (u.account_type === "company" && u.company_name) return u.company_name;

  // For candidates / non-company: prefer username, then full_name
  if (u.username && u.username.trim()) return u.username.trim();
  if (u.full_name && u.full_name.trim()) return u.full_name.trim();

  // Fallback: email local-part if available
  if (u.email && typeof u.email === "string" && u.email.includes("@")) {
    const local = u.email.split("@")[0];
    if (local) return local;
  }

  // Final fallback
  return u.account_type === "company" ? "Entreprise" : "Compte";
}

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("me");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const isCompany = user?.account_type === "company";
  const isAdmin = !!user?.is_admin;

  const displayName = computeDisplayName(user); // â¬… derive once

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("me");
    navigate("/auth/signin", { replace: true });
  };

  return (
    <header className="sr-nav">
      <div className="sr-nav__left">
        <Link to="/jobs" className="brand">
          <img src="/tt-logo.svg" alt="Tunisie TÃ©lÃ©com" />
          <span>SmartRecruit</span>
        </Link>

        <nav className="links">
          <NavLink to="/jobs" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Jobs">
            Jobs
          </NavLink>

          {(isAdmin || isCompany) && (
            <>
              <NavLink to="/admin/applications" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Application Management">
                Application Management
              </NavLink>
              <NavLink to="/admin/jobs" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Job Management">
                Job Management
              </NavLink>
              <NavLink to="/admin/create-job" className={({ isActive }) => (isActive ? "active" : "")} aria-label="Post a Job">
                Post a Job
              </NavLink>
              {/* If you later add a real analytics page, keep this */}
              {/* <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? "active" : "")}>Analytics</NavLink> */}
            </>
          )}
        </nav>
      </div>

      <div className="sr-nav__right">
        {user ? (
          <div className="auth-menu">
            <button className="auth-trigger" onClick={() => setOpen(v => !v)}>
              <span className="user-chip">{displayName}</span>
            </button>
            {open && (
              <div className="auth-dropdown" onMouseLeave={() => setOpen(false)}>
                <Link className="auth-item" to="/me" onClick={() => setOpen(false)}>
                  Mon espace <span className="auth-caption">Profil, CV, candidatures</span>
                </Link>

                {(isAdmin || isCompany) && (
                  <Link className="auth-item" to="/admin/create-job" onClick={() => setOpen(false)}>
                    Publier une offre
                  </Link>
                )}

                <button className="auth-item" onClick={logout}>
                  DÃ©connexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-menu">
            <button className="auth-trigger" onClick={() => setOpen(v => !v)}>Se connecter</button>
            {open && (
              <div className="auth-dropdown" onMouseLeave={() => setOpen(false)}>
                <Link className="auth-item" to="/auth/signin" onClick={() => setOpen(false)}>Connexion</Link>
                <Link className="auth-item" to="/candidate/signup" onClick={() => setOpen(false)}>Inscription Candidat</Link>
                <Link className="auth-item" to="/company/signup" onClick={() => setOpen(false)}>Inscription Entreprise</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

