import React, { useEffect, useMemo, useState } from "react";

/** =========================
 *  HARD-CODED BACKEND HOSTS
 *  ========================= */
const API_BASE = "https://forgeiq-production.up.railway.app"; // FastAPI
// Example endpoints you’ll implement on the backend:
// /api/forgeiq/system/overall-summary
// /api/forgeiq/projects/summary
// /api/forgeiq/pipelines/recent-summary
// /api/forgeiq/deployments/recent-summary

/** ================
 *  Basic UI Styles
 *  ================ */
const styles = `
:root {
  --bg:#0c1117; --panel:#121a23; --panel-2:#0f1620; --text:#e7edf3; --muted:#96a2b4;
  --border:#1e2936; --green:#34d399; --yellow:#f59e0b; --red:#ef4444; --blue:#60a5fa; --cyan:#22d3ee;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.h1 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
.p { color: var(--muted); margin: 0 0 20px; }
.grid { display: grid; gap: 16px; }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.card { background: linear-gradient(180deg, var(--panel), var(--panel-2)); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.kpi { display: flex; flex-direction: column; gap: 6px; }
.kpi .label { color: var(--muted); font-size: 12px; }
.kpi .value { font-size: 22px; font-weight: 700; }
.badge { display:inline-flex; align-items:center; gap:8px; padding: 6px 10px; border-radius: 999px; font-weight:600; font-size:12px; border:1px solid var(--border); }
.badge.ok { background: rgba(52,211,153,.12); color: var(--green); }
.badge.warn { background: rgba(245,158,11,.12); color: var(--yellow); }
.badge.err { background: rgba(239,68,68,.12); color: var(--red); }
.sectionTitle { font-size: 16px; font-weight: 700; margin: 8px 0 10px; }
.row { display:flex; gap:12px; align-items:center; justify-content:space-between; }
.btn { background: transparent; color: var(--text); border:1px solid var(--border); padding:8px 12px; border-radius:10px; cursor:pointer; }
.btn:hover { border-color: var(--cyan); }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid var(--border); padding:10px 8px; text-align:left; font-size: 13px; }
.caption { color: var(--muted); font-size: 12px; }
.link { color: var(--cyan); text-decoration: none; }
.link:hover { text-decoration: underline; }
hr.sep { height:1px; border:0; background: var(--border); margin: 20px 0; }
`;

/** ============
 *  Type Models
 *  ============ */
type GeneralSummary = {
  active_projects_count: number;
  total_agents_defined: number;
  agents_online_count: number;
  critical_alerts_count: number;
  system_health_status: "Operational" | "Degraded" | "Minor Issues" | string;
};

type ProjectSummary = {
  name: string;
  last_build_status: "SUCCESSFUL" | "FAILED" | "IN_PROGRESS" | "COMPLETED_SUCCESS" | string;
  last_build_timestamp: string; // ISO
  repo_url?: string;
};

type PipelineSummary = {
  dag_id: string;
  project_id: string;
  status: "COMPLETED_SUCCESS" | "FAILED" | "RUNNING" | string;
  started_at: string; // ISO
  trigger: string;
};

type DeploymentSummary = {
  deployment_id: string;
  service_name: string;
  target_environment: "staging" | "production" | string;
  commit_sha: string;
  status: "SUCCESSFUL" | "FAILED" | "IN_PROGRESS" | string;
  completed_at: string; // ISO
};

/** ====================================
 *  Mock Loaders (toggle real API later)
 *  ==================================== */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadGeneralSummaryMock(): Promise<GeneralSummary> {
  await sleep(300);
  const choices = ["Operational", "Degraded", "Minor Issues"] as const;
  return {
    active_projects_count: Math.floor(Math.random() * 8) + 3,
    total_agents_defined: 12,
    agents_online_count: Math.floor(Math.random() * 5) + 8,
    critical_alerts_count: Math.floor(Math.random() * 3),
    system_health_status: choices[Math.floor(Math.random() * choices.length)],
  };
}

