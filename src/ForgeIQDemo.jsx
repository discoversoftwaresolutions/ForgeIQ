import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import Pusher from "pusher-js";

/* ============================
   Minimal CSS (unchanged)
============================ */
const styles = `
  body { font-family: 'Inter', system-ui, sans-serif; margin:0; padding:0; background:#f6f7fb; color:#111827; }
  .page-container { max-width:900px; margin:0 auto; padding:40px 20px; display:flex; flex-direction:column; align-items:center; text-align:center; }
  .header { margin-bottom:30px; }
  .header h1 { font-size:2.8rem; margin:0; font-weight:800; color:#1d4ed8; }
  .header p { color:#6b7280; font-size:1.1rem; max-width:600px; margin:10px auto 0; }
  .demo-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:25px; box-shadow:0 4px 6px rgba(0,0,0,0.05); width:100%; max-width:800px; }
  .input-group { display:flex; flex-direction:column; gap:15px; }
  textarea { width:100%; min-height:120px; padding:12px; border:1px solid #d1d5db; border-radius:8px; font-size:16px; resize:vertical; }
  .btn-container { display:flex; gap:10px; justify-content:flex-end; }
  .btn { padding:12px 24px; border:none; border-radius:8px; font-weight:600; cursor:pointer; transition:background-color .2s; }
  .btn-primary { background:#1d4ed8; color:#fff; }
  .btn-primary:hover { background:#1e40af; }
  .btn-secondary { background:#eef2ff; color:#3730a3; }
  .btn-secondary:hover { background:#dbeafe; }
  .status-box { margin-top:20px; padding:20px; border-radius:8px; border:1px solid #e5e7eb; background:#f9fafb; text-align:left; white-space:pre-wrap; word-wrap:break-word; min-height:150px; max-height:300px; overflow-y:auto; }
  .status-box h4 { margin:0 0 10px 0; color:#1d4ed8; }
  .status-line { font-family:monospace; font-size:14px; line-height:1.4; }
  .status-progress { height:8px; background:#e5e7eb; border-radius:4px; margin-top:10px; }
  .status-progress-bar { height:100%; background:#10b981; border-radius:4px; transition:width .3s ease-in-out; }
  .call-to-action { margin-top:50px; padding:30px; background:#f0f4ff; border-radius:12px; text-align:center; }
  .call-to-action h2 { font-size:2rem; color:#1d4ed8; margin:0; }
  .pricing-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:25px; margin-top:30px; }
  .pricing-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:25px; text-align:center; display:flex; flex-direction:column; align-items:center; }
  .pricing-card.recommended { border-color:#1d4ed8; box-shadow:0 0 0 2px #dbeafe inset; }
  .plan-title { font-size:1.5rem; font-weight:700; margin-bottom:10px; }
  .price { font-size:2.5rem; font-weight:800; line-height:1; }
  .price .small { font-size:1rem; font-weight:400; color:#6b7280; margin-left:.4rem; }
  .features { list-style:none; padding:0; text-align:left; margin-top:25px; }
  .features li { display:flex; align-items:center; gap:10px; margin-bottom:10px; color:#374151; }
  .features li::before { content:"✓"; color:#10b981; font-weight:700; }
  @media (max-width:768px){ .pricing-grid { grid-template-columns:1fr; } }
`;

/* ============================
   Config / Endpoints
   - REST stays on backend host
   - Realtime via Soketi (Pusher)
============================ */
// REST
export const FORGEIQ_API_ENDPOINT =
  "https://forgeiq-backend-production.up.railway.app/demo/pipeline";
export const STRIPE_CHECKOUT_ENDPOINT =
  "https://forgeiq-backend-production.up.railway.app/api/create-checkout-session";

// Realtime (Pusher/Soketi)
const VITE_PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY as string;
const VITE_PUSHER_HOST = import.meta.env.VITE_PUSHER_HOST as string; // e.g., soketi-forgeiq-production.up.railway.app
const VITE_PUSHER_PORT = Number(import.meta.env.VITE_PUSHER_PORT || 443);
const VITE_PUSHER_FORCE_TLS =
  String(import.meta.env.VITE_PUSHER_FORCE_TLS || "true") === "true";

