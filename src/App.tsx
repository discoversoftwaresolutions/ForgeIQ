import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pusher, { Channel } from "pusher-js";

/** =========================
 *  BACKEND HOST
 *  ========================= */
const API_BASE = "https://forgeiq-production.up.railway.app";

/** =========================
 *  Runtime Config Types
 *  ========================= */
type PublicConfig = {
  llm: {
    provider_priority: string;        // e.g., "openai,gemini,codex"
    openai_model: string;
    gemini_model: string;
  };
  realtime: {
    wsHost: string;
    wsPort: number;
    forceTLS: boolean;
    cluster: string;                  // required by pusher-js
    appId: string;                    // for reference
    publicKey: string;                // Pusher key
  };
};

/** ================
 *  Basic UI Styles
 *  ================ */
const styles = `
:root {
  --bg:#0b1117; --panel:#0f1520; --panel-2:#0d1420; --text:#e6edf3; --muted:#9fb0c2;
  --border:#1b2735; --green:#34d399; --yellow:#f59e0b; --red:#ef4444; --blue:#60a5fa; --cyan:#22d3ee;
  --purple:#a78bfa; --pink:#f472b6;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; background: radial-gradient(1200px 600px at 20% -10%, rgba(34,211,238,.06), transparent), var(--bg); color: var(--text); font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
.container { max-width: 1240px; margin: 0 auto; padding: 24px; }
.h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; letter-spacing: .2px; }
.p { color: var(--muted); margin: 0 0 18px; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.card { background: linear-gradient(180deg, var(--panel), var(--panel-2)); border: 1px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: 0 0 0 1px rgba(255,255,255,0.02) inset; }
.kpi { display: flex; flex-direction: column; gap: 4px; }
.kpi .label { color: var(--muted); font-size: 12px; }
.kpi .value { font-size: 22px; font-weight: 800; letter-spacing: .2px; }
.badge { display:inline-flex; align-items:center; gap:8px; padding: 6px 10px; border-radius: 999px; font-weight:600; font-size:12px; border:1px solid var(--border); }
.badge.ok { background: rgba(52,211,153,.14); color: var(--green); }
.badge.warn { background: rgba(245,158,11,.14); color: var(--yellow); }
.badge.err { background: rgba(239,68,68,.14); color: var(--red); }
.sectionTitle { font-size: 16px; font-weight: 800; margin: 8px 0 10px; letter-spacing:.2px; }
.row { display:flex; gap:12px; align-items:center; justify-content:space-between; }
.btn { background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); color: var(--text); border:1px solid var(--border); padding:8px 12px; border-radius:12px; cursor:pointer; transition: border-color .15s ease, transform .05s ease; }
.btn:hover { border-color: var(--cyan); }
.btn:active { transform: translateY(1px); }
.btn.primary { background: radial-gradient(120% 120% at 10% -10%, rgba(34,211,238,.18), transparent), linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); border-color: rgba(34,211,238,.5); }
.input, .textarea, .select { width: 100%; background: rgba(255,255,255,.02); color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; }
.textarea { min-height: 90px; resize: vertical; }
.caption { color: var(--muted); font-size: 12px; }
.link { color: var(--cyan); text-decoration: none; }
.link:hover { text-decoration: underline; }
hr.sep { height:1px; border:0; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 22px 0; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
.feed { display:flex; flex-direction:column; gap:10px; max-height: 260px; overflow:auto; }
.feed-item { border: 1px dashed var(--border); border-radius: 12px; padding: 10px; }
.pill { padding: 4px 8px; border-radius: 999px; border:1px solid var(--border); font-size: 11px; color: var(--muted); }
.chips { display:flex; gap:8px; flex-wrap:wrap; }
.timeline { display:flex; flex-direction:column; gap:8px; }
.timeline .trow { display:flex; gap:8px; align-items:flex-start; }
.timeline .dot { width:10px; height:10px; border-radius:50%; background: var(--cyan); margin-top:6px; box-shadow: 0 0 0 3px rgba(34,211,238,.12); }
.timeline .content { flex:1; }
.hint { color: var(--muted); font-size: 12px; margin-top: 6px; }
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
type ProjectSummary = { name: string; last_build_status: string; last_build_timestamp: string; repo_url?: string; };
type PipelineSummary = { dag_id: string; project_id: string; status: string; started_at: string; trigger: string; };
type DeploymentSummary = { deployment_id: string; service_name: string; target_environment: string; commit_sha: string; status: string; completed_at: string; };
type ForgeIQEvent = {
  event?: string;
  task_id: string;
  task_type: string;
  status: string;
  current_stage?: string;
  progress?: number;
  logs?: string;
  payload?: any;
  output_data?: any;
  details?: any;
  timestamp?: number;
  source?: string;
};

/** ====================================
 *  Mocks (used on failure to fetch)
 *  ==================================== */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadGeneralSummaryMock(): Promise<GeneralSummary> {
  await sleep(200);
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
  await sleep(200);
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
  await sleep(200);
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
  await sleep(200);
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
 *  Real endpoint loaders with fallback
 *  ======================================= */
async function getConfig(): Promise<PublicConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error("Failed to fetch /config");
  return res.json();
}
async function loadGeneralSummaryReal(): Promise<GeneralSummary> {
  const r = await fetch(`${API_BASE}/api/forgeiq/system/overall-summary`);
  if (!r.ok) throw new Error("overall-summary  error");
  return r.json();
}
async function loadProjectsSummaryReal(): Promise<ProjectSummary[]> {
  const r = await fetch(`${API_BASE}/api/forgeiq/projects/summary?limit=3`);
  if (!r.ok) throw new Error("projects summary error");
  return r.json();
}
async function loadPipelinesSummaryReal(): Promise<PipelineSummary[]> {
  const r = await fetch(`${API_BASE}/api/forgeiq/pipelines/recent-summary?limit=3`);
  if (!r.ok) throw new Error("pipelines summary error");
  return r.json();
}
async function loadDeploymentsSummaryReal(): Promise<DeploymentSummary[]> {
  const r = await fetch(`${API_BASE}/api/forgeiq/deployments/recent-summary?limit=3`);
  if (!r.ok) throw new Error("deployments summary error");
  return r.json();
}
/** Flip to real; if it throws, we catch and fallback to mocks */
const loadGeneralSummary = () => loadGeneralSummaryReal().catch(loadGeneralSummaryMock);
const loadProjectsSummary = () => loadProjectsSummaryReal().catch(loadProjectsSummaryMock);
const loadPipelinesSummary = () => loadPipelinesSummaryReal().catch(loadPipelinesSummaryMock);
const loadDeploymentsSummary = () => loadDeploymentsSummaryReal().catch(loadDeploymentsSummaryMock);

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
  const lc = (status || "").toLowerCase();
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
const toProviders = (csv: string) =>
  csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** ==============
 *  Main Component
 *  ============== */
export default function App() {
  // Runtime config
  const [cfg, setCfg] = useState<PublicConfig | null>(null);

  // Dashboard data
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState<GeneralSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [deployments, setDeployments] = useState<DeploymentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Realtime
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const [eventFeed, setEventFeed] = useState<ForgeIQEvent[]>([]); // rolling live events

  // AI Assistant
  const [prompt, setPrompt] = useState("");
  const [assistantLog, setAssistantLog] = useState<{ role: "user" | "assistant"; content: string; at: number }[]>([]);
  const [providersCsv, setProvidersCsv] = useState("openai,gemini");
  const [isGenerating, setIsGenerating] = useState(false);

  // Pipeline Runner
  const [proj, setProj] = useState("PhoenixCI");
  const [projId, setProjId] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [trigger, setTrigger] = useState("Manual");
  const [params, setParams] = useState("");
  const [lastPipelineTaskId, setLastPipelineTaskId] = useState<string | null>(null);

  /** Load runtime config then dashboard data */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const conf = await getConfig();
        if (!alive) return;
        setCfg(conf);
        // Initialize provider field from backend default, if present
        if (conf?.llm?.provider_priority) {
          setProvidersCsv(conf.llm.provider_priority);
        }
      } catch (e) {
        // Non-fatal; UI still works with defaults
      }
      try {
        setLoading(true);
        const [g, pr, pi, de] = await Promise.all([
          loadGeneralSummary(),
          loadProjectsSummary(),
          loadPipelinesSummary(),
          loadDeploymentsSummary(),
        ]);
        if (!alive) return;
        setGeneral(g); setProjects(pr); setPipelines(pi); setDeployments(de);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  /** Realtime wiring with Pusher/Soketi */
  useEffect(() => {
    if (!cfg?.realtime?.publicKey) return;

    // Teardown previous
    if (channelRef.current) { channelRef.current.unbind_all(); channelRef.current.unsubscribe(); channelRef.current = null; }
    if (pusherRef.current) { pusherRef.current.disconnect(); pusherRef.current = null; }

    const p = new Pusher(cfg.realtime.publicKey, {
      cluster: cfg.realtime.cluster || "mt1",
      wsHost: cfg.realtime.wsHost,
      wsPort: cfg.realtime.wsPort,
      forceTLS: cfg.realtime.forceTLS,
      enabledTransports: ["ws", "wss"],
      disableStats: true,
      // if you require auth for private- channels:
      authEndpoint: `${API_BASE}/api/broadcasting/auth`,
      auth: { headers: {} },
    });
    const ch = p.subscribe("private-forgeiq");

    const handler = (ev: ForgeIQEvent) => {
      setEventFeed((old) => {
        const next = [{ ...(ev || {}), timestamp: ev?.timestamp || Date.now() }, ...old].slice(0, 200);
        return next;
      });
      // Optional: optimistic dashboard tweaks
      if (ev?.task_type?.includes("deployment")) {
        setDeployments((d) => d); // placeholder; could merge by ID
      }
    };

    ch.bind_global((eventName: string, data: any) => {
      // Listen to any event name (TaskUpdated, BuildUpdated, DeploymentCompleted, etc.)
      if (typeof data === "string") {
        try { handler(JSON.parse(data)); } catch { /* ignore */ }
      } else {
        handler(data);
      }
    });

    pusherRef.current = p;
    channelRef.current = ch;
    return () => {
      ch.unbind_all();
      p.unsubscribe("private-forgeiq");
      p.disconnect();
    };
  }, [cfg?.realtime?.publicKey, cfg?.realtime?.wsHost, cfg?.realtime?.wsPort, cfg?.realtime?.forceTLS, cfg?.realtime?.cluster]);

  /** Assistant: send to /gateway with providers */
  const sendPrompt = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    const userMsg = { role: "user" as const, content: prompt.trim(), at: Date.now() };
    setAssistantLog((log) => [...log, userMsg]);
    setPrompt("");

    try {
      const providers = toProviders(providersCsv);
      const body = {
        prompt: userMsg.content,
        history: assistantLog.map((m) => ({ role: m.role, content: m.content })),
        context_data: { config_options: { providers } },
      };
      const res = await fetch(`${API_BASE}/gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gateway request failed");
      const j = await res.json(); // {status, task_id, ...}
      // We’ll append a “placeholder assistant typing” message; the actual answer will arrive via realtime.
      const placeholder = { role: "assistant" as const, content: "…listening for realtime response", at: Date.now() };
      setAssistantLog((log) => [...log, placeholder]);

      // Optional: poll fallback if WS misses (short-lived)
      setTimeout(async () => {
        try {
          const poll = await fetch(`${API_BASE}/forgeiq/status/${j.task_id}`);
          if (poll.ok) {
            const sj = await poll.json();
            const text = sj?.output_data?.llm_response;
            if (text) {
              setAssistantLog((log) => {
                // replace placeholder
                const idx = log.findIndex((m) => m.content === "…listening for realtime response" && m.role === "assistant");
                const copy = [...log];
                if (idx >= 0) copy[idx] = { role: "assistant", content: text, at: Date.now() };
                else copy.push({ role: "assistant", content: text, at: Date.now() });
                return copy;
              });
            }
          }
        } catch { /* ignore */ }
      }, 1800);
    } catch (e: any) {
      setAssistantLog((log) => [...log, { role: "assistant", content: `Error: ${e?.message || e}`, at: Date.now() }]);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, providersCsv, assistantLog, isGenerating]);

  /** When realtime LLM result arrives, patch the chat log */
  useEffect(() => {
    if (eventFeed.length === 0) return;
    const ev = eventFeed[0];
    if (ev?.task_type === "llm_chat_response" && ev?.status?.toLowerCase() === "completed") {
      const text = ev?.output_data?.llm_response;
      if (text) {
        setAssistantLog((log) => {
          const idx = log.findIndex((m) => m.content === "…listening for realtime response" && m.role === "assistant");
          const copy = [...log];
          if (idx >= 0) copy[idx] = { role: "assistant", content: text, at: Date.now() };
          else copy.push({ role: "assistant", content: text, at: Date.now() });
          return copy;
        });
      }
    }
  }, [eventFeed]);

  /** Run live pipeline */
  const runLivePipeline = useCallback(async () => {
    const providers = toProviders(providersCsv);
    const payload = {
      project: proj,
      project_id: projId || undefined,
      repo_url: repoUrl || undefined,
      branch: branch || undefined,
      trigger: trigger || undefined,
      parameters: params || undefined,
      providers: providers.length ? providers : undefined,
    };
    try {
      const r = await fetch(`${API_BASE}/pipelines/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setLastPipelineTaskId(j.forgeiq_task_id);
    } catch (e: any) {
      alert(`Pipeline start failed: ${e?.message || e}`);
    }
  }, [proj, projId, repoUrl, branch, trigger, params, providersCsv]);

  /** Derived */
  const healthBadge = useMemo(() => <StatusBadge status={general?.system_health_status ?? "Unknown"} />, [general]);

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="row" style={{ marginBottom: 8 }}>
          <h1 className="h1">⚡ ForgeIQ — Agentic Build & AI Assist</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</button>
            <button className="btn" onClick={() => window.open(`${API_BASE}/docs`, "_blank")}>API Docs</button>
          </div>
        </div>
        <p className="p">
          Operational snapshot, realtime task stream, and a generative AI copilot. Edwin-style capabilities: human-readable summaries, RCA, and
          actionable recommendations with conversational troubleshooting.
        </p>

        {error && <div className="card" style={{ borderColor: "var(--red)" }}>Error: {error}</div>}

        {/* Top Row: KPIs + Noise/Insights */}
        <div className="grid grid-4">
          <div className="card">
            <div className="row"><div className="sectionTitle">System Health &amp; Metrics</div>{healthBadge}</div>
            <div className="grid grid-4" style={{ marginTop: 10 }}>
              <div className="kpi"><div className="label">Active Projects</div><div className="value">{general?.active_projects_count ?? "—"}</div></div>
              <div className="kpi"><div className="label">Agents Online</div><div className="value">{general ? `${general.agents_online_count} / ${general.total_agents_defined}` : "—"}</div></div>
              <div className="kpi"><div className="label">Critical Alerts</div><div className="value">{general?.critical_alerts_count ?? "—"}</div></div>
              <div className="kpi"><div className="label">Overall</div><div className="value">{general?.system_health_status ?? "Unknown"}</div></div>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              Inspired by Edwin AI patterns: compress alert noise, correlate, and summarize into actionable insights. {/* Edwin references: LM docs/news */}
            </div>
          </div>

          {/* Edwin-style "Noise Reduced" + "Insights Today" */}
          <div className="card">
            <div className="sectionTitle">Event Intelligence</div>
            <div className="grid grid-2" style={{ marginTop: 6 }}>
              <div className="kpi"><div className="label">Noise Reduction</div><div className="value">90–95%</div></div>
              <div className="kpi"><div className="label">Insights Today</div><div className="value">{Math.max(3, (general?.critical_alerts_count ?? 0) + 2)}</div></div>
            </div>
            <div className="hint">Automatic dedupe, correlation, & prioritization.</div>
          </div>

          {/* Realtime Feed */}
          <div className="card">
            <div className="sectionTitle">Realtime Task Feed</div>
            <div className="feed">
              {eventFeed.slice(0, 6).map((e, i) => (
                <div key={i} className="feed-item">
                  <div className="row">
                    <span className="pill mono">{e.task_type}</span>
                    <StatusBadge status={`${e.status}${e.current_stage ? ` · ${e.current_stage}` : ""}`} />
                  </div>
                  {!!e.logs && <div className="caption" style={{ marginTop: 6 }}>{e.logs}</div>}
                  {!!e.progress && <div className="caption">Progress: {e.progress}%</div>}
                </div>
              ))}
              {eventFeed.length === 0 && <div className="caption">Waiting for events…</div>}
            </div>
          </div>

          {/* Provider Defaults */}
          <div className="card">
            <div className="sectionTitle">LLM Routing Defaults</div>
            <div className="chips">
              <span className="pill">Order: {cfg?.llm?.provider_priority || providersCsv}</span>
              <span className="pill">OpenAI: {cfg?.llm?.openai_model || "gpt-4o-mini"}</span>
              <span className="pill">Gemini: {cfg?.llm?.gemini_model || "gemini-1.5-pro-latest"}</span>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>Change per request below.</div>
          </div>
        </div>

        {/* Projects Snapshot */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Projects Snapshot</div>
          <button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Projects</button>
        </div>
        <div className="grid grid-3">
          {projects.map((p) => (
            <div key={p.name} className="card">
              <div className="row"><strong>{p.name}</strong><StatusBadge status={p.last_build_status} /></div>
              <div className="caption" style={{ marginTop: 6 }}>Last Build: {fmtDate(p.last_build_timestamp)}</div>
              {!!p.repo_url && <div style={{ marginTop: 10 }}><a className="link" href={p.repo_url} target="_blank" rel="noreferrer">Repository ↗</a></div>}
              <div style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => alert(`Open Project Details: ${p.name}`)}>Go to Project Details ➔</button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <div className="card">No project summaries to display.</div>}
        </div>

        {/* Pipelines & Builds */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Recent Pipelines / Builds</div>
          <button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Pipelines</button>
        </div>
        <div className="grid">
          {pipelines.map((p) => (
            <div key={p.dag_id} className="card">
              <div className="row"><strong>DAG: {p.dag_id}</strong><StatusBadge status={p.status} /></div>
              <div className="caption" style={{ marginTop: 6 }}>
                Project: {p.project_id} • Started: {fmtDate(p.started_at)} • Trigger: {p.trigger}
              </div>
              <div className="timeline" style={{ marginTop: 10 }}>
                {/* Edwin-style concise timeline slots */}
                <div className="trow"><div className="dot" /><div className="content caption">Build & unit tests</div></div>
                <div className="trow"><div className="dot" /><div className="content caption">Package & artifact upload</div></div>
                <div className="trow"><div className="dot" /><div className="content caption">Ready for deploy</div></div>
              </div>
            </div>
          ))}
          {pipelines.length === 0 && <div className="card">No recent pipelines to display.</div>}
        </div>

        {/* Deployments */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Recent Deployments</div>
          <button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Deployments</button>
        </div>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="mono" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "8px" }}>Service</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Environment</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Commit</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Completed</th>
                <th style={{ textAlign: "left", padding: "8px" }}>ID</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.deployment_id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px" }}>{d.service_name}</td>
                  <td style={{ padding: "8px" }}>{d.target_environment}</td>
                  <td style={{ padding: "8px" }}><code>{d.commit_sha}</code></td>
                  <td style={{ padding: "8px" }}><StatusBadge status={d.status} /></td>
                  <td style={{ padding: "8px" }}>{fmtDate(d.completed_at)}</td>
                  <td style={{ padding: "8px" }}>{d.deployment_id}</td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr><td colSpan={6} className="caption" style={{ padding: "8px" }}>No recent deployments.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ==== Right Rail: AI Assistant + Live Pipeline Runner ==== */}
        <hr className="sep" />
        <div className="grid grid-2">
          {/* AI Assistant */}
          <div className="card">
            <div className="row">
              <div className="sectionTitle">🤖 Generative AI Assistant</div>
              <div className="chips">
                <span className="pill">Priority: {providersCsv}</span>
              </div>
            </div>
            <div className="hint">Conversational troubleshooting, summaries, RCA hints & recommendations.</div>
            <div style={{ marginTop: 10 }}>
              <label className="caption">Providers (comma order)</label>
              <input className="input" value={providersCsv} onChange={(e) => setProvidersCsv(e.target.value)} placeholder="openai,gemini,codex" />
              <div className="hint">First available provider is used; others are fallback.</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="caption">Prompt</label>
              <textarea className="textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Summarize the last pipeline run and propose fixes for flaky tests…" />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button className="btn primary" disabled={isGenerating || !prompt.trim()} onClick={sendPrompt}>
                  {isGenerating ? "Sending…" : "Ask Assistant"}
                </button>
                <button className="btn" onClick={() => setAssistantLog([])}>Clear</button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sectionTitle">Conversation</div>
              <div className="feed" style={{ maxHeight: 320 }}>
                {assistantLog.map((m, i) => (
                  <div key={i} className="feed-item">
                    <div className="row">
                      <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
                      <span className="caption">{new Date(m.at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{m.content}</div>
                  </div>
                ))}
                {assistantLog.length === 0 && <div className="caption">No messages yet.</div>}
              </div>
            </div>
          </div>

          {/* Live Pipeline Runner */}
          <div className="card">
            <div className="row">
              <div className="sectionTitle">🛠️ Live Pipeline Runner</div>
              {lastPipelineTaskId && <span className="pill">Task: {lastPipelineTaskId.slice(0, 8)}…</span>}
            </div>
            <div className="grid grid-2" style={{ marginTop: 8 }}>
              <div><label className="caption">Project</label><input className="input" value={proj} onChange={(e)=>setProj(e.target.value)} /></div>
              <div><label className="caption">Project ID</label><input className="input" value={projId} onChange={(e)=>setProjId(e.target.value)} placeholder="optional" /></div>
              <div><label className="caption">Repo URL</label><input className="input" value={repoUrl} onChange={(e)=>setRepoUrl(e.target.value)} placeholder="https://github.com/..." /></div>
              <div><label className="caption">Branch</label><input className="input" value={branch} onChange={(e)=>setBranch(e.target.value)} /></div>
              <div><label className="caption">Trigger</label><input className="input" value={trigger} onChange={(e)=>setTrigger(e.target.value)} /></div>
              <div><label className="caption">Parameters (JSON)</label><input className="input mono" value={params} onChange={(e)=>setParams(e.target.value)} placeholder='{"buildMode":"fast"}' /></div>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={runLivePipeline}>Run Pipeline</button>
              <button className="btn" onClick={() => setLastPipelineTaskId(null)}>Reset</button>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sectionTitle">Progress & Insights</div>
              <div className="timeline">
                {eventFeed
                  .filter(e => !lastPipelineTaskId || e.task_id === lastPipelineTaskId)
                  .slice(0, 6)
                  .map((e, i) => (
                    <div className="trow" key={i}>
                      <div className="dot" />
                      <div className="content">
                        <div className="row">
                          <strong>{e.current_stage || "Update"}</strong>
                          <StatusBadge status={e.status} />
                        </div>
                        {!!e.logs && <div className="caption" style={{ marginTop: 4 }}>{e.logs}</div>}
                        {!!e.output_data?.artifact_url && (
                          <div className="caption">Artifact: <a className="link" href={e.output_data.artifact_url} target="_blank" rel="noreferrer">open</a></div>
                        )}
                      </div>
                    </div>
                  ))}
                {(!eventFeed.length || (lastPipelineTaskId && !eventFeed.some(e => e.task_id === lastPipelineTaskId))) && (
                  <div className="caption">Run a pipeline to see live stages here.</div>
                )}
              </div>

              {/* Edwin-style RCA and Actions slots */}
              <div className="grid grid-2" style={{ marginTop: 10 }}>
                <div className="card">
                  <div className="sectionTitle">Suggested RCA</div>
                  <div className="caption">When the assistant or pipeline emits RCA hints, they’ll appear here (e.g., flaky test cluster, misconfigured secret, resource throttling).</div>
                </div>
                <div className="card">
                  <div className="sectionTitle">Actionable Recommendations</div>
                  <div className="caption">Proposed next steps, guardrailed auto-remediations, or links to runbooks — fed by assistant responses or task outputs.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agents placeholder */}
        <hr className="sep" />
        <div className="row">
          <div className="sectionTitle">Agents Status Snapshot</div>
          <button className="btn" onClick={() => alert("Agents page coming soon")}>View Agent Details</button>
        </div>
        <div className="card"><div className="caption">This will reflect total / active / issues once the backend endpoint is ready.</div></div>

        {loading && (<><hr className="sep" /><div className="caption">Loading…</div></>)}
      </div>
    </>
  );
}
