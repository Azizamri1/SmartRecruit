import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Archive, Trash2, Pencil, ClipboardList, FileText, Package, Search, X } from 'lucide-react';
import {
  getCompanyJobs,
  bulkStatus,
  bulkDelete,
  patchJobStatus,
  type JobStatus
} from "../Services/jobsListApi";

// Typewriter animation state
const useTypewriter = (fullText: string, delay: number = 100) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);

    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(fullText.slice(0, i + 1) + '|');
        i++;
      } else {
        setDisplayText(fullText);
        setIsComplete(true);
        clearInterval(interval);
      }
    }, delay);

    return () => clearInterval(interval);
  }, [fullText, delay]);

  return { displayText, isComplete };
};

type Job = {
  id: number;
  title: string;
  company_name?: string | null;
  status: JobStatus;
  skills?: string[];
  missions?: string[];
  location_city?: string | null;
  location_country?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  posted_at?: string | null;
};

const TABS: JobStatus[] = ["published", "draft", "archived"];

export default function CompanyJobsManager() {
  const [tab, setTab] = useState<JobStatus>("published");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lists, setLists] = useState<Record<JobStatus, Job[]>>({
    published: [],
    draft: [],
    archived: [],
  });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Typewriter animation for title
  const { displayText: animatedTitle } = useTypewriter('Job Management', 100);

  // load all lists once (small volumes per your notes) â†’ drives badges
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [pub, dra, arc] = await Promise.all([
          getCompanyJobs("published", "me"),
          getCompanyJobs("draft", "me"),
          getCompanyJobs("archived", "me"),
        ]);
        if (!cancelled) {
          setLists({ published: pub, draft: dra, archived: arc });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // current visible rows (filter client-side)
  const rows = lists[tab];
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(j => {
      const title = j.title?.toLowerCase() || "";
      const company = j.company_name?.toLowerCase() || "";
      const skills = (j.skills || []).join(" ").toLowerCase();
      return title.includes(q) || company.includes(q) || skills.includes(q);
    });
  }, [rows, query]);

  const counts = {
    published: lists.published.length,
    draft: lists.draft.length,
    archived: lists.archived.length,
  };

  // selection
  const allIds = filtered.map(j => j.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) {
      allIds.forEach(id => next.delete(id));
    } else {
      allIds.forEach(id => next.add(id));
    }
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  async function refreshTab(t: JobStatus = tab) {
    const fresh = await getCompanyJobs(t, "me");
    setLists(prev => ({ ...prev, [t]: fresh }));
  }

  // bulk ops
  async function doBulk(action: "publish" | "archive" | "delete") {
    const ids = [...selected].filter(id => filtered.some(r => r.id === id)); // keep only visible
    if (!ids.length) return;
    setLoading(true);
    try {
      if (action === "delete") {
        await bulkDelete(ids);
      } else {
        const status: JobStatus = action === "publish" ? "published" : "archived";
        await bulkStatus(ids, status);
      }
      // refresh all lists to update badges
      const [pub, dra, arc] = await Promise.all([
        getCompanyJobs("published", "me"),
        getCompanyJobs("draft", "me"),
        getCompanyJobs("archived", "me"),
      ]);
      setLists({ published: pub, draft: dra, archived: arc });
      clearSelection();
    } finally {
      setLoading(false);
    }
  }

  // single-row ops (quick) with optimistic updates
  async function publishOne(id: number) {
    // Only allow publishing from archived tab to prevent duplicates
    if (tab !== "archived") return;

    // Find the job to move
    const jobToMove = lists.archived.find(j => j.id === id);
    if (!jobToMove) return;

    // Optimistic update: remove from archived, add to published
    setLists(prev => ({
      ...prev,
      archived: prev.archived.filter(j => j.id !== id),
      published: [{ ...jobToMove, status: "published" as JobStatus }, ...prev.published]
    }));

    try {
      await patchJobStatus(id, "published");
      // Success - keep the optimistic update
    } catch (error) {
      // Rollback on failure
      setLists(prev => ({
        ...prev,
        published: prev.published.filter(j => j.id !== id),
        archived: [jobToMove, ...prev.archived]
      }));
      console.error("Failed to publish job:", error);
    }
  }

  async function archiveOne(id: number) {
    // Only allow archiving from published tab
    if (tab !== "published") return;

    // Find the job to move
    const jobToMove = lists.published.find(j => j.id === id);
    if (!jobToMove) return;

    // Optimistic update: remove from published, add to archived
    setLists(prev => ({
      ...prev,
      published: prev.published.filter(j => j.id !== id),
      archived: [{ ...jobToMove, status: "archived" as JobStatus }, ...prev.archived]
    }));

    try {
      await patchJobStatus(id, "archived");
      // Success - keep the optimistic update
    } catch (error) {
      // Rollback on failure
      setLists(prev => ({
        ...prev,
        archived: prev.archived.filter(j => j.id !== id),
        published: [jobToMove, ...prev.published]
      }));
      console.error("Failed to archive job:", error);
    }
  }



  return (
    <div className="pageShell">
      <div className="pageHeader card" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        background: "linear-gradient(135deg, rgb(0 0 0 / 40%), rgb(255 255 255 / 42%))",
        borderRadius: "16px",
        padding: "20px 24px"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{
            margin: "0px",
            fontSize: "1.8em",
            lineHeight: "1.1",
            letterSpacing: "0.4rem",
            color: "rgb(255 255 255)",
            textTransform: "uppercase",
            fontWeight: 300,
            textShadow: "0 2px 4px rgba(0,0,0,0.3)"
          }}>
            {animatedTitle}
          </h1>
          <p style={{
            margin: 0,
            fontSize: "14px",
            color: "rgba(255,255,255,0.8)",
            fontWeight: 300
          }}>
            Manage your job postings across all stages
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#666",
              zIndex: 1
            }} />
            <input
              className="input"
              placeholder="Search jobs..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                minWidth: 320,
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "12px",
                padding: "12px 16px 12px 40px",
                fontSize: "14px",
                color: "#333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            />
          </div>
          <Link
            className="btn btnPrimary"
            to="/admin/create-job"
            style={{
              background: "linear-gradient(135deg, #0072bc, #6a1b9a)",
              border: "none",
              borderRadius: "12px",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.3s ease"
            }}
          >
            <span style={{ fontSize: "16px" }}>+</span> Create Job
          </Link>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="tabs" style={{
        marginTop: 20,
        display: "flex",
        gap: "8px",
        justifyContent: "center",
        padding: "8px",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        backdropFilter: "blur(10px)"
      }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`tabBtn ${tab === t ? "active" : ""}`}
            onClick={() => { setTab(t); clearSelection(); }}
            style={{
              background: tab === t ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
              border: `1px solid ${tab === t ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.15)"}`,
              color: tab === t ? "#ffffff" : "rgba(255, 255, 255, 0.8)",
              padding: "12px 20px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "120px",
              justifyContent: "center"
            }}
          >
            {t === "published" ? <ClipboardList size={16} /> : t === "draft" ? <FileText size={16} /> : <Package size={16} />}
            {t[0].toUpperCase() + t.slice(1)}
            <span className={`badge ${t === "published" ? "success" : t === "draft" ? "" : "neutral"}`} style={{
              marginLeft: 8,
              background: tab === t ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
              color: tab === t ? "#ffffff" : "rgba(255, 255, 255, 0.9)",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Enhanced Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="card" style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 20,
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(15px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          padding: "16px 20px",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "14px",
            fontWeight: "500"
          }}>
            <X size={16} />
            <strong style={{ color: "#ffffff" }}>{selected.size}</strong>
            job{selected.size > 1 ? 's' : ''} selected
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "13px"
          }}>
            Choose action:
          </div>

          <span style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {tab !== "published" && (
              <button
                className="btn btnPrimary"
                onClick={() => doBulk("publish")}
                title="Publish selected jobs"
                style={{
                  padding: '10px 16px',
                  background: "rgba(29, 185, 84, 0.8)",
                  border: "1px solid rgba(29, 185, 84, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Upload size={16} />
                Publish
              </button>
            )}

            {tab !== "archived" && (
              <button
                className="btn btn-archive"
                onClick={() => doBulk("archive")}
                title="Archive selected jobs"
                style={{
                  padding: '10px 16px',
                  background: "rgba(255, 193, 7, 0.8)",
                  border: "1px solid rgba(255, 193, 7, 0.6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Archive size={16} />
                Archive
              </button>
            )}

            <button
              className="btn btn-delete"
              onClick={() => doBulk("delete")}
              title="Delete selected jobs"
              style={{
                padding: '10px 16px',
                background: "rgba(255, 77, 79, 0.8)",
                border: "1px solid rgba(255, 77, 79, 0.6)",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="card" style={{ marginTop: 12, background: "rgb(255 255 255 / 88%)" }}>
        {loading ? (
          <div className="skeleton">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No results" : tab === "published" ? "No published jobs yet" : tab === "draft" ? "No drafts yet" : "No archived jobs"}
            subtitle={query ? "Try a different keyword." : tab === "draft" ? "Save a job as draft from the create form." : undefined}
            cta={tab === "published" ? { to: "/admin/create-job", label: "Create your first job" } : undefined}
          />
        ) : (
          <table className="table" style={{ verticalAlign: "top", tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: '#808080b0', borderRadius: '10px' }}>
              <tr>
                <th style={{ width: 36, color: '#000' }}><div className="cell"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></div></th>
                <th style={{ width: '35%', color: '#000' }}><div className="cell">Title</div></th>
                <th style={{ width: '20%', color: '#000' }}><div className="cell">Meta</div></th>
                <th style={{ width: '25%', color: '#000' }}><div className="cell">Skills</div></th>
                <th style={{ width: 260, color: '#000' }}><div className="cell">Actions</div></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => (
                <tr key={j.id} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f8f8')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                  <td style={{ color: '#000' }}><div className="cell"><input type="checkbox" checked={selected.has(j.id)} onChange={() => toggleOne(j.id)} /></div></td>
                  <td style={{ color: '#000' }}><div className="cell">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ color: '#000' }}>{j.title}</strong>
                      {j.company_name && <span className="muted" style={{ color: '#666' }}>{j.company_name}</span>}
                    </div>
                  </div></td>
                  <td className="muted" style={{ color: '#666' }}><div className="cell">
                    {[j.location_city, j.location_country].filter(Boolean).join(", ")}
                    { (j.employment_type || j.work_mode) && <><br/>{[j.employment_type, j.work_mode].filter(Boolean).join(" • ")}</> }
                  </div></td>
                  <td style={{ color: '#000' }}><div className="cell">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(j.skills || []).slice(0, 4).map(s => <span className="chip" key={s} style={{ color: '#000' }}>{s}</span>)}
                      {j.skills && j.skills.length > 4 && <span className="chip" style={{ color: '#000' }}>+{j.skills.length - 4}</span>}
                    </div>
                  </div></td>
                  <td style={{ color: '#000' }}><div className="cell" style={{ display: "flex", gap: 6 }}>
                    <Link className="btn btn-edit" to={`/admin/jobs/${j.id}/edit`} title="Edit" style={{ padding: '8px 12px' }}><Pencil size={14} /></Link>
                    {j.status !== "published" && <button className="btn btnPrimary" onClick={() => publishOne(j.id)} title="Publish" style={{ padding: '8px 12px' }}><Upload size={14} /></button>}
                    {j.status !== "archived" && <button className="btn btn-archive" onClick={() => archiveOne(j.id)} title="Archive" style={{ padding: '8px 12px' }}><Archive size={14} /></button>}
                    <button className="btn btn-delete" onClick={async ()=>{ if (confirm("Delete this job?")) { await bulkDelete([j.id]); await refreshTab(j.status); }}} title="Delete" style={{ padding: '8px 12px' }}><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, cta }:{ title:string; subtitle?:string; cta?:{to:string; label:string} }){
  return (
    <div style={{ textAlign:"center", padding:"32px 12px" }}>
      <h3 style={{ marginBottom: 15 }}>{title}</h3>
      {subtitle && <p className="muted" style={{ marginTop: 0 }}>{subtitle}</p>}
      {cta && <Link className="btn btnPrimary" to={cta.to} style={{ marginTop: 8 }}>{cta.label}</Link>}
    </div>
  );
}
