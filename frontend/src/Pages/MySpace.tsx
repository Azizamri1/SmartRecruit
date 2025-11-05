import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MySpaceCandidate from "./MySpaceCandidate";
import MySpaceCompany from "./MySpaceCompany.tsx";

export default function MySpace() {
  const nav = useNavigate();
  const [userType, setUserType] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/auth/signin");
      return;
    }

    const me = JSON.parse(localStorage.getItem("me") || "{}");
    if (!me.account_type) {
      nav("/auth/signin");
      return;
    }

    setUserType(me.account_type);
    setLoading(false);
  }, [nav]);

  if (loading) return <div style={{padding:"2rem"}}>Loading…</div>;

  // Route to appropriate component based on user type
  if (userType === "candidate") {
    return <MySpaceCandidate />;
  } else if (userType === "company") {
    return <MySpaceCompany />;
  }

  // Fallback
  return null;
}
