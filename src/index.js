// src/index.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Pusher from "pusher-js";
import App from "./App";

// Optional global styles
// import "./index.css";

/* ============================
   Runtime constants
============================ */
const API_BASE = "https://forgeiq-production.up.railway.app";

/* ============================
   Error Boundary
============================ */
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("RootErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#0b1117",
          color: "#e6edf3",
          padding: 24,
          fontFamily: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
        }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Something went wrong</h1>
          <p style={{ opacity: 0.8 }}>
            The UI encountered an unexpected error. Try refreshing the page.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #1b2735",
              background: "#0f1520",
              overflowX: "auto"
            }}
          >
            {String(this.state.error?.stack || this.state.error || "Unknown error")}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================
   Global error/rejection logs
============================ */
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    // eslint-disable-next-line no-console
    console.error("Global error:", e.error || e.message || e);
  });
  window.addEventListener("unhandledrejection", (e) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled promise rejection:", e.reason || e);
  });
}

/* ============================
   Performance mark (optional)
============================ */
if (typeof performance !== "undefined" && performance.mark) {
  performance.mark("forgeiq-app-start");
}

/* ============================
   Cora — Generative AI Assistant
   - Uses /config for realtime + LLM defaults
   - Sends prompts to POST /gateway
   - Subscribes to private-forgeiq via Soketi (Pusher)
============================ */
const coraStyles = `
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
`;

async function fetchConfig() {
  const r = await fetch(`${API_BASE}/config`);
  if (!r.ok) throw new Error("Failed to load /config");
  return r.json();
}

function usePusher(cfg) {
  const [connected, setConnected] = useState(false);
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!cfg?.realtime?.publicKey) return;

    // cleanup any prior
    try { channelRef.current?.unbind_all?.(); } catch {}
    try { pusherRef.current?.disconnect?.(); } catch {}
    pusherRef.current = null; channelRef.current = null;

    const p = new Pusher(cfg.realtime.publicKey, {
      cluster: cfg.realtime.cluster || "mt1",
      wsHost: cfg.realtime.wsHost,
      wsPort: cfg.realtime.wsPort,
      forceTLS: cfg.realtime.forceTLS,
      enabledTransports: ["ws", "wss"],
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

function CoraDock() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [providersCsv, setProvidersCsv] = useState("openai,gemini");
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);

  // Load runtime config once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await fetchConfig();
        if (!alive) return;
        setCfg(c);
        if (c?.llm?.provider_priority) setProvidersCsv(c.llm.provider_priority);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Cora: /config failed", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Pusher wire-up
  const { connected, events } = usePusher(cfg);

  // Keyboard shortcut to toggle: Alt/Option + C
  useEffect(() => {
    const onKey = (e) => {
      if ((e.altKey || e.metaKey) && (e.key?.toLowerCase?.() === "c")) {
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // When an LLM task completes, attach its response to the conversation if it matches our last task
  useEffect(() => {
    if (!events.length || !lastTaskId) return;
    const ev = events[0];
    if (
      (ev.task_type === "llm_chat_response") &&
      String(ev.task_id) === String(lastTaskId) &&
      String(ev.status || "").toLowerCase() === "completed" &&
      ev.output_data?.llm_response
    ) {
      setLog((prev) => {
        const idx = prev.findIndex((m) => m.role === "assistant" && m.content === "…listening for realtime response");
        const next = [...prev];
        const msg = { role: "assistant", content: ev.output_data.llm_response, at: Date.now() };
        if (idx >= 0) next[idx] = msg;
        else next.push(msg);
        return next;
      });
      setLastTaskId(null);
    }
  }, [events, lastTaskId]);

  const providers = useMemo(
    () => providersCsv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    [providersCsv]
  );

  const sendPrompt = async () => {
    if (!prompt.trim() || busy) return;
    const userMsg = { role: "user", content: prompt.trim(), at: Date.now() };
    setLog((prev) => [...prev, userMsg]);
    setPrompt("");
    setBusy(true);
    try {
      const body = {
        prompt: userMsg.content,
        history: log.map((m) => ({ role: m.role, content: m.content })),
        context_data: { config_options: { providers } },
      };
      const res = await fetch(`${API_BASE}/gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Gateway request failed (${res.status})`);
      const json = await res.json(); // includes task_id
      setLastTaskId(json?.task_id || null);
      setLog((prev) => [...prev, { role: "assistant", content: "…listening for realtime response", at: Date.now() }]);
    } catch (e) {
      setLog((prev) => [...prev, { role: "assistant", content: `Error: ${e?.message || e}`, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cora-root" aria-live="polite">
      <style>{coraStyles}</style>

      {/* Dock Toggle */}
      <button className="cora-toggle" title="Open Cora (Alt+C)" onClick={() => setOpen((o) => !o)}>
        C
      </button>

      {/* Panel */}
      {open && (
        <div className="cora-panel" role="dialog" aria-label="Cora Assistant">
          <div className="cora-hdr">
            <div className="cora-row">
              <div className="cora-title">Cora — Generative Assistant</div>
              <span className="cora-pill">{connected ? "Live" : "Offline"}</span>
            </div>
            <div className="cora-row">
              <span className="cora-pill">Priority: {providersCsv}</span>
              <button className="cora-btn" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>

          <div className="cora-feed" id="cora-feed">
            {log.map((m, i) => (
              <div key={i} className="cora-item">
                <div className="cora-row" style={{ justifyContent: "space-between" }}>
                  <span className="cora-role">{m.role === "user" ? "You" : "Cora"}</span>
                  <span className="cora-time">{new Date(m.at).toLocaleTimeString()}</span>
                </div>
                <div className="cora-body">{m.content}</div>
              </div>
            ))}
            {log.length === 0 && (
              <div className="cora-item">
                <div className="cora-body" style={{ opacity: .8 }}>
                  Hi, I’m Cora. Ask me about your pipelines, builds, deployments, or let me draft code and plans.
                </div>
              </div>
            )}
          </div>

          <div className="cora-input">
            <textarea
              className="cora-textarea"
              placeholder="Ask Cora… (Alt+C to toggle)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendPrompt();
              }}
            />
            <div className="cora-row-right">
              <button className="cora-btn" disabled={busy || !prompt.trim()} onClick={sendPrompt}>
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================
   Root bootstrap
============================ */
let container = document.getElementById("root");
if (!container) {
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
}
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
      {/* Cora is globally available */}
      <CoraDock />
    </RootErrorBoundary>
  </React.StrictMode>
);

/* ============================
   HMR (Vite/webpack)
============================ */
try {
  // Vite-style
  if (import.meta && import.meta.hot) {
    import.meta.hot.accept();
  // Webpack-style
  } else if (module && module.hot) {
    module.hot.accept();
  }
} catch {
  // no-op
}
