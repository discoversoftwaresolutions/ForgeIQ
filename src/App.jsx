// src/App.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pusher from "pusher-js";

/** =========================
 *  Backend host
 *  ========================= */
const API_BASE = "https://forgeiq-production.up.railway.app";

/** ================
 *  Styles
 *  ================ */
const styles = `
:root {
  --bg:#0b1117; --panel:#0f1520; --panel-2:#0d1420; --text:#e6edf3; --muted:#9fb0c2;
  --border:#1b2735; --green:#34d399; --yellow:#f59e0b; --red:#ef4444; --blue:#60a5fa; --cyan:#22d3ee;
}
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; background: radial-gradient(1200px 600px at 20% -10%, rgba(34,211,238,.06), transparent), var(--bg); color: var(--text); font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
.container { max-width: 1240px; margin: 0 auto; padding: 24px; }
.h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; }
.p { color: var(--muted); margin: 0 0 18px; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.card { background: linear-gradient(180deg, var(--panel), var(--panel-2)); border: 1px solid var(--border); border-radius: 16px; padding: 16px; }
.kpi { display: flex; flex-direction: column; gap: 4px; }
.kpi .label { color: var(--muted); font-size: 12px; }
.kpi .value { font-size: 22px; font-weight: 800; }
.badge { display:inline-flex; align-items:center; gap:8px; padding: 6px 10px; border-radius: 999px; font-weight:600; font-size:12px; border:1px solid var(--border); }
.badge.ok { background: rgba(52,211,153,.14); color: var(--green); }
.badge.warn { background: rgba(245,158,11,.14); color: var(--yellow); }
.badge.err { background: rgba(239,68,68,.14); color: var(--red); }
.sectionTitle { font-size: 16px; font-weight: 800; margin: 8px 0 10px; }
.row { display:flex; gap:12px; align-items:center; justify-content:space-between; }
.btn { background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); color: var(--text); border:1px solid var(--border); padding:8px 12px; border-radius:12px; cursor:pointer; }
.btn:hover { border-color: var(--cyan); }
.caption { color: var(--muted); font-size: 12px; }
.link { color: var(--cyan); text-decoration: none; }
.link:hover { text-decoration: underline; }
hr.sep { height:1px; border:0; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 22px 0; }
.feed { display:flex; flex-direction:column; gap:10px; max-height: 260px; overflow:auto; }
.feed-item { border: 1px dashed var(--border); border-radius: 12px; padding: 10px; }
.pill { padding: 4px 8px; border-radius: 999px; border:1px solid var(--border); font-size: 11px; color: var(--muted); }
.timeline { display:flex; flex-direction:column; gap:8px; }
.timeline .trow { display:flex; gap:8px; align-items:flex-start; }
.timeline .dot { width:10px; height:10px; border-radius:50%; background: var(--cyan); margin-top:6px; }

/* Nav */
.nav { display:flex; gap:10px; margin: 6px 0 16px; flex-wrap: wrap; }
.nav .tab { padding:8px 12px; border:1px solid var(--border); border-radius:10px; cursor:pointer; }
.nav .tab.active { border-color: var(--cyan); }

/* Cora dock */
.cora-root { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; }
.cora-toggle {
  width: 56px; height: 56px; border-radius: 999px; border: 1px solid #1b2735;
  background: linear-gradient(180deg,#0f1520,#0b1117); color: #e6edf3; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.cora-panel {
  position: absolute; right: 0; bottom: 70px; width: 360px; max-height: 70vh; overflow: hidden;
  border: 1px solid #1b2735; border-radius: 14px; background: linear-gradient(180deg,#0f1520,#0b1117);
  color: #e6edf3; box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
.cora-hdr { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #1b2735; }
.cora-title { font-weight: 800; font-size: 13px; letter-spacing: .3px; }
.cora-pill { font-size: 11px; border:1px solid #1b2735; padding: 4px 8px; border-radius: 999px; color:#9fb0c2; }
.cora-feed { padding: 10px; display:flex; flex-direction:column; gap:8px; overflow:auto; max-height: 50vh; }
.cora-item { border: 1px dashed #1b2735; border-radius: 12px; padding: 10px; }
.cora-role { font-weight: 700; font-size: 12px; opacity: .9; }
.cora-time { font-size: 11px; color: #9fb0c2; }
.cora-body { white-space:pre-wrap; font-size: 13px; margin-top: 6px; }
.cora-input { border-top:1px solid #1b2735; padding: 8px; display:grid; grid-template-columns: 1fr auto; gap: 8px; }
.cora-textarea {
  min-height: 70px; resize: vertical; border-radius: 10px; border:1px solid #1b2735; background:#0d1420; color:#e6edf3; padding:8px;
}
.cora-btn {
  border-radius: 10px; border:1px solid #1b2735; background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0));
  color:#e6edf3; padding: 8px 12px; cursor: pointer; font-weight: 700;
}
.cora-row { display:flex; gap:8px; align-items:center; }
.cora-row-right { display:flex; gap:8px; align-items:center; justify-content:flex-end; }

/* Pricing */
.pricing { display:grid; gap:16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.plan { padding:16px; border:1px solid var(--border); border-radius:16px; background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); }
.plan h3 { margin: 0 0 6px; }
.plan ul { margin: 10px 0 0; padding-left: 18px; color: var(--muted); }
`;