async function loadProjectsSummaryMock(): Promise<ProjectSummary[]> {
  await sleep(400);
  const names = ["PhoenixCI", "NovaBuild", "QuantumDeploy"];
  const statuses = ["SUCCESSFUL", "FAILED", "IN_PROGRESS", "COMPLETED_SUCCESS"] as const;
  return names.map((n) => ({
    name: n,
    last_build_status: statuses[Math.floor(Math.random() * statuses.length)],
    last_build_timestamp: new Date(Date.now() - (3600_000 * (1 + Math.floor(Math.random() * 24)))).toISOString(),
    repo_url: `https://github.com/example/${n.toLowerCase()}`,
  }));
}

async function loadPipelinesSummaryMock(): Promise<PipelineSummary[]> {
  await sleep(600);
  const statuses = ["COMPLETED_SUCCESS", "FAILED", "RUNNING"] as const;
  const projects = ["PhoenixCI", "NovaBuild"];
  const mkId = () => "dag_" + Math.random().toString(16).slice(2, 10);
  const triggers = ["Commit abc1234", "Manual via API", "Scheduled"];
  return new Array(3).fill(0).map(() => ({
    dag_id: mkId(),
    project_id: projects[Math.floor(Math.random() * projects.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    started_at: new Date(Date.now() - (60_000 * (5 + Math.floor(Math.random() * 120)))).toISOString(),
    trigger: triggers[Math.floor(Math.random() * triggers.length)],
  }));
}

async function loadDeploymentsSummaryMock(): Promise<DeploymentSummary[]> {
  await sleep(500);
  const statuses = ["SUCCESSFUL", "FAILED", "IN_PROGRESS"] as const;
  const services = ["forgeiq-backend", "codenav-agent", "plan-agent"];
  const envs = ["staging", "production"];
  const mkId = () => "depl_" + Math.random().toString(16).slice(2, 10);
  const mkSha = () => Math.random().toString(16).slice(2, 9);
  return new Array(3).fill(0).map(() => ({
    deployment_id: mkId(),
    service_name: services[Math.floor(Math.random() * services.length)],
    target_environment: envs[Math.floor(Math.random() * envs.length)],
    commit_sha: mkSha(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    completed_at: new Date(Date.now() - (60_000 * (15 + Math.floor(Math.random() * 300)))).toISOString(),
  }));
}

/** =======================================
 *  Flip these to call your REAL endpoints
 *  =======================================
 *  Example (FastAPI):
 *   const res = await fetch(`${API_BASE}/api/forgeiq/system/overall-summary`);
 *   if(!res.ok) throw new Error("…");
 *   return res.json();
 */
const loadGeneralSummary = loadGeneralSummaryMock;
const loadProjectsSummary = loadProjectsSummaryMock;
const loadPipelinesSummary = loadPipelinesSummaryMock;
const loadDeploymentsSummary = loadDeploymentsSummaryMock;

/** ============
 *  Utilities
 *  ============ */
function fmtDate(s?: string) {
  if (!s) return "N/A";
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function StatusBadge({ status }: { status: string }) {
  const lc = status.toLowerCase();
  const cls =
    lc.includes("success") || lc === "operational"
      ? "ok"
      : lc.includes("fail") || lc.includes("degrad")
      ? "warn"
      : lc.includes("issue") || lc.includes("error")
      ? "err"
      : "";
  return <span className={`badge ${cls}`}>{status}</span>;
}

/** ==============
 *  Main Component
 *  ============== */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState<GeneralSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [g, pr, pi, de] = await Promise.all([
          loadGeneralSummary(),
          loadProjectsSummary(),
          loadPipelinesSummary(),
          loadDeploymentsSummary(),
        ]);
        if (!mounted) return;
        setGeneral(g);
        setProjects(pr);
        setPipelines(pi);
        setDeployments(de);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const healthBadge = useMemo(() => {
    const s = general?.system_health_status ?? "Unknown";
    return <StatusBadge status={s} />;
  }, [general]);

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="row" style={{ marginBottom: 8 }}>
          <h1 className="h1">📊 ForgeIQ System Overview</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setRefreshKey((k) => k + 1)}>
              Refresh
            </button>
          </div>
        </div>
        <p className="p">A comprehensive snapshot of your agentic build system’s activities and health.</p>

        {error && <div className="card" style={{ borderColor: "var(--red)" }}>Error: {error}</div>}

        {/* System Health & Metrics */}
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row">
            <div className="sectionTitle">System Health &amp; Metrics</div>
            {healthBadge}
          </div>
          <div className="grid grid-4" style={{ marginTop: 10 }}>
            <div className="kpi">
              <div className="label">Active Projects</div>
              <div className="value">{general?.active_projects_count ?? "—"}</div>
            </div>
            <div className="kpi">
              <div className="label">Agents Online</div>
              <div className="value">
                {general ? `${general.agents_online_count} / ${general.total_agents_defined}` : "—"}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Critical Alerts</div>
              <div className="value">{general?.critical_alerts_count ?? "—"}</div>
            </div>
            <div className="kpi">
              <div className="label">Overall Status</div>
              <div className="value">{general?.system_health_status ?? "Unknown"}</div>
            </div>
          </div>
        </div>

        {/* Projects Snapshot */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Projects Snapshot</div>
          <button
            className="btn"
            onClick={() => window.location.assign(`${API_BASE}/docs`)}
            title="Wire to your Projects UI later"
          >
            View All Projects
          </button>
        </div>
        <div className="grid grid-3">
          {projects.map((p) => (
            <div key={p.name} className="card">
              <div className="row">
                <strong>{p.name}</strong>
                <StatusBadge status={p.last_build_status} />
              </div>
              <div className="caption" style={{ marginTop: 6 }}>
                Last Build at {fmtDate(p.last_build_timestamp)}
              </div>
              {!!p.repo_url && (
                <div style={{ marginTop: 10 }}>
                  <a className="link" href={p.repo_url} target="_blank" rel="noreferrer">
                    Repository ↗
                  </a>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  onClick={() => alert(`Open Project Details: ${p.name}`)}
                >
                  Go to Project Details ➔
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <div className="card">No project summaries to display.</div>}
        </div>

        {/* Pipelines & Builds */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Recent Pipelines / Builds</div>
          <button
            className="btn"
            onClick={() => window.location.assign(`${API_BASE}/docs`)}
            title="Wire to your Pipelines UI later"
          >
            View All Pipelines
          </button>
        </div>
        <div className="grid">
          {pipelines.map((p) => (
            <div key={p.dag_id} className="card">
              <div className="row">
                <strong>DAG: {p.dag_id}</strong>
                <StatusBadge status={p.status} />
              </div>
              <div className="caption" style={{ marginTop: 6 }}>
                Project: {p.project_id} • Started: {fmtDate(p.started_at)} • Trigger: {p.trigger}
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  className="btn"
                  onClick={() => alert(`View DAG Details: ${p.dag_id}`)}
                >
                  View DAG Details
                </button>
              </div>
            </div>
          ))}
          {pipelines.length === 0 && <div className="card">No recent pipelines to display.</div>}
        </div>

        {/* Deployments */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Recent Deployments</div>
          <button
            className="btn"
            onClick={() => window.location.assign(`${API_BASE}/docs`)}
            title="Wire to your Deployments UI later"
          >
            View All Deployments
          </button>
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Environment</th>
                <th>Commit</th>
                <th>Status</th>
                <th>Completed At</th>
                <th>Deployment ID</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.deployment_id}>
                  <td>{d.service_name}</td>
                  <td>{d.target_environment}</td>
                  <td>
                    <code>{d.commit_sha}</code>
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>{fmtDate(d.completed_at)}</td>
                  <td>{d.deployment_id}</td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr>
                  <td colSpan={6} className="caption">No recent deployment summaries.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Agents (placeholder) */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Agents Status Snapshot</div>
          <button className="btn" onClick={() => alert("Agents page coming soon")}>
            View Agent Details
          </button>
        </div>
        <div className="card">
          <div className="caption">
            Agent status summary not yet implemented in this view. This section will reflect
            <em> total / active / issues</em> once the backend endpoint is ready.
          </div>
        </div>

        {loading && (
          <>
            <hr className="sep" />
            <div className="caption">Loading…</div>
          </>
        )}
      </div>
    </>
  );
}
