import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import Pusher from "pusher-js";

/* ========== Styles (modern, responsive) ========== */
const styles = `
  :root {
    --bg: #0f172a; --panel: rgba(15,23,42,0.55); --border: rgba(255,255,255,0.08);
    --text: #e5e7eb; --muted: #94a3b8; --brand: #60a5fa; --brand-strong:#3b82f6;
    --accent:#22d3ee; --success:#10b981; --warning:#f59e0b; --danger:#ef4444;
  }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    color: var(--text);
    background:
      radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,0.25), transparent 60%),
      radial-gradient(1000px 600px at 90% 10%, rgba(34,211,238,0.2), transparent 60%),
      linear-gradient(180deg, #0b1020 0%, #0f172a 40%, #0f172a 100%);
  }
  .page { max-width: 1080px; margin: 0 auto; padding: 48px 20px 64px; }
  .hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 28px; align-items: center; margin-bottom: 28px; }
  @media (max-width: 960px) { .hero { grid-template-columns: 1fr; } }

  .card {
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    border: 1px solid var(--border); border-radius: 16px; backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(2, 8, 23, 0.45);
  }
  .hero-card { padding: 28px; position: relative; overflow: hidden; }
  .hero-card::after { content:""; position:absolute; inset:0; background: radial-gradient(650px 300px at 120% -20%, rgba(96,165,250,0.25), transparent 60%); pointer-events:none; }

  .title { font-size: 32px; font-weight: 800; line-height: 1.1; margin: 0 0 10px; letter-spacing: -0.02em;
    background: linear-gradient(90deg, var(--text), #fff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .subtitle { color: var(--muted); font-size: 15px; margin: 0; max-width: 60ch; }

  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
  @media (max-width: 640px) { .kpis { grid-template-columns: 1fr; } }
  .kpi { border: 1px dashed var(--border); border-radius: 12px; padding: 12px 16px; display: grid; gap: 4px; background: rgba(255,255,255,0.03); }
  .kpi .label { color: var(--muted); font-size: 12px; letter-spacing: .02em; }
  .kpi .value { font-weight: 700; font-size: 18px; }

  .demo { display: grid; gap: 16px; margin-top: 10px; }
  .textarea { width: 100%; min-height: 120px; padding: 14px; background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: 12px; color: var(--text); font-size: 15px; outline: none; }
  .controls { display: flex; gap: 10px; justify-content: flex-end; }
  .btn { appearance: none; border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; font-weight: 700;
    cursor: pointer; background: rgba(255,255,255,0.04); color: var(--text);
    transition: transform .06s ease, border-color .15s ease, background .15s ease; }
  .btn:hover { transform: translateY(-1px); border-color: rgba(96,165,250,0.35); }
  .btn-primary { background: linear-gradient(180deg, var(--brand), var(--brand-strong)); border-color: transparent; color: white; }
  .btn-secondary { color: var(--brand); border-color: rgba(96,165,250,0.35); }

  .status { padding: 16px; border-top: 1px dashed var(--border); display: grid; gap: 10px; background: rgba(255,255,255,0.03); border-radius: 12px; }
  .status-row { display: flex; justify-content: space-between; align-items: center; }
  .badge { font-size: 12px; padding: 6px 10px; border-radius: 999px; background: rgba(34,197,94,0.1); color: #34d399; border: 1px solid rgba(34,197,94,0.2); }
  .badge.pending { background: rgba(245,158,11,0.12); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
  .badge.failed  { background: rgba(239,68,68,0.12); color: #ef4444; border-color: rgba(239,68,68,0.3); }
  .badge.finished{ background: rgba(59,130,246,0.13); color: #60a5fa; border-color: rgba(59,130,246,0.35); }

  .progress { height: 10px; background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 999px; overflow: hidden; }
  .progress > div { height: 100%; width: 0%; background: linear-gradient(90deg, var(--success), var(--accent)); transition: width .35s ease; }
  .log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; color: #d1d5db;
    max-height: 220px; overflow-y: auto; padding-right: 6px; }
  .log-line { padding: 2px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); }

  .plans { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  @media (max-width: 960px) { .plans { grid-template-columns: 1fr; } }
  .plan { padding: 22px; display: grid; gap: 12px; text-align: left; }
  .plan.recommended { outline: 2px solid rgba(96,165,250,0.45); }
  .plan h3 { margin: 0; font-size: 18px; letter-spacing: .01em; }
  .price { font-size: 28px; font-weight: 800; }
  .features { margin: 6px 0 0; padding: 0 0 0 18px; color: var(--muted); }
`;

