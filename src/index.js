// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// --- Optional: global styles entry if you have one ---
// import "./index.css";

// ---- Error Boundary ----
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // Log to your backend here if desired
    // Example: fetch("/log", { method: "POST", body: JSON.stringify({ error, info }) })
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

// ---- Global unhandled error/rejection logging (optional but handy in prod) ----
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

// ---- Performance mark (optional) ----
if (performance && performance.mark) {
  performance.mark("forgeiq-app-start");
}

const container = document.getElementById("root");
if (!container) {
  const el = document.createElement("div");
  el.id = "root";
  document.body.appendChild(el);
}

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

// ---- HMR (Vite/webpack) ----
if (import.meta && import.meta.hot) {
  import.meta.hot.accept();
} else if (module && module.hot) {
  module.hot.accept();
}
