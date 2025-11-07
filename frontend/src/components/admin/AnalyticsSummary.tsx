import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { ensureChartJSRegistered } from "../../lib/chartjs";
import api from "../../Services/apiClient";
import "./AnalyticsSummary.css";

ensureChartJSRegistered();

function formatStatusLabel(s?: string | null) {
  return s ? s.replace(/_/g, " ") : "—";
}
function statusMod(s?: string | null) {
  return s && s.trim() ? s : "pending";
}

type TrendPoint = { date: string; applications: number };
type Summary = {
  jobs: number; open_jobs: number; applications: number;
  by_status: Record<string, number>;
  score_histogram?: Record<string, number>;
  trend_30d?: TrendPoint[];   // <— we’ll use this
};

export default function AnalyticsSummary() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/company/analytics/summary");
        setData(r.data);
      } catch (e: any) {
        const code = e?.response?.status;
        if (code === 403 || code === 404) {
          try {
            const r2 = await api.get("/admin/analytics/summary");
            setData(r2.data);
          } catch (e2: any) {
            setErr("Failed to load analytics");
          }
        } else {
          setErr(e?.response?.data?.detail || "Failed to load analytics");
        }
      }
    })();
  }, []);

  if (err) return <div className="error">{err}</div>;
  if (!data) return <div>Loading analytics…</div>;

  const trend = Array.isArray(data.trend_30d) ? data.trend_30d : [];
  const labels = trend.map(p => p.date ?? "").filter(Boolean);
  const counts = trend.map(p => Number(p.applications ?? 0));

  const barData = {
    labels,
    datasets: [{ label: "Applications (last 30 days)", data: counts }]
  };

  return (
    <section className="analyticsSummary">
      {/* KPI Dashboard Cards */}
      <div className="kpis">
        <div className="kpi">
          <div className="kpi__label">Total Jobs</div>
          <div className="kpi__value">{data.jobs ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Open Positions</div>
          <div className="kpi__value">{data.open_jobs ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Total Applications</div>
          <div className="kpi__value">{data.applications ?? 0}</div>
        </div>
        {"avg_score" in data && (
          <div className="kpi">
            <div className="kpi__label">Average Score</div>
            <div className="kpi__value">{(data as any).avg_score?.toFixed?.(1) ?? "—"}</div>
          </div>
        )}
      </div>

      {/* Application Status Overview */}
      {data.by_status && (
        <div className="card_anal">
          <div className="section-title">Application Status Overview</div>
          <div className="pills">
            {Object.entries(data.by_status).map(([k,v]) => {
              const mod = statusMod(k);
              return (
                <span key={k} className={`pill pill--${mod}`}>
                  {formatStatusLabel(k)}: {v as number}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Analytics Tables */}
      <div className="gridTwo">
        {"top_jobs_by_apps" in (data as any) && (
          <div className="card_anal">
            <div className="section-title">Top Performing Jobs</div>
            <div style={{overflow: 'hidden'}}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th style={{textAlign: 'center'}}>Applications</th>
                  </tr>
                </thead>
                <tbody>
                  {(data as any).top_jobs_by_apps?.map?.((row: any) => (
                    <tr key={row.id}>
                      <td style={{fontWeight: '500'}}>{row.title}</td>
                      <td style={{textAlign: 'center', fontWeight: '600', color: '#1db954'}}>{row.applications}</td>
                    </tr>
                  )) || null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {"recent_applications" in (data as any) && (
          <div className="card_anal">
            <div className="section-title">Recent Applications</div>
            <div style={{overflow: 'hidden'}}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th style={{textAlign: 'center'}}>Score</th>
                    <th style={{textAlign: 'center'}}>Status</th>
                    <th style={{textAlign: 'center'}}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data as any).recent_applications?.map?.((r: any, i: number) => (
                    <tr key={i}>
                      <td style={{fontWeight: '500'}}>{r.candidate_email ?? "—"}</td>
                      <td>{r.job_title ?? "—"}</td>
                      <td style={{textAlign: 'center', fontWeight: '600'}}>
                        {r.score ? `${r.score}%` : "—"}
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <span className={`pill pill--${statusMod(r.status)}`}>
                          {formatStatusLabel(r.status)}
                        </span>
                      </td>
                      <td style={{textAlign: 'center', color: 'rgba(255,255,255,0.7)'}}>
                        {r.applied_at ? new Date(r.applied_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  )) || null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Application Trend Chart */}
      {!!trend.length && (
        <div className="card_anal">
          <div className="section-title">Application Trends</div>
          <div className="chartBox">
            <Bar
              key={labels.join("|")}
              data={{
                labels,
                datasets: [{
                  label: "Applications",
                  data: counts,
                  backgroundColor: 'rgba(0, 114, 188, 0.6)', // Transparent blue
                  borderColor: 'rgba(0, 114, 188, 0.8)',
                  borderWidth: 2,
                  borderRadius: 8,
                  hoverBackgroundColor: 'rgba(0, 114, 188, 0.8)',
                  hoverBorderColor: 'rgba(0, 114, 188, 1)',
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: 'rgba(255, 255, 255, 0.9)',
                      font: { size: 12 },
                      padding: 20,
                      usePointStyle: true,
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(0, 114, 188, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.8)',
                      font: { size: 11 }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.08)'
                    }
                  },
                  y: {
                    ticks: {
                      color: 'rgba(255, 255, 255, 0.8)',
                      font: { size: 11 }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.08)'
                    },
                    beginAtZero: true
                  }
                },
                animation: {
                  duration: 1500,
                  easing: 'easeOutQuart'
                }
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