// Stripe
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string; // DO NOT hardcode
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

// Limits
const FREE_DEMO_LIMIT = 5;

// Type for incoming task updates (align with your backend payload)
type TaskUpdate = {
  task_id: string;
  status?: string;
  progress?: number;
  current_stage?: string;
  logs?: string;
  details?: Record<string, any>;
  timestamp?: string;
};

const ForgeIQDemo: React.FC = () => {
  const [prompt, setPrompt] = useState(
    "Generate a CI/CD pipeline for a Python web service that runs tests, builds a Docker image, and deploys to a Kubernetes cluster."
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<"idle" | "pending" | "finished" | "failed" | string>("idle");
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [demoRuns, setDemoRuns] = useState<number>(0);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Pusher["channels"]["channel"] | null>(null);

  const pricingTiers = [
    {
      id: "free-demo",
      title: "Free Demo",
      description: "Test the power of ForgeIQ with limited runs.",
      features: [
        "Up to 5 live demo runs",
        "Basic pipeline generation",
        "Real-time logs",
        "No API key required",
      ],
    },
    {
      id: "pro",
      title: "Professional",
      price: "$999",
      period: "per month",
      recommended: true,
      features: [
        "All Demo Features",
        "100,000 runs/month",
        "Full API Access",
        "Email Support",
        "Managed Deployments",
      ],
      priceId: "price_1..." // Replace with your Stripe price ID
    },
    {
      id: "enterprise",
      title: "Enterprise",
      price: "Custom",
      period: "quote",
      features: [
        "All Pro Features",
        "Unlimited Runs",
        "Multi-cloud Optimization",
        "Dedicated Agent Support",
        "Premium SLA",
      ],
      priceId: null,
    },
  ];

  // Initialize Pusher lazily
  useEffect(() => {
    if (!VITE_PUSHER_KEY || !VITE_PUSHER_HOST) {
      console.warn("Pusher env vars missing. Realtime disabled.");
      return;
    }
    // Create once
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(VITE_PUSHER_KEY, {
        wsHost: VITE_PUSHER_HOST,
        wsPort: VITE_PUSHER_PORT,
        wssPort: VITE_PUSHER_PORT,
        forceTLS: VITE_PUSHER_FORCE_TLS,
        enabledTransports: ["ws", "wss"],
        disableStats: true,
      });
    }
    return () => {
      // no-op: keep the client for the lifetime of the SPA
    };
  }, []);

  // Subscribe to per-task channel when taskId is set
  useEffect(() => {
    if (!taskId || !pusherRef.current) return;

    // Unsubscribe previous
    if (channelRef.current) {
      try { pusherRef.current.unsubscribe(channelRef.current.name); } catch {}
      channelRef.current = null;
    }

    // Your backend should trigger to `public-forgeiq.{taskId}` with event name "task-update"
    const channelName = `public-forgeiq.${taskId}`;
    const channel = pusherRef.current.subscribe(channelName);
    channelRef.current = channel;

    const onUpdate = (message: TaskUpdate) => {
      if (!message || message.task_id !== taskId) return;
      if (typeof message.progress === "number") setTaskProgress(message.progress);
      if (message.status) setTaskStatus(message.status);
      const line = message.logs || message.current_stage;
      if (line) setLogs((prev) => [...prev, line]);

      if (message.status === "completed" || message.status === "failed") {
        // let the task end gracefully; auto-unsub below
        try { pusherRef.current?.unsubscribe(channelName); } catch {}
        channelRef.current = null;
        setTaskStatus(message.status === "completed" ? "finished" : "failed");
      }
    };

    channel.bind("task-update", onUpdate);

    // Cleanup if component unmounts or taskId changes
    return () => {
      try {
        channel.unbind("task-update", onUpdate);
        pusherRef.current?.unsubscribe(channelName);
      } catch {}
      channelRef.current = null;
    };
  }, [taskId]);

  const handleStartDemo = async () => {
    if (demoRuns >= FREE_DEMO_LIMIT) {
      setError(`Free demo limit of ${FREE_DEMO_LIMIT} runs reached. Please select a plan below to continue.`);
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt to start the demo.");
      return;
    }
    setDemoRuns((prev) => prev + 1);
    setTaskId(null);
    setTaskStatus("pending");
    setTaskProgress(0);
    setLogs([]);
    setError(null);

    try {
      const response = await fetch(FORGEIQ_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        // credentials: "include", // enable if you rely on cookies
      });

      // If the preflight or CORS fail, response may not be OK
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data && (data.detail || data.message)) || "Failed to start demo.");
      }
      if (!data.forgeiq_task_id) {
        throw new Error("Backend did not return forgeiq_task_id.");
      }
      setTaskId(data.forgeiq_task_id);
    } catch (err: any) {
      setError(err?.message || "Failed to start demo.");
      setTaskStatus("failed");
    }
  };

  const handleStripeCheckout = async (priceId: string | null, planId: string) => {
    try {
      if (!STRIPE_PUBLIC_KEY) {
        throw new Error("Stripe is not configured. Missing VITE_STRIPE_PUBLIC_KEY.");
      }
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to initialize.");

      if (!priceId) {
        // Enterprise path: route to sales/contact
        window.location.href = "/contact?plan=enterprise";
        return;
      }

      const resp = await fetch(STRIPE_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planId }),
      });

      const session = await resp.json().catch(() => ({}));
      if (!resp.ok || !session?.id) {
        throw new Error(session?.detail || "Failed to create Stripe checkout session.");
      }

      const result = await stripe.redirectToCheckout({ sessionId: session.id });
      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Payment error.");
    }
  };

  return (
    <div className="forgeiq-demo">
      <style>{styles}</style>
      <div className="page-container">
        <header className="header">
          <h1>ForgeIQ Demo</h1>
          <p>
            An agentic orchestration engine for engineering pipelines. Enter a prompt to see ForgeIQ generate, test, and deploy code in real-time.
          </p>
        </header>

        <section className="demo-card" id="demo">
          <div className="input-group">
            <textarea
              placeholder="Enter a prompt to start the demo..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={taskStatus === "pending" || demoRuns >= FREE_DEMO_LIMIT}
            />
            <div className="btn-container">
              <button
                className="btn btn-primary"
                onClick={handleStartDemo}
                disabled={taskStatus === "pending" || !prompt.trim() || demoRuns >= FREE_DEMO_LIMIT}
              >
                {taskStatus === "pending" ? "Starting..." : "Run Demo"}
              </button>
            </div>
          </div>

          <div className="status-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>Live Status:</h4>
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                Demo runs used: {demoRuns} / {FREE_DEMO_LIMIT}
              </div>
            </div>

            <div className="status-progress">
              <div className="status-progress-bar" style={{ width: `${taskProgress}%` }} />
            </div>

            <div className="status-line" style={{ marginTop: "10px" }}>
              <strong>Status:</strong> {taskStatus}
            </div>

            {logs.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <strong>Logs:</strong>
                {logs.map((log, index) => (
                  <div key={index} className="status-line">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
          </div>
        </section>

        <section className="call-to-action">
          <h2>Ready to Supercharge Your Builds?</h2>
          <p>ForgeIQ is an API-first platform. Integrate it directly into your projects.</p>
        </section>

        <div className="pricing-grid">
          {pricingTiers.map((tier) => (
            <div key={tier.id} className={`pricing-card ${tier.recommended ? "recommended" : ""}`}>
              <h3 className="plan-title">{tier.title}</h3>
              {tier.id !== "free-demo" && (
                <div className="price">
                  {tier.price}
                  <span className="small">{tier.period}</span>
                </div>
              )}
              <ul className="features">
                {tier.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
              {tier.id === "free-demo" ? (
                <a href="#demo" className="btn btn-secondary">
                  Try Demo
                </a>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", width: "100%" }}>
                  <button onClick={() => handleStripeCheckout(tier.priceId, tier.id)} className="btn btn-secondary">
                    Subscribe
                  </button>
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