/* ========== Config / Endpoints (CRA env) ========== */
// REST (you can move these to envs later if you want)
const FORGEIQ_API_ENDPOINT = "https://forgeiq-backend-production.up.railway.app/demo/pipeline";
const STRIPE_CHECKOUT_ENDPOINT = "https://forgeiq-backend-production.up.railway.app/api/create-checkout-session";

// Realtime (Pusher/Soketi) — CRA exposes REACT_APP_* envs
const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY;
const PUSHER_HOST = process.env.REACT_APP_PUSHER_HOST; // e.g., soketi-...up.railway.app
const PUSHER_PORT = Number(process.env.REACT_APP_PUSHER_PORT || 443);
const PUSHER_FORCE_TLS = String(process.env.REACT_APP_PUSHER_FORCE_TLS || "true") === "true";

// Stripe (public key for browser)
const STRIPE_PUBLIC_KEY = process.env.REACT_APP_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : Promise.resolve(null);

const FREE_DEMO_LIMIT = 5;

/** @typedef {{task_id: string, status?: string, progress?: number, current_stage?: string, logs?: string}} TaskUpdate */

const ForgeIQDemo = () => {
  const [prompt, setPrompt] = useState(
    "Generate a CI/CD pipeline for a Python web service that runs tests, builds a Docker image, and deploys to a Kubernetes cluster."
  );
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState("idle"); // idle | pending | finished | failed | running | completed
  const [taskProgress, setTaskProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [demoRuns, setDemoRuns] = useState(0);

  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  const plans = [
    { id: "free-demo", name: "Free Demo", desc: "Explore ForgeIQ with limited runs.",
      features: ["Up to 5 live demo runs", "Basic pipeline generation", "Realtime status", "No API key required"] },
    { id: "pro", name: "Professional", price: "$999", period: "month", recommended: true,
      features: ["All Demo features", "100,000 runs/month", "Full API Access", "Email Support", "Managed Deployments"],
      priceId: "price_1..." }, // Replace with your Stripe price ID
    { id: "enterprise", name: "Enterprise", price: "Custom", period: "quote",
      features: ["All Pro features", "Unlimited runs", "Multi-cloud Optimization", "Dedicated Agent Support", "Premium SLA"],
      priceId: null }
  ];

  // Init Pusher once
  useEffect(() => {
    if (!PUSHER_KEY || !PUSHER_HOST) {
      console.warn("Pusher env missing; realtime disabled.", { PUSHER_KEY, PUSHER_HOST });
      return;
    }
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(PUSHER_KEY, {
        wsHost: PUSHER_HOST,
        wsPort: PUSHER_PORT,
        wssPort: PUSHER_PORT,
        forceTLS: PUSHER_FORCE_TLS,
        enabledTransports: ["ws", "wss"],
        disableStats: true
      });
    }
  }, []);

  // Subscribe when taskId exists
  useEffect(() => {
    if (!taskId || !pusherRef.current) return;

    // Unsubscribe previous
    if (channelRef.current) {
      try { pusherRef.current.unsubscribe(channelRef.current.name); } catch {}
      channelRef.current = null;
    }

    const channelName = `public-forgeiq.${taskId}`;
    const ch = pusherRef.current.subscribe(channelName);
    channelRef.current = ch;

    const onUpdate = (/** @type {TaskUpdate} */ msg) => {
      if (!msg || msg.task_id !== taskId) return;
      if (typeof msg.progress === "number") setTaskProgress(msg.progress);
      if (msg.status) setTaskStatus(msg.status);
      const line = msg.logs || msg.current_stage;
      if (line) setLogs((prev) => [...prev, line]);

      if (msg.status === "completed" || msg.status === "failed") {
        try { pusherRef.current?.unsubscribe(channelName); } catch {}
        channelRef.current = null;
        setTaskStatus(msg.status === "completed" ? "finished" : "failed");
      }
    };

    ch.bind("task-update", onUpdate);

    return () => {
      try {
        ch.unbind("task-update", onUpdate);
        pusherRef.current?.unsubscribe(channelName);
      } catch {}
      channelRef.current = null;
    };
  }, [taskId]);

  const startDemo = async () => {
    if (demoRuns >= FREE_DEMO_LIMIT) {
      setError(`Free demo limit of ${FREE_DEMO_LIMIT} runs reached. Please select a plan below to continue.`);
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt to start the demo.");
      return;
    }
    setDemoRuns((n) => n + 1);
    setTaskId(null);
    setTaskStatus("pending");
    setTaskProgress(0);
    setLogs([]);
    setError(null);

    try {
      const res = await fetch(FORGEIQ_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to start demo.");
      if (!data.forgeiq_task_id) throw new Error("Backend did not return forgeiq_task_id.");
      setTaskId(data.forgeiq_task_id);
    } catch (e) {
      setError(e.message || "Failed to start demo.");
      setTaskStatus("failed");
    }
  };

  const checkout = async (priceId, planId) => {
    try {
      if (!priceId) { window.location.href = "/contact?plan=enterprise"; return; }
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe not configured. Missing REACT_APP_STRIPE_PUBLIC_KEY.");

      const res = await fetch(STRIPE_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planId })
      });
      const session = await res.json().catch(() => ({}));
      if (!res.ok || !session?.id) throw new Error(session?.detail || "Unable to create checkout session.");

      const result = await stripe.redirectToCheckout({ sessionId: session.id });
      if (result.error) throw new Error(result.error.message);
    } catch (e) {
      console.error(e);
      setError(e.message || "Payment error.");
    }
  };

  const badgeClass =
    taskStatus === "pending" ? "badge pending" :
    taskStatus === "failed"  ? "badge failed"  :
    taskStatus === "finished"? "badge finished": "badge";

  return (
    <div className="forgeiq-demo">
      <style>{styles}</style>
      <div className="page">
        {/* HERO */}
        <div className="hero">
          <div className="card hero-card">
            <h1 className="title">ForgeIQ — Agentic Orchestration for Engineering Pipelines</h1>
            <p className="subtitle">
              Describe what you want built. ForgeIQ generates, tests, packages, and deploys code — while you watch progress in real time.
            </p>
            <div className="kpis">
              <div className="kpi"><span className="label">Runtime</span><span className="value">seconds to live preview</span></div>
              <div className="kpi"><span className="label">Coverage</span><span className="value">tests & builds</span></div>
              <div className="kpi"><span className="label">Targets</span><span className="value">Docker · K8s · ECS</span></div>
            </div>
          </div>

          {/* DEMO PANEL */}
          <div className="card hero-card" id="demo">
            <div className="demo">
              <textarea
                className="textarea"
                placeholder="Enter a prompt to start the demo..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={taskStatus === "pending" || demoRuns >= FREE_DEMO_LIMIT}
              />
              <div className="controls">
                <button className="btn btn-secondary" onClick={() => { setPrompt(""); setLogs([]); setError(null); }} disabled={taskStatus === "pending"}>
                  Reset
                </button>
                <button className="btn btn-primary" onClick={startDemo} disabled={taskStatus === "pending" || !prompt.trim() || demoRuns >= FREE_DEMO_LIMIT}>
                  {taskStatus === "pending" ? "Starting…" : "Run Demo"}
                </button>
              </div>

              <div className="status">
                <div className="status-row">
                  <div className="muted">Live Status</div>
                  <div className={badgeClass}>{taskStatus === "idle" ? "ready" : taskStatus}</div>
                </div>
                <div className="progress"><div style={{ width: `${taskProgress}%` }} /></div>
                <div className="muted">Demo runs used: {demoRuns} / {FREE_DEMO_LIMIT}</div>
                {error && <div style={{ color: "#fca5a5", fontWeight: 600 }}>{error}</div>}
                {logs.length > 0 && (
                  <div className="log">
                    {logs.map((l, i) => (<div className="log-line" key={i}>{l}</div>))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PLANS */}
        <div className="plans">
          {plans.map((p) => (
            <div key={p.id} className={`card plan ${p.recommended ? "recommended" : ""}`}>
              <h3>{p.name}</h3>
              {"price" in p && (<div className="price">{p.price} <span className="muted">/ {p.period}</span></div>)}
              <ul className="features">{p.features.map((f, idx) => <li key={idx}>{f}</li>)}</ul>
              {p.id === "free-demo" ? (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <a className="btn" href="#top">What can it build?</a>
                  <a className="btn btn-primary" href="#demo" onClick={(e) => { e.preventDefault(); document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" }); }}>Try Demo</a>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button className="btn" onClick={() => checkout(p.priceId, p.id)}>Subscribe</button>
                  <a className="btn btn-secondary" href="/docs">View Docs</a>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ForgeIQDemo;
