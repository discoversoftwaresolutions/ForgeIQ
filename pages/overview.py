# =================================
# 📁 pages/1_Overview.py
# =================================
import streamlit as st
import asyncio # For running async SDK calls
import logging
from typing import Dict, Any, Optional

# Ensure SDK client is available from session state (initialized in dashboard.py)
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please return to the main page.")
    st.stop()

client = st.session_state.forgeiq_sdk_client
logger = logging.getLogger(__name__) # Use module-specific logger

st.set_page_config(page_title="System Overview - ForgeIQ", layout="wide")

st.title("📊 System Overview")
st.markdown("High-level status and key metrics of the ForgeIQ agentic system.")

# --- Data Fetching Functions (Async with Streamlit Caching) ---
@st.cache_data(ttl=30) # Cache for 30 seconds
async def fetch_system_summary_metrics() -> Dict[str, Any]:
    """Placeholder: Fetches summary metrics from ForgeIQ-backend."""
    logger.info("Fetching system summary metrics...")
    try:
        # This endpoint needs to be defined in ForgeIQ-backend
        # It would aggregate data from various agents/sources.
        # response = await client._request("GET", "/api/forgeiq/system/summary")
        # return response 
        await asyncio.sleep(0.5) # Simulate API call
        return {
            "active_projects": 5,
            "agents_online": 10,
            "pipelines_today": 25,
            "successful_deployments_today": 20,
            "recent_alerts": 3,
            "overall_health": "Operational"
        }
    except Exception as e:
        logger.error(f"Error fetching system summary metrics: {e}", exc_info=True)
        st.error(f"Could not load system summary: {e}")
        return {}

@st.cache_data(ttl=60)
async def fetch_recent_activity(limit: int = 5) -> List[Dict[str, Any]]:
    """Placeholder: Fetches recent system activity/events."""
    logger.info(f"Fetching last {limit} activity events...")
    try:
        # This endpoint needs to be defined in ForgeIQ-backend
        # It would query an event store or aggregated logs.
        # response = await client._request("GET", f"/api/forgeiq/activity/recent?limit={limit}")
        # return response.get("activities", [])
        await asyncio.sleep(0.8) # Simulate API call

        # Sample data structure
        sample_activities = [
            {"timestamp": "2025-05-17T10:30:00Z", "type": "DAG_EXECUTION_STARTED", "project": "project_alpha", "summary": "DAG 'ci_pipeline_alpha' started."},
            {"timestamp": "2025-05-17T10:32:00Z", "type": "SECURITY_SCAN_COMPLETED", "project": "project_alpha", "summary": "SAST found 2 medium issues."},
            {"timestamp": "2025-05-17T10:35:00Z", "type": "DEPLOYMENT_SUCCESSFUL", "project": "project_alpha", "service": "backend_service", "env": "staging"},
            {"timestamp": "2025-05-17T10:40:00Z", "type": "NEW_PROMPT_RECEIVED", "summary": "BuildSurfAgent received new pipeline prompt."},
            {"timestamp": "2025-05-17T10:42:00Z", "type": "AGENT_HEARTBEAT_MISSED", "agent": "CacheAgent_1", "summary": "CacheAgent_1 missed heartbeat."},
        ]
        return random.sample(sample_activities, min(limit, len(sample_activities))) if "random" in globals() else sample_activities[:limit]

    except Exception as e:
        logger.error(f"Error fetching recent activity: {e}", exc_info=True)
        st.error(f"Could not load recent activity: {e}")
        return []

# --- Page Layout & Display ---
# Using placeholder data until backend APIs are ready

# Load data
# Streamlit handles calling async functions:
summary_data = asyncio.run(fetch_system_summary_metrics()) # Use asyncio.run for top-level calls if not directly supported by st component
recent_activities = asyncio.run(fetch_recent_activity())

if summary_data:
    st.header("Current System Status")
    cols = st.columns(5)
    cols[0].metric("Active Projects", summary_data.get("active_projects", "N/A"))
    cols[1].metric("Agents Online", summary_data.get("agents_online", "N/A"))
    cols[2].metric("Pipelines Today", summary_data.get("pipelines_today", "N/A"))
    cols[3].metric("Successful Deploys Today", summary_data.get("successful_deployments_today", "N/A"))

    health_status = summary_data.get("overall_health", "Unknown")
    if health_status == "Operational":
        cols[4].success(f"Health: {health_status} ✅")
    elif health_status == "Degraded":
        cols[4].warning(f"Health: {health_status} ⚠️")
    else:
        cols[4].error(f"Health: {health_status} ❌")

st.markdown("---")

if recent_activities:
    st.header("Recent System Activity")
    # For better display, consider st.dataframe or formatting each item
    for activity in recent_activities:
        col1, col2, col3 = st.columns([1,2,3])
        with col1:
            st.caption(datetime.datetime.fromisoformat(activity['timestamp'].replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M:%S %Z') if activity.get('timestamp') else "No timestamp")
        with col2:
            st.info(f"**{activity.get('type', 'Unknown Event')}**")
        with col3:
            st.markdown(f"_{activity.get('summary', 'No summary provided.')}_ " 
                        f"{('Project: **'+activity['project']+'**' if activity.get('project') else '')}")

    if st.button("Refresh Activity"):
        st.cache_data.clear() # Clears all @st.cache_data
        st.rerun()
else:
    st.info("No recent activity to display or failed to load activity.")

st.sidebar.markdown("---")
st.sidebar.header("Actions")
if st.sidebar.button("Force System Health Re-check"):
    # In a real app, this might trigger an event or API call
    logger.info("UI: User triggered system health re-check (conceptual).")
    st.toast("Conceptual health re-check triggered!", icon="🔬")
    # Could clear specific caches if needed: fetch_system_summary_metrics.clear()
    st.cache_data.clear()
    st.rerun()

# You would need to import random for the sample data generation if used:
# import random
