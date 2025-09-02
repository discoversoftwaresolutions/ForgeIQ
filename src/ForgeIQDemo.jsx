import React, { useState, useEffect, useRef } from 'react';

// === Minimal CSS for a clean look ===
const styles = `
  body {
    font-family: 'Inter', system-ui, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f6f7fb;
    color: #111827;
  }
  .page-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .header {
    margin-bottom: 30px;
  }
  .header h1 {
    font-size: 2.8rem;
    margin: 0;
    font-weight: 800;
    color: #1d4ed8;
  }
  .header p {
    color: #6b7280;
    font-size: 1.1rem;
    max-width: 600px;
    margin: 10px auto 0;
  }
  .demo-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 25px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    width: 100%;
    max-width: 800px;
  }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    resize: vertical;
  }
  .btn-container {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .btn-primary {
    background-color: #1d4ed8;
    color: white;
  }
  .btn-primary:hover {
    background-color: #1e40af;
  }
  .btn-secondary {
    background-color: #eef2ff;
    color: #3730a3;
  }
  .btn-secondary:hover {
    background-color: #dbeafe;
  }
  .status-box {
    margin-top: 20px;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    text-align: left;
    white-space: pre-wrap;
    word-wrap: break-word;
    min-height: 150px;
    max-height: 300px;
    overflow-y: auto;
  }
  .status-box h4 {
    margin: 0 0 10px 0;
    color: #1d4ed8;
  }
  .status-line {
    font-family: monospace;
    font-size: 14px;
    line-height: 1.4;
  }
  .status-progress {
    height: 8px;
    background-color: #e5e7eb;
    border-radius: 4px;
    margin-top: 10px;
  }
  .status-progress-bar {
    height: 100%;
    background-color: #10b981;
    border-radius: 4px;
    transition: width 0.3s ease-in-out;
  }
  .call-to-action {
    margin-top: 50px;
    padding: 30px;
    background-color: #f0f4ff;
    border-radius: 12px;
    text-align: center;
  }
  .call-to-action h2 {
    font-size: 2rem;
    color: #1d4ed8;
    margin: 0;
  }
  .cta-buttons {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    gap: 20px;
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin-top: 30px;
  }
  .pricing-card {
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 25px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pricing-card.recommended {
    border-color: #1d4ed8;
    box-shadow: 0 0 0 2px #dbeafe inset;
  }
  .plan-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .price {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
  }
  .price .small {
    font-size: 1rem;
    font-weight: 400;
    color: #6b7280;
  }
  .features {
    list-style: none;
    padding: 0;
    text-align: left;
    margin-top: 25px;
  }
  .features li {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    color: #374151;
  }
  .features li::before {
    content: "✓";
    color: #10b981;
    font-weight: 700;
  }
  @media (max-width: 768px) {
    .pricing-grid {
      grid-template-columns: 1fr;
    }
  }
`;

// === API and WebSocket Endpoints ===
// REMINDER: Update these to your actual production domains
const FORGEIQ_API_ENDPOINT = "https://your-forgeiq-backend.com/demo/pipeline";
const FORGEIQ_WS_ENDPOINT = "wss://your-forgeiq-backend.com/ws/tasks/updates";
const SDK_GITHUB_URL = "https://github.com/your-org/forgeiq-sdk"; // Replace with your repo
const OPTISYS_URL = "https://optisys-agent-production.up.railway.app"; // Your Optisys URL
const FREE_DEMO_LIMIT = 5;