/** ============
 *  Types
 *  ============ */
function StatusBadge({ status }) {
  const lc = (status || "").toLowerCase();
  const cls = lc.includes("success") || lc === "operational" ? "ok"
    : lc.includes("fail") || lc.includes("degrad") ? "warn"
    : lc.includes("issue") || lc.includes("error") ? "err" : "";
  return <span className={`badge ${cls}`}>{status}</span>;
}
function fmtDate(s) { try { return s ? new Date(s).toLocaleString() : "N/A"; } catch { return s; } }

/** ============
 *  API helpers
 *  ============ */
async function getConfig() {
  const r = await fetch(`${API_BASE}/config`);
  if (!r.ok) throw new Error("/config failed");
  return r.json();
}
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} failed (${r.status})`);
  return r.json();
}
async function postJSON(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** ============
 *  Cora utilities
 *  ============ */
function usePusher(cfg) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!cfg?.realtime?.publicKey) return;

    try { channelRef.current?.unbind_all?.(); } catch {}
    try { pusherRef.current?.disconnect?.(); } catch {}
    pusherRef.current = null; channelRef.current = null;

    const p = new Pusher(cfg.realtime.publicKey, {
      cluster: cfg.realtime.cluster || "mt1",
      wsHost: cfg.realtime.wsHost,
      wsPort: cfg.realtime.wsPort,
      forceTLS: cfg.realtime.forceTLS,
      enabledTransports: ["ws","wss"],
      disableStats: true,
      authEndpoint: `${API_BASE}/api/broadcasting/auth`,
      auth: { headers: {} },
    });
    const ch = p.subscribe("private-forgeiq");
    p.connection.bind("connected", () => setConnected(true));
    p.connection.bind("disconnected", () => setConnected(false));

    ch.bind_global((eventName, data) => {
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        setEvents((prev) => [{ eventName, ...parsed }, ...prev].slice(0, 200));
      } catch {
        setEvents((prev) => [{ eventName, data }, ...prev].slice(0, 200));
      }
    });

    pusherRef.current = p;
    channelRef.current = ch;
    return () => {
      try { ch?.unbind_all?.(); } catch {}
      try { p?.unsubscribe?.("private-forgeiq"); } catch {}
      try { p?.disconnect?.(); } catch {}
    };
  }, [cfg?.realtime?.publicKey, cfg?.realtime?.wsHost, cfg?.realtime?.wsPort, cfg?.realtime?.forceTLS, cfg?.realtime?.cluster]);

  return { connected, events };
}

function CoraDock({ cfg }) {
  const [open, setOpen] = useState(false);
  const [providersCsv, setProvidersCsv] = useState("openai,gemini");
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);
  const { connected, events } = usePusher(cfg);

  useEffect(() => {
    if (cfg?.llm?.provider_priority) setProvidersCsv(cfg.llm.provider_priority);
  }, [cfg?.llm?.provider_priority]);

  useEffect(() => {
    const onKey = (e) => { if ((e.altKey || e.metaKey) && (e.key?.toLowerCase?.() === "c")) setOpen((o) => !o); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!events.length || !lastTaskId) return;
    const ev = events[0];
    if (ev.task_type === "llm_chat_response" && String(ev.task_id) === String(lastTaskId) &&
        String(ev.status || "").toLowerCase() === "completed" && ev.output_data?.llm_response) {
      setLog((prev) => {
        const idx = prev.findIndex((m) => m.role === "assistant" && m.content === "…listening for realtime response");
        const next = [...prev];
        const msg = { role: "assistant", content: ev.output_data.llm_response, at: Date.now() };
        if (idx >= 0) next[idx] = msg; else next.push(msg);
        return next;
      });
      setLastTaskId(null);
    }
  }, [events, lastTaskId]);

  const sendPrompt = async () => {
    if (!prompt.trim() || busy) return;
    const providers = providersCsv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const userMsg = { role: "user", content: prompt.trim(), at: Date.now() };
    setLog((prev) => [...prev, userMsg]);
    setPrompt(""); setBusy(true);
    try {
      const res = await postJSON(`${API_BASE}/gateway`, {
        prompt: userMsg.content,
        history: log.map((m) => ({ role: m.role, content: m.content })),
        context_data: { config_options: { providers } },
      });
      setLastTaskId(res?.task_id || null);
      setLog((prev) => [...prev, { role: "assistant", content: "…listening for realtime response", at: Date.now() }]);
    } catch (e) {
      setLog((prev) => [...prev, { role: "assistant", content: `Error: ${e?.message || e}`, at: Date.now() }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="cora-root" aria-live="polite">
      <button className="cora-toggle" title="Open Cora (Alt+C)" onClick={() => setOpen((o) => !o)}>C</button>
      {open && (
        <div className="cora-panel" role="dialog" aria-label="Cora Assistant">
          <div className="cora-hdr">
            <div className="cora-row"><div className="cora-title">Cora — Generative Assistant</div><span className="cora-pill">{connected ? "Live" : "Offline"}</span></div>
            <div className="cora-row">
              <span className="cora-pill">Priority: {providersCsv}</span>
              <button className="cora-btn" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
          <div className="cora-feed">
            {log.map((m, i) => (
              <div key={i} className="cora-item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="cora-role">{m.role === "user" ? "You" : "Cora"}</span>
                  <span className="cora-time">{new Date(m.at).toLocaleTimeString()}</span>
                </div>
                <div className="cora-body">{m.content}</div>
              </div>
            ))}
            {log.length === 0 && <div className="cora-item"><div className="cora-body" style={{ opacity:.8 }}>Hi, I’m Cora. Ask me about your pipelines, builds, deployments, or let me draft code and plans.</div></div>}
          </div>
          <div className="cora-input">
            <textarea className="cora-textarea" placeholder="Ask Cora… (Alt+C to toggle)" value={prompt} onChange={(e)=>setPrompt(e.target.value)}
                      onKeyDown={(e)=>{ if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendPrompt(); }} />
            <div className="cora-row-right"><button className="cora-btn" disabled={busy || !prompt.trim()} onClick={sendPrompt}>{busy ? "Sending…" : "Send"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ============
 *  Pages
 *  ============ */
function Overview({ cfg }) {
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState(null);
  const [projects, setProjects] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventFeed, setEventFeed] = useState([]);
  const { events } = usePusher(cfg);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [g, pr, pi, de] = await Promise.all([
          fetchJSON(`${API_BASE}/api/forgeiq/system/overall-summary`),
          fetchJSON(`${API_BASE}/api/forgeiq/projects/summary?limit=3`),
          fetchJSON(`${API_BASE}/api/forgeiq/pipelines/recent-summary?limit=3`),
          fetchJSON(`${API_BASE}/api/forgeiq/deployments/recent-summary?limit=3`),
        ]);
        if (!alive) return;
        setGeneral(g); setProjects(pr); setPipelines(pi); setDeployments(de); setError(null);
      } catch (e) {
        if (!alive) return; setError(e?.message || String(e));
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  useEffect(() => { if (events.length) setEventFeed((old) => [events[0], ...old].slice(0, 200)); }, [events]);

  const healthBadge = useMemo(() => <StatusBadge status={general?.system_health_status ?? "Unknown"} />, [general]);

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 className="h1">⚡ ForgeIQ — System Overview</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setRefreshKey((k) => k + 1)}>Refresh</button>
          <button className="btn" onClick={() => window.open(`${API_BASE}/docs`, "_blank")}>API Docs</button>
        </div>
      </div>
      {error && <div className="card" style={{ borderColor: "var(--red)" }}>Error: {error}</div>}
      <div className="grid grid-4">
        <div className="card">
          <div className="row"><div className="sectionTitle">System Health &amp; Metrics</div>{healthBadge}</div>
          <div className="grid grid-4" style={{ marginTop: 10 }}>
            <div className="kpi"><div className="label">Active Projects</div><div className="value">{general?.active_projects_count ?? "—"}</div></div>
            <div className="kpi"><div className="label">Agents Online</div><div className="value">{general ? `${general.agents_online_count} / ${general.total_agents_defined}` : "—"}</div></div>
            <div className="kpi"><div className="label">Critical Alerts</div><div className="value">{general?.critical_alerts_count ?? "—"}</div></div>
            <div className="kpi"><div className="label">Overall</div><div className="value">{general?.system_health_status ?? "Unknown"}</div></div>
          </div>
        </div>
        <div className="card">
          <div className="sectionTitle">Realtime Task Feed</div>
          <div className="feed">
            {eventFeed.slice(0, 6).map((e, i) => (
              <div key={i} className="feed-item">
                <div className="row"><span className="pill">{e.task_type}</span><StatusBadge status={`${e.status}${e.current_stage ? ` · ${e.current_stage}` : ""}`} /></div>
                {!!e.logs && <div className="caption" style={{ marginTop: 6 }}>{e.logs}</div>}
                {!!e.progress && <div className="caption">Progress: {e.progress}%</div>}
              </div>
            ))}
            {eventFeed.length === 0 && <div className="caption">Waiting for events…</div>}
          </div>
        </div>
        <div className="card">
          <div className="sectionTitle">LLM Routing Defaults</div>
          <div className="caption">Order: {cfg?.llm?.provider_priority || "openai,gemini"}</div>
          <div className="caption">OpenAI: {cfg?.llm?.openai_model || "gpt-4o-mini"}</div>
          <div className="caption">Gemini: {cfg?.llm?.gemini_model || "gemini-1.5-pro-latest"}</div>
        </div>
        <div className="card">
          <div className="sectionTitle">Controls</div>
          <div className="caption">Use Refresh to re-fetch summaries. Realtime events stream in automatically.</div>
        </div>
      </div>

      <hr className="sep" />
      <div className="row"><div className="sectionTitle">Projects Snapshot</div><button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Projects</button></div>
      <div className="grid grid-3">
        {projects.map((p) => (
          <div key={p.name} className="card">
            <div className="row"><strong>{p.name}</strong><StatusBadge status={p.last_build_status} /></div>
            <div className="caption" style={{ marginTop: 6 }}>Last Build: {fmtDate(p.last_build_timestamp)}</div>
            {!!p.repo_url && <div style={{ marginTop: 10 }}><a className="link" href={p.repo_url} target="_blank" rel="noreferrer">Repository ↗</a></div>}
          </div>
        ))}
        {projects.length === 0 && <div className="card">No project summaries to display.</div>}
      </div>

      <hr className="sep" />
      <div className="row"><div className="sectionTitle">Recent Pipelines / Builds</div><button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Pipelines</button></div>
      <div className="grid">
        {pipelines.map((p) => (
          <div key={p.dag_id} className="card">
            <div className="row"><strong>DAG: {p.dag_id}</strong><StatusBadge status={p.status} /></div>
            <div className="caption" style={{ marginTop: 6 }}>Project: {p.project_id} • Started: {fmtDate(p.started_at)} • Trigger: {p.trigger}</div>
          </div>
        ))}
        {pipelines.length === 0 && <div className="card">No recent pipelines to display.</div>}
      </div>

      <hr className="sep" />
      <div className="row"><div className="sectionTitle">Recent Deployments</div><button className="btn" onClick={() => window.location.assign(`${API_BASE}/docs`)}>View All Deployments</button></div>
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
            {deployments.length === 0 && <tr><td colSpan={6} className="caption" style={{ padding: "8px" }}>No recent deployments.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CoraStudio({ cfg }) {
  // A full-page version of Cora with session log
  const [providersCsv, setProvidersCsv] = useState(cfg?.llm?.provider_priority || "openai,gemini");
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);
  const { connected, events } = usePusher(cfg);

  useEffect(() => {
    if (events.length && lastTaskId) {
      const ev = events[0];
      if (ev.task_type === "llm_chat_response" && String(ev.task_id) === String(lastTaskId) &&
          String(ev.status || "").toLowerCase() === "completed" && ev.output_data?.llm_response) {
        setLog((prev) => {
          const idx = prev.findIndex((m) => m.role === "assistant" && m.content === "…listening for realtime response");
          const next = [...prev];
          const msg = { role: "assistant", content: ev.output_data.llm_response, at: Date.now() };
          if (idx >= 0) next[idx] = msg; else next.push(msg);
          return next;
        });
        setLastTaskId(null);
      }
    }
  }, [events, lastTaskId]);

  const sendPrompt = async () => {
    if (!prompt.trim() || busy) return;
    const providers = providersCsv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const userMsg = { role: "user", content: prompt.trim(), at: Date.now() };
    setLog((prev) => [...prev, userMsg]); setPrompt(""); setBusy(true);
    try {
      const res = await postJSON(`${API_BASE}/gateway`, {
        prompt: userMsg.content,
        history: log.map((m) => ({ role: m.role, content: m.content })),
        context_data: { config_options: { providers } },
      });
      setLastTaskId(res?.task_id || null);
      setLog((prev) => [...prev, { role: "assistant", content: "…listening for realtime response", at: Date.now() }]);
    } catch (e) {
      setLog((prev) => [...prev, { role: "assistant", content: `Error: ${e?.message || e}`, at: Date.now() }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 className="h1">🤖 Cora Studio</h1>
        <span className="pill">{connected ? "Live" : "Offline"}</span>
      </div>
      <div className="card">
        <div className="grid grid-2">
          <div>
            <label className="caption">Providers (comma order)</label>
            <input className="btn" style={{ width: "100%" }} value={providersCsv} onChange={(e)=>setProvidersCsv(e.target.value)} />
            <div className="caption">First available provider is used; others fallback.</div>
          </div>
          <div>
            <label className="caption">Prompt</label>
            <textarea className="btn" style={{ width: "100%", minHeight: 90 }} value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Ask Cora to propose a build plan, fix a failing pipeline step, draft code…"/>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button className="btn" disabled={busy || !prompt.trim()} onClick={sendPrompt}>{busy ? "Sending…" : "Ask Cora"}</button>
              <button className="btn" onClick={()=>setLog([])}>Clear</button>
            </div>
          </div>
        </div>
      </div>
      <hr className="sep" />
      <div className="card">
        <div className="sectionTitle">Conversation</div>
        <div className="feed" style={{ maxHeight: 420 }}>
          {log.map((m,i)=>(
            <div key={i} className="feed-item">
              <div className="row"><strong>{m.role === "user" ? "You" : "Cora"}</strong><span className="caption">{new Date(m.at).toLocaleTimeString()}</span></div>
              <div style={{ whiteSpace:"pre-wrap", marginTop: 6 }}>{m.content}</div>
            </div>
          ))}
          {log.length===0 && <div className="caption">No messages yet.</div>}
        </div>
      </div>
    </>
  );
}

function Uploads() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const list = await fetchJSON(`${API_BASE}/files/list`);
      setFiles(list);
    } catch (e) {
      setErr("Listing not available yet (GET /files/list). Ask your backend team to enable it.");
      setFiles([]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(`${API_BASE}/files/upload`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      await refresh();
      alert("Upload complete.");
    } catch (e2) {
      setErr(`Upload failed (POST /files/upload): ${e2?.message || e2}`);
    } finally { setBusy(false); e.target.value = ""; }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 className="h1">📤 Uploads</h1>
        <label className="btn">
          Choose file
          <input type="file" style={{ display: "none" }} onChange={onUpload} disabled={busy}/>
        </label>
      </div>
      {err && <div className="card" style={{ borderColor: "var(--red)" }}>{err}</div>}
      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)" }}>
              <th style={{ textAlign:"left", padding:"8px" }}>Name</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Size</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Uploaded</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f)=>(
              <tr key={f.id} style={{ borderBottom:"1px solid var(--border)" }}>
                <td style={{ padding:"8px" }}>{f.name}</td>
                <td style={{ padding:"8px" }}>{(f.size/1024).toFixed(1)} KB</td>
                <td style={{ padding:"8px" }}>{fmtDate(f.uploaded_at)}</td>
                <td style={{ padding:"8px" }}>{f.url ? <a className="link" href={f.url} target="_blank" rel="noreferrer">download</a> : <span className="caption">n/a</span>}</td>
              </tr>
            ))}
            {files.length===0 && <tr><td colSpan={4} className="caption" style={{ padding:"8px" }}>No files yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SDK() {
  const [releases, setReleases] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchJSON(`${API_BASE}/sdk/releases`);
        setReleases(list);
      } catch {
        setErr("Release listing not available yet (GET /sdk/releases). Showing fallback.");
        setReleases([]);
      }
    })();
  }, []);

  const fallbackUrl = `${API_BASE}/sdk/forgeiq-sdk-latest.tgz`;

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 className="h1">📦 ForgeIQ SDK</h1>
        <button className="btn" onClick={()=>window.open("https://forgeiq-production.up.railway.app/docs","_blank")}>API Docs</button>
      </div>
      {err && <div className="card" style={{ borderColor:"var(--yellow)" }}>{err}</div>}
      {releases.length > 0 ? (
        <div className="grid grid-3">
          {releases.map((r) => (
            <div key={`${r.name}-${r.version}`} className="card">
              <div className="row"><strong>{r.name}</strong><span className="pill">v{r.version}</span></div>
              <div className="caption" style={{ marginTop:6 }}>Published: {fmtDate(r.created_at)}</div>
              {r.notes && <div style={{ marginTop:8, whiteSpace:"pre-wrap" }}>{r.notes}</div>}
              <div style={{ marginTop:12 }}><a className="btn" href={r.url} target="_blank" rel="noreferrer">Download</a></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="sectionTitle">Latest SDK (fallback)</div>
          <div className="caption">When `/sdk/releases` is implemented, releases will appear here.</div>
          <div style={{ marginTop:10 }}><a className="btn" href={fallbackUrl}>Download forgeiq-sdk-latest.tgz</a></div>
        </div>
      )}
    </>
  );
}

function Pricing() {
  // Replace with your real Stripe price IDs
  const PRICES = [
    { id: "price_basic_xxx", name: "Starter", amount: "$29/mo", bullets: ["Up to 3 projects", "Shared builders", "Community support"] },
    { id: "price_pro_xxx",   name: "Pro", amount: "$99/mo", bullets: ["Unlimited projects", "Priority builders", "Email support"] },
    { id: "price_enterprise_xxx", name: "Enterprise", amount: "Custom", bullets: ["SLA & SSO", "Dedicated infra", "Solutions engineer"] },
  ];
  const checkout = async (priceId) => {
    try {
      const res = await postJSON(`${API_BASE}/api/create-checkout-session`, { priceId });
      const url = `https://checkout.stripe.com/c/pay/${res.id}`;
      window.open(url, "_blank");
    } catch (e) {
      alert(`Checkout failed: ${e?.message || e}`);
    }
  };
  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <h1 className="h1">💳 Pricing</h1>
        <div className="caption">Simple, transparent plans that scale with your builds.</div>
      </div>
      <div className="pricing">
        {PRICES.map((p) => (
          <div className="plan" key={p.id}>
            <h3>{p.name}</h3>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{p.amount}</div>
            <ul>{p.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul>
            {p.amount !== "Custom" ? (
              <div style={{ marginTop: 12 }}><button className="btn" onClick={()=>checkout(p.id)}>Choose {p.name}</button></div>
            ) : (
              <div style={{ marginTop: 12 }}><a className="btn" href="mailto:sales@forgeiq.ai">Contact Sales</a></div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** ============
 *  Main App
 *  ============ */
export default function App() {
  const [cfg, setCfg] = useState(null);
  const [tab, setTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "cora", label: "Cora Studio" },
    { id: "uploads", label: "Uploads" },
    { id: "sdk", label: "SDK" },
    { id: "pricing", label: "Pricing" },
  ];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getConfig();
        if (!alive) return;
        setCfg(c);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to load /config", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="row" style={{ marginBottom: 6 }}>
          <h1 className="h1">ForgeIQ Build System</h1>
          <div className="nav">
            {tabs.map(t => (
              <button key={t.id} className={`tab ${tab===t.id ? "active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
        <p className="p">Agentic builds, realtime orchestration, and a generative copilot for your engineering workflow.</p>

        {tab === "overview" && <Overview cfg={cfg} />}
        {tab === "cora" && <CoraStudio cfg={cfg} />}
        {tab === "uploads" && <Uploads />}
        {tab === "sdk" && <SDK />}
        {tab === "pricing" && <Pricing />}
      </div>

      {/* Floating Cora everywhere */}
      <CoraDock cfg={cfg} />
    </>
  );
}
