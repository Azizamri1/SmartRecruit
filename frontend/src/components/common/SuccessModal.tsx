import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface SuccessModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  createdId?: string | null;
  status: "published" | "draft" | "archived";
}

export default function SuccessModal({ open, title, onClose, createdId, status }: SuccessModalProps) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    if (open) {
      fetch('/animations/success.json')
        .then(response => response.json())
        .then(data => setAnimationData(data))
        .catch(error => console.error('Error loading animation:', error));
    }
  }, [open]);

  if (!open) return null;

  const isPublished = status === "published";

  const buttonStyle = {
    padding: "12px 24px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    minWidth: "120px"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: "#007bff",
    color: "#fff",
    boxShadow: "0 2px 4px rgba(0,123,255,0.2)"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#28a745",
    color: "#fff",
    boxShadow: "0 2px 4px rgba(40,167,69,0.2)"
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: "#fff", padding: "32px", borderRadius: "12px", maxWidth: "500px", width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)", textAlign: "center"
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: '180px', height: '180px', margin: '0 auto 20px' }}>
          {animationData && <Lottie animationData={animationData} loop={false} />}
        </div>
        <h2 style={{ margin: "0 0 16px", color: "#333", fontSize: "24px", fontWeight: "600" }}>
          {isPublished ? `${title} Published!` : "Draft Saved"}
        </h2>
        <p style={{ margin: 0, color: "#666", marginBottom: "32px", fontSize: "16px", lineHeight: "1.5" }}>
          {isPublished ? "Your job offer is now live and visible to candidates." : "Your draft has been saved and can be continued later."}
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          {isPublished ? (
            <>
              {createdId && (
                <button
                  style={primaryButtonStyle}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#0056b3"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#007bff"}
                  onClick={() => { onClose(); window.location.href = `/jobs/${createdId}`; }}
                >
                  View Job
                </button>
              )}
              <button
                style={secondaryButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1e7e34"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#28a745"}
                onClick={() => { onClose(); window.location.href = "/admin/jobs"; }}
              >
                Back to Jobs
              </button>
            </>
          ) : (
            <>
              <button
                style={primaryButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.background = "#0056b3"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#007bff"}
                onClick={onClose}
              >
                Continue Editing
              </button>
              <button
                style={secondaryButtonStyle}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1e7e34"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#28a745"}
                onClick={() => { onClose(); window.location.href = "/admin/jobs?filter=drafts"; }}
              >
                View Drafts
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
