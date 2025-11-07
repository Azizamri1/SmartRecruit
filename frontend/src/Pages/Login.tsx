import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BackgroundAnimation from "../components/common/BackgroundAnimation";
import {login, getMe} from "../Services/authService";
import { setAuthTokenAndStartWatcher } from "../Services/apiClient";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we were redirected here with a message
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(form);
      setAuthTokenAndStartWatcher(res.data.access_token);

      // Cache /users/me for navbar, navigate accordingly
      try {
        const meRes = await getMe();
        const me = meRes.data ?? {};
        // ensure a username fallback if backend doesn't provide one
        if (!me.username) {
          me.username = (me.full_name && me.full_name.trim())
            || (typeof me.email === "string" && me.email.includes("@") ? me.email.split("@")[0] : null);
        }
        localStorage.setItem("me", JSON.stringify(me));

        // Post-login redirect
        const back = sessionStorage.getItem("postLoginRedirect");
        sessionStorage.removeItem("postLoginRedirect");
        const redirectTo = back || (me.is_admin ? "/admin/applications" : "/jobs");
        navigate(redirectTo, { replace: true });
      } catch {
        // fallback if /users/me fails
        const back = sessionStorage.getItem("postLoginRedirect");
        sessionStorage.removeItem("postLoginRedirect");
        navigate(back || "/jobs", { replace: true });
      }
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <BackgroundAnimation />
      <div className="login-card">
        <h1 className="login-title">
          Login
        </h1>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="form-label"
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="form-label"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="register-prompt">
          <a
            href="/forgot-password"
            className="register-link"
          >
            Forgot Password?
          </a>
        </p>

        <p className="register-prompt">
          Don’t have an account?{" "}
          <a
            href="/register"
            className="register-link"
          >
            Register
          </a>
        </p>

      </div>
    </div>
  );
}

