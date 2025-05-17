# 🧠 ForgeIQ Frontend

The **ForgeIQ UI** is the visual command center for the agentic build system. It allows users to view agent status, trigger builds, inspect DAG execution plans, and monitor real-time test diagnostics — all through a clean, accessible interface.

---

## 🔍 Overview

The frontend communicates directly with the ForgeIQ backend and leverages a modular UI structure to support:

- 🔄 DAG pipeline planning
- 🧪 TestAgent and DebugIQ integration
- 📦 Build + cache insight panels
- 📈 Telemetry and task timeline viewer (planned)
- ⚙️ AutoSoft tier integrations (for licensed agents)

---

## 🧩 Tech Stack

- **Language:** Python
- **Framework:** [Streamlit](https://streamlit.io/)
- **UI Layout:** Multi-pane DAG + task panels
- **Backend API:** `http://localhost:8000` (FastAPI)

---

## 🚀 Getting Started

```bash
pip install -r requirements.txt
streamlit run app.py