const ForgeIQDemo = () => {
  const [prompt, setPrompt] = useState("Generate a CI/CD pipeline for a Python web service that runs tests, builds a Docker image, and deploys to a Kubernetes cluster.");
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState("idle");
  const [taskProgress, setTaskProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [demoRuns, setDemoRuns] = useState(0);
  const wsRef = useRef(null);

  const pricingTiers = [
    {
      id: "free-demo",
      title: "Free Demo",
      description: "Test the power of ForgeIQ with limited runs.",
      features: ["Up to 5 live demo runs", "Basic pipeline generation", "Real-time logs", "No API key required"],
    },
    {
      id: "pro",
      title: "Professional",
      price: "$999",
      period: "per month",
      recommended: true,
      features: ["All Demo Features", "100,000 runs/month", "Full API Access", "Email Support", "Managed Deployments"],
    },
    {
      id: "enterprise",
      title: "Enterprise",
      price: "Custom",
      period: "quote",
      features: ["All Pro Features", "Unlimited Runs", "Multi-cloud Optimization", "Dedicated Agent Support", "Premium SLA"],
    }
  ];

  const handleStartDemo = async () => {
    if (demoRuns >= FREE_DEMO_LIMIT) {
      setError(`Free demo limit of ${FREE_DEMO_LIMIT} runs reached. Please select a plan below to continue.`);
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt to start the demo.");
      return;
    }

    setDemoRuns(prev => prev + 1);
    // 1. Reset state for a new task
    setTaskId(null);
    setTaskStatus("pending");
    setTaskProgress(0);
    setLogs([]);
    setError(null);

    // 2. Make the API call to trigger the task
    try {
      const response = await fetch(FORGEIQ_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to start demo.");
      }

      setTaskId(data.forgeiq_task_id);

    } catch (err) {
      setError(err.message);
      setTaskStatus("failed");
    }
  };

  // 3. Effect to handle WebSocket connection when taskId is set
  useEffect(() => {
    if (!taskId) return;

    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(FORGEIQ_WS_ENDPOINT);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.task_id === taskId) {
        setTaskStatus(message.status);
        setTaskProgress(message.progress);
        setLogs(prev => [...prev, message.logs || message.current_stage || ""]);

        if (message.status === 'completed' || message.status === 'failed') {
          ws.close();
        }
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected.");
      setTaskStatus("finished");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setError("Failed to connect for real-time updates.");
      setTaskStatus("failed");
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [taskId]);


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

        <section className="demo-card">
          <div className="input-group">
            <textarea
              placeholder="Enter a prompt to start the demo..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={taskStatus === 'pending' || demoRuns >= FREE_DEMO_LIMIT}
            />
            <div className="btn-container">
              <button 
                className="btn btn-primary" 
                onClick={handleStartDemo} 
                disabled={taskStatus === 'pending' || !prompt.trim() || demoRuns >= FREE_DEMO_LIMIT}
              >
                {taskStatus === 'pending' ? 'Starting...' : 'Run Demo'}
              </button>
            </div>
          </div>
          
          <div className="status-box">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h4>Live Status:</h4>
                <div style={{color: '#6b7280', fontSize: '0.9rem'}}>
                    Demo runs used: {demoRuns} / {FREE_DEMO_LIMIT}
                </div>
            </div>
            <div className="status-progress">
              <div 
                className="status-progress-bar" 
                style={{ width: `${taskProgress}%` }}
              ></div>
            </div>
            <div className="status-line" style={{ marginTop: '10px' }}>
              <strong>Status:</strong> {taskStatus}
            </div>
            {logs.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Logs:</strong>
                {logs.map((log, index) => (
                  <div key={index} className="status-line">{log}</div>
                ))}
              </div>
            )}
            {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
          </div>
        </section>

        <section className="call-to-action">
          <h2>Ready to Supercharge Your Builds?</h2>
          <p>ForgeIQ is an API-first platform. Integrate it directly into your projects.</p>
        </section>

        <div className="pricing-grid">
          {pricingTiers.map((tier) => (
            <div key={tier.id} className={`pricing-card ${tier.recommended ? 'recommended' : ''}`}>
              <h3 className="plan-title">{tier.title}</h3>
              {tier.id !== 'free-demo' && (
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
              {tier.id === 'free-demo' ? (
                <a href="#demo" className="btn btn-secondary">Try Demo</a>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', width: '100%'}}>
                  <a href={SDK_GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{textDecoration: 'none'}}>
                    Download SDK
                  </a>
                  <a href={OPTISYS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{textDecoration: 'none'}}>
                    Get API Key on Optisys
                  </a>
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
