import { Link } from "react-router-dom";
import BackgroundAnimation from "../components/common/BackgroundAnimation";

export default function Register() {
  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "linear-gradient(135deg, rgba(0, 114, 188, 0.1), rgba(106, 27, 154, 0.1))",
      overflow: "hidden"
    }}>
      <BackgroundAnimation />

      {/* Left Side - Professional Office Background */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "50%",
        background: "linear-gradient(135deg, rgba(0, 114, 188, 0.15), rgba(106, 27, 154, 0.15))",
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
            ðŸ¢
          </div>
          <h3 style={{
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "#ffffff"
          }}>
            Professional Network
          </h3>
          <p style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "rgba(255, 255, 255, 0.8)"
          }}>
            Join thousands of professionals and companies in building meaningful career connections
          </p>
        </div>
      </div>

      {/* Right Side - Registration Card */}
      <div style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        maxWidth: "500px",
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
            Create Account
          </h2>

          <p style={{
            margin: "0 0 32px 0",
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            fontWeight: 400
          }}>
            Choose your account type to get started
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
            marginBottom: 32
          }}>
            <Link
              to="/candidate/signup"
              style={{
                background: "linear-gradient(135deg, #0072bc, #1db954)",
                border: "none",
                borderRadius: "12px",
                padding: "20px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#fff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                boxShadow: "0 4px 16px rgba(0, 114, 188, 0.3)",
                transition: "all 0.3s ease",
                minHeight: "64px"
              }}
            >
              <span style={{ fontSize: "24px" }}>ðŸ‘¤</span>
              <div style={{ textAlign: "center" }}>
                <div>Individual Account</div>
                <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>For job seekers</div>
              </div>
            </Link>

            <Link
              to="/company/signup"
              style={{
                background: "linear-gradient(135deg, #6a1b9a, #d81b60)",
                border: "none",
                borderRadius: "12px",
                padding: "20px 24px",
                fontSize: "16px",
                fontWeight: "600",
                color: "#fff",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                boxShadow: "0 4px 16px rgba(106, 27, 154, 0.3)",
                transition: "all 0.3s ease",
                minHeight: "64px"
              }}
            >
              <span style={{ fontSize: "24px" }}>ðŸ¢</span>
              <div style={{ textAlign: "center" }}>
                <div>Company Account</div>
                <div style={{ fontSize: "12px", opacity: 0.9, marginTop: "2px" }}>For employers</div>
              </div>
            </Link>
          </div>

          <div style={{
            textAlign: "center",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <p style={{
              margin: 0,
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.8)",
              fontWeight: 400
            }}>
              Already have an account?{" "}
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
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

