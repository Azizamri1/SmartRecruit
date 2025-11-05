import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useState } from "react";
import AppShell from "./components/common/AppShell";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import ForgotPassword from "./Pages/ForgotPassword";
import Jobs from "./Pages/Jobs";
import ApplicationForm from "./Pages/ApplicationForm";
import AdminApplications from "./Pages/AdminApplications";
import AdminJobCreate from "./Pages/AdminJobCreate";
import AdminJobEdit from "./Pages/AdminJobEdit";
import CompanyJobsManager from "./Pages/CompanyJobsManager";
import JobView from "./Pages/JobView";
import ProtectedRoute from "./components/common/ProtectedRoute";

// new lightweight wrappers
import CandidateSignup from "./Pages/CandidateSignup";
import CompanySignup from "./Pages/CompanySignup";
import MySpace from "./Pages/MySpace";

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/jobs", { replace: true });
  }, [navigate]);

  return null;
}

export default function App() {
  const [authExpiredMessage, setAuthExpiredMessage] = useState("");

  useEffect(() => {
    const handler = (e: any) => {
      // show toast: e.detail.reason === "expired" | "forbidden" | "missing"
      setAuthExpiredMessage(`Session ${e.detail.reason}. Please log in again.`);
      // You can integrate with your toast library here
      console.log(`Auth expired: ${e.detail.reason}`);
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Legacy auth paths you already had */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ðŸ”¹ TuniJobs-like auth paths (aliases) */}
        <Route path="/auth/signin" element={<Login />} />
        <Route path="/candidate/signup" element={<CandidateSignup />} />
        <Route path="/company/signup" element={<CompanySignup />} />

        {/* App shell (navbar persists inside) */}
        <Route element={<AppShell />}>
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:jobId" element={<JobView />} />
          <Route path="/apply/:jobId" element={<ApplicationForm />} />

          {/* My Space: any authenticated user */}
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <MySpace />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute adminOnly>
                <AdminApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute roles={["admin","company"]}>
                <CompanyJobsManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-job"
            element={
              <ProtectedRoute roles={["admin","company"]}>
                <AdminJobCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs/:id/edit"
            element={
              <ProtectedRoute roles={["admin","company"]}>
                <AdminJobEdit />
              </ProtectedRoute>
            }
          />
          {/* Optional analytics page route if you have a separate page */}
          {/* <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><AdminAnalyticsPage/></ProtectedRoute>} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

