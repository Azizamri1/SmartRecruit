/**
 * Main application component with routing configuration.
 * Handles authentication state and route protection.
 */

import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Core UI components
import AppShell from "./components/common/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Page components
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

// Specialized signup pages
import CandidateSignup from "./Pages/CandidateSignup";
import CompanySignup from "./Pages/CompanySignup";
import MySpace from "./Pages/MySpace";

/**
 * Redirects users from the root path to the jobs page.
 */
function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/jobs", { replace: true });
  }, [navigate]);

  return null;
}

/**
 * Main application component that handles routing and authentication state.
 */
export default function App() {
  const [authExpiredMessage, setAuthExpiredMessage] = useState("");

  // Listen for authentication expiration events
  useEffect(() => {
    const handleAuthExpired = (event: any) => {
      // Event detail contains reason: "expired", "forbidden", or "missing"
      setAuthExpiredMessage(`Session ${event.detail.reason}. Please log in again.`);
      // TODO: Integrate with toast notification library
      console.log(`Authentication expired: ${event.detail.reason}`);
    };

    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Home />} />

        {/* Authentication routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Alternative authentication paths */}
        <Route path="/auth/signin" element={<Login />} />
        <Route path="/candidate/signup" element={<CandidateSignup />} />
        <Route path="/company/signup" element={<CompanySignup />} />

        {/* Main application with persistent navigation */}
        <Route element={<AppShell />}>
          {/* Job browsing and applications */}
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:jobId" element={<JobView />} />
          <Route path="/apply/:jobId" element={<ApplicationForm />} />

          {/* User dashboard - requires authentication */}
          <Route
            path="/me"
            element={
              <ProtectedRoute>
                <MySpace />
              </ProtectedRoute>
            }
          />

          {/* Administrative routes */}
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute adminOnly>
                <AdminApplications />
              </ProtectedRoute>
            }
          />

          {/* Company and admin job management */}
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute roles={["admin", "company"]}>
                <CompanyJobsManager />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/create-job"
            element={
              <ProtectedRoute roles={["admin", "company"]}>
                <AdminJobCreate />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/jobs/:id/edit"
            element={
              <ProtectedRoute roles={["admin", "company"]}>
                <AdminJobEdit />
              </ProtectedRoute>
            }
          />

          {/* Future analytics route (uncomment when implemented) */}
          {/*
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute adminOnly>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
