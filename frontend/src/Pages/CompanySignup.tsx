import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import BackgroundAnimation from "../components/common/BackgroundAnimation";
import api from "../Services/apiClient";

export const SECTEURS = [
  "Informatique / IT",
  "TÃ©lÃ©coms",
  "Banque / Finance",
  "Assurance",
  "SantÃ©",
  "Industrie",
  "Commerce / Distribution",
  "Services",
  "Ã‰ducation / Formation",
  "Marketing / Communication",
  "Autre",
];

type Form = {
  company_name: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  sector: string;
  password: string;
  confirm: string;
};

export default function CompanySignup() {
  const nav = useNavigate();
  const [form, setForm] = useState<Form>({
    company_name: "",
    last_name: "",
    first_name: "",
    email: "",
    phone: "",
    sector: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange =
    (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // Basic validations (align with TuniJobs semantics)
    if (!form.company_name || !form.last_name || !form.first_name || !form.email || !form.password) {
      setErr("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (form.password !== form.confirm) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setLoading(true);

      // 1) Register company account
      await api.post("/auth/register", {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || null,
        account_type: "company",
        company_name: form.company_name,
        sector: form.sector || null,
      });

      // 2) Login
      const loginRes = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      const token = loginRes.data?.access_token;
      if (token) localStorage.setItem("token", token);

      // 3) Cache /users/me for navbar, navigate to /me (or /jobs if you prefer)
      const meRes = await api.get("/users/me");
      const me = meRes.data || {};
      // ensure a username fallback if backend doesn't provide one
      if (!me.username) {
        me.username = (me.full_name && me.full_name.trim())
          || (typeof me.email === "string" && me.email.includes("@") ? me.email.split("@")[0] : null);
      }
      localStorage.setItem("me", JSON.stringify(me));
      nav("/me", { replace: true });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setErr(typeof detail === "string" ? detail : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "linear-gradient(135deg, rgba(106, 27, 154, 0.1), rgba(216, 27, 96, 0.1))",
      overflow: "hidden"
    }}>
      <BackgroundAnimation />

      {/* Left Side - Business Background */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "50%",
        background: "linear-gradient(135deg, rgba(106, 27, 154, 0.15), rgba(216, 27, 96, 0.15))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1
      }}>
        <div style={{
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.9)",
          maxWidth: "300px"
        }}>
          <div style={{
            fontSize: "64px",
            marginBottom: "20px",
            opacity: 0.8
          }}>
            ðŸš€
          </div>
          <h3 style={{
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "#ffffff"
          }}>
            Grow Your Business
          </h3>
          <p style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "rgba(255, 255, 255, 0.8)"
          }}>
            Post job opportunities and connect with talented professionals to expand your team
          </p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        maxWidth: "600px",
        marginLeft: "auto",
        marginRight: "40px"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #0072bc, #6a1b9a, #d81b60, #43a047)",
            borderRadius: "20px 20px 0 0"
          }} />

        <h2 style={{
          margin: "0 0 8px 0",
          fontSize: "2rem",
          fontWeight: 700,
          textAlign: "center",
          background: "linear-gradient(135deg, #ffffff, #f0f0f0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "0.5px"
        }}>
          Company Registration
        </h2>

        <p style={{
          margin: "0 0 24px 0",
          fontSize: "16px",
          color: "rgba(255, 255, 255, 0.8)",
          textAlign: "center",
          fontWeight: 400
        }}>
          Create your company profile to start posting jobs
        </p>

        {err && (
          <div style={{
            marginBottom: "20px",
            color: "#ff6b6b",
            fontSize: "14px",
            textAlign: "center",
            background: "rgba(255, 107, 107, 0.1)",
            border: "1px solid rgba(255, 107, 107, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            fontWeight: "500"
          }}>
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Company Name */}
          <div>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Company Name *
            </label>
            <input
              value={form.company_name}
              onChange={onChange("company_name")}
              required
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "16px",
                fontWeight: "400",
                transition: "all 0.3s ease",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Contact Person Names */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Last Name *
              </label>
              <input
                value={form.last_name}
                onChange={onChange("last_name")}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                First Name *
              </label>
              <input
                value={form.first_name}
                onChange={onChange("first_name")}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={onChange("email")}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Phone Number
              </label>
              <input
                value={form.phone}
                onChange={onChange("phone")}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Sector Selection */}
          <div>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Industry Sector
            </label>
            <select
              value={form.sector}
              onChange={onChange("sector")}
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: "16px",
                fontWeight: "400",
                transition: "all 0.3s ease",
                boxSizing: "border-box"
              }}
            >
              <option value="">Select your industry sector</option>
              {SECTEURS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Password Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Password *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={onChange("password")}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.9)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={form.confirm}
                onChange={onChange("confirm")}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "16px",
                  fontWeight: "400",
                  transition: "all 0.3s ease",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #0072bc, #6a1b9a)",
              color: "white",
              padding: "16px 24px",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              marginTop: "8px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Creating Account..." : "Create Company Account"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <Link
            to="/auth/signin"
            style={{
              color: "#ffffff",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.3s ease",
              borderBottom: "1px solid transparent"
            }}
          >
            Back to Sign In
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
