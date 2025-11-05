import React, { useState, useEffect } from "react";
import BackgroundAnimation from "../components/common/BackgroundAnimation";
import AnalyticsSummary from "../components/admin/AnalyticsSummary";
import CompanyApplicationsTable from "../components/admin/CompanyApplicationsTable";
import ErrorBoundary from "../components/common/ErrorBoundary";
import "./AdminApplications.css";

export default function AdminApplications() {
  const [tab, setTab] = useState<"analytics" | "manage">("analytics");

  // Typewriter animation state
  const [displayTitle, setDisplayTitle] = useState('');
  const [displaySubtitle, setDisplaySubtitle] = useState('');
  const fullTitle = 'Applications hub';
  const fullSubtitle = 'Switch between analytics and application management.';

  useEffect(() => {
    // Reset animation
    setDisplayTitle('');
    setDisplaySubtitle('');

    let titleIndex = 0;
    let subtitleIndex = 0;

    // Animate title first
    const titleInterval = setInterval(() => {
      if (titleIndex < fullTitle.length) {
        setDisplayTitle(fullTitle.slice(0, titleIndex + 1) + '|');
        titleIndex++;
      } else {
        setDisplayTitle(fullTitle);
        clearInterval(titleInterval);

        // Start subtitle animation after title completes
        const subtitleInterval = setInterval(() => {
          if (subtitleIndex < fullSubtitle.length) {
            setDisplaySubtitle(fullSubtitle.slice(0, subtitleIndex + 1) + '|');
            subtitleIndex++;
          } else {
            setDisplaySubtitle(fullSubtitle);
            clearInterval(subtitleInterval);
          }
        }, 50); // Faster for subtitle

        return () => clearInterval(subtitleInterval);
      }
    }, 100); // 100ms delay per character for title

    return () => clearInterval(titleInterval);
  }, []);

  return (
    <div className="adminApplications">
      <BackgroundAnimation />
      <div className="container">
        <header className="header">
          <h1>{displayTitle}</h1>
          <p>{displaySubtitle}</p>
        </header>

        <div className="tabs">
          <button className={`tabBtn ${tab==="analytics"?"tabBtn--active":""}`} onClick={() => setTab("analytics")}>Analytics</button>
          <button className={`tabBtn ${tab==="manage"?"tabBtn--active":""}`} onClick={() => setTab("manage")}>Application management</button>
        </div>

        <div className="section">
          <ErrorBoundary>
            {tab === "analytics" ? <AnalyticsSummary /> : <CompanyApplicationsTable />}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

