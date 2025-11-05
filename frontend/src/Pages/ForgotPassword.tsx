import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackgroundAnimation from "../components/common/BackgroundAnimation";
import { forgotPassword } from "../Services/authService";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  //
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await forgotPassword({ email });
      setMessage("Password reset link sent to your email.");
    } catch (err) {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "20px",
      zIndex: 1
    }}>
      <BackgroundAnimation />
      <div style={{
        background: "rgba(255, 255, 255, 0.12)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "32px",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "420px",
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

        <h1 style={{
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
          Reset Password
        </h1>

        <p style={{
          margin: "0 0 24px 0",
          fontSize: "16px",
          color: "rgba(255, 255, 255, 0.8)",
          textAlign: "center",
          fontWeight: 400
        }}>
          Enter your email to receive a password reset link
        </p>

        {error && (
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
            {error}
          </div>
        )}

        {message && (
          <div style={{
            marginBottom: "20px",
            color: "#1db954",
            fontSize: "14px",
            textAlign: "center",
            background: "rgba(29, 185, 84, 0.1)",
            border: "1px solid rgba(29, 185, 84, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            fontWeight: "500"
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center" }}>
          <a
            href="/auth/signin"
            style={{
              color: "#ffffff",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.3s ease",
              borderBottom: "1px solid transparent"
            }}
          >
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}

