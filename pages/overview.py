# =============================================
# 📁 pages/1_Overview.py (V0.2 - Comprehensive)
# =============================================
import streamlit as st
import asyncio
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import datetime
import random # For generating more varied mock data

# --- SDK Client Access ---
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please go to the main Dashboard page first to establish connection.")
    st.stop()
client = st.session_state.forgeiq_sdk_client # Get client from session state
# --- End SDK Client Access ---

# --- Logger ---
logger = logging.getLogger(__name__)
# --- End Logger ---

st.set_page_config(page_title="System Overview - ForgeIQ", layout="wide")
st.title("📊 ForgeIQ System Overview")
st.markdown("A comprehensive snapshot of your agentic build system's activities and health.")

# --- Data Fetching Functions (Async with Streamlit Caching) ---
# These functions now fetch summary data for different sections.
# The actual API endpoints need to be implemented in ForgeIQ-backend.

@st.cache_data(ttl=30) # Cache for 30 seconds
async def fetch_general_system_summary() -> Dict[str, Any]:
    logger.info("Overview Page: Fetching general system summary...")
    try:
        # Conceptual API endpoint: GET /api/forgeiq/system/overall-summary
        # response = await client._request("GET", "/api/forgeiq/system/overall-summary")
        # return response 
        await asyncio.sleep(0.3) # Simulate API call
        return {
            "active_projects_count": random.randint(3, 10),
            "total_agents_defined": 12, # From your list
            "agents_online_count": random.randint(8, 12),
            "critical_alerts_count": random.randint(0, 2),
            "system_health_status": random.choice(["Operational", "Degraded", "Minor Issues"])
        }
    except Exception as e:
        logger.error(f"Error fetching general system summary: {e}", exc_info=True)
        st.toast(f"Could not load general summary: {e}", icon="❌")
        return {}

@st.cache_data(ttl=45)
async def fetch_projects_summary() -> List[Dict[str, Any]]:
    logger.info("Overview Page: Fetching projects summary...")
    try:
        # Conceptual API endpoint: GET /api/forgeiq/projects/summary?limit=3
        # response = await client._request("GET", "/api/forgeiq/projects/summary", params={"limit": 3})
        # return response.get("projects", [])
        await asyncio.sleep(0.4)
        project_names = ["PhoenixCI", "NovaBuild", "QuantumDeploy"]
        statuses = ["SUCCESSFUL", "FAILED", "IN_PROGRESS"]
        return [
            {
                "name": name, 
                "last_build_status": random.choice(statuses), 
                "last_build_timestamp": (datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1,24))).isoformat()+"Z",
                "repo_url": f"https://github.com/example/{name.lower()}" # Placeholder
            } for name in random.sample(project_names,k=len(project_names))[:3] # Show up to 3
        ]
    except Exception as e:
        logger.error(f"Error fetching projects summary: {e}", exc_info=True)
        st.toast(f"Could not load projects summary: {e}", icon="❌")
        return []

@st.cache_data(ttl=30)
async def fetch_pipelines_summary() -> List[Dict[str, Any]]:
    logger.info("Overview Page: Fetching pipelines summary...")
    try:
        # Conceptual API endpoint: GET /api/forgeiq/pipelines/recent-summary?limit=3
        # response = await client._request("GET", "/api/forgeiq/pipelines/recent-summary", params={"limit": 3})
        # return response.get("pipelines", [])
        await asyncio.sleep(0.6)
        statuses = ["COMPLETED_SUCCESS", "FAILED", "RUNNING"]
        return [
            {
                "dag_id": f"dag_{uuid.uuid4().hex[:8]}", "project_id": random.choice(["PhoenixCI", "NovaBuild"]), 
                "status": random.choice(statuses), 
                "started_at": (datetime.datetime.utcnow() - datetime.timedelta(minutes=random.randint(5,120))).isoformat()+"Z",
                "trigger": random.choice(["Commit abc1234", "Manual via API", "Scheduled"])
            } for _ in range(3)
        ]
    except Exception as e:
        logger.error(f"Error fetching pipelines summary: {e}", exc_info=True)
        st.toast(f"Could not load pipelines summary: {e}", icon="❌")
        return []

@st.cache_data(ttl=30)
async def fetch_deployments_summary() -> List[Dict[str, Any]]:
    logger.info("Overview Page: Fetching deployments summary...")
    try:
        # Conceptual API endpoint: GET /api/forgeiq/deployments/recent-summary?limit=3
        # response = await client._request("GET", "/api/forgeiq/deployments/recent-summary", params={"limit": 3})
        # return response.get("deployments", [])
        await asyncio.sleep(0.5)
        statuses = ["SUCCESSFUL", "FAILED", "IN_PROGRESS"]
        services = ["forgeiq-backend", "codenav-agent", "plan-agent"]
        envs = ["staging", "production"]
        return [
            {
                "deployment_id": f"depl_{uuid.uuid4().hex[:8]}", "service_name": random.choice(services),
                "target_environment": random.choice(envs), "commit_sha": hashlib.sha1(os.urandom(16)).hexdigest()[:7], # Needs hashlib
                "status": random.choice(statuses), 
                "completed_at": (datetime.datetime.utcnow() - datetime.timedelta(minutes=random.randint(15,300))).isoformat()+"Z"
            } for _ in range(3)
        ]
    except Exception as e:
        logger.error(f"Error fetching deployments summary: {e}", exc_info=True)
        st.toast(f"Could not load deployments summary: {e}", icon="❌")
        return []

# --- Load All Data for the Page Concurrently (Example) ---
# Note: Streamlit's caching makes direct calls simple. If not cached or needing true concurrency:
async def load_all_overview_data():
    results = await asyncio.gather(
        fetch_general_system_summary(),
        fetch_projects_summary(),
        fetch_pipelines_summary(),
        fetch_deployments_summary(),
        # Add fetch_agents_summary() here when defined
        return_exceptions=True # So one failure doesn't stop all
    )
    # Handle potential errors from asyncio.gather
    data_keys = ["general_summary", "projects_summary", "pipelines_summary", "deployments_summary"]
    processed_results = {}
    for i, key in enumerate(data_keys):
        if isinstance(results[i], Exception):
            logger.error(f"Error loading data for {key}: {results[i]}")
            processed_results[key] = [] if "summary" not in key else {} # Default to empty
        else:
            processed_results[key] = results[i]
    return processed_results

# Run the data loading (Streamlit will typically await cached async functions directly)
# For multiple concurrent non-cached calls, asyncio.run in main thread is needed.
# For cached functions, direct calls are usually fine.
# For simplicity and clarity with @st.cache_data, we'll call them sequentially.
# If performance becomes an issue, asyncio.gather can be used with careful state management.

general_summary = asyncio.run(fetch_general_system_summary())
projects_summary = asyncio.run(fetch_projects_summary())
pipelines_summary = asyncio.run(fetch_pipelines_summary())
deployments_summary = asyncio.run(fetch_deployments_summary())
# agents_summary = asyncio.run(fetch_agents_summary()) # When defined

st.markdown("---")

# --- Display General System Health & Metrics ---
if general_summary:
    st.header("System Health & Metrics")
    cols_health = st.columns( (1.5, 1, 1, 1) ) # Adjusted column widths
    health_status = general_summary.get("system_health_status", "Unknown")
    if health_status == "Operational":
        cols_health[0].success(f"**Overall System Health:** {health_status} ✅")
    else:
        cols_health[0].warning(f"**Overall System Health:** {health_status} ⚠️")

    cols_health[1].metric("Active Projects", general_summary.get("active_projects_count", "N/A"))
    cols_health[2].metric("Agents Online", f"{general_summary.get('agents_online_count', 'N/A')} / {general_summary.get('total_agents_defined', 'N/A')}")
    cols_health[3].metric("Critical Alerts", general_summary.get("critical_alerts_count", "N/A"), delta_color="inverse")
else:
    st.warning("Could not load general system metrics.")

st.markdown("---")

# --- Projects Summary Section ---
st.header("Projects Snapshot")
if projects_summary:
    cols = st.columns(len(projects_summary) if len(projects_summary) <= 3 else 3)
    for i, project in enumerate(projects_summary):
        with cols[i % 3]:
            with st.container(border=True):
                st.subheader(project.get("name", "Unknown Project"))
                status = project.get('last_build_status', 'N/A')
                if status == "SUCCESSFUL" or status == "COMPLETED_SUCCESS":
                    st.markdown(f"Last Build: ✅ **{status}**")
                elif status == "FAILED":
                    st.markdown(f"Last Build: ❌ **{status}**")
                elif status == "IN_PROGRESS" or status == "RUNNING":
                    st.markdown(f"Last Build: ⏳ **{status}**")
                else:
                    st.markdown(f"Last Build: ❔ **{status}**")

                ts = project.get('last_build_timestamp', '')
                if ts:
                    st.caption(f"At: {datetime.datetime.fromisoformat(ts.replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M') if ts else 'N/A'}")
                st.link_button("Go to Project Details ➔", f"/2_Projects?project_id={project.get('name','none')}") # Needs page implementation
else:
    st.info("No project summaries to display or failed to load.")
if st.button("View All Projects", key="view_all_projects_overview"):
    st.switch_page("pages/2_Projects.py")

st.markdown("---")

# --- Pipelines & Builds Summary Section ---
st.header("Recent Pipelines/Builds")
if pipelines_summary:
    # Using st.expander for each pipeline to show a bit more detail
    for p_sum in pipelines_summary:
        with st.expander(f"**DAG:** {p_sum.get('dag_id','N/A')} (Project: {p_sum.get('project_id','N/A')}) - Status: **{p_sum.get('status','N/A')}**"):
            st.write(f"Triggered by: {p_sum.get('trigger', 'N/A')}")
            st.write(f"Started: {datetime.datetime.fromisoformat(p_sum['started_at'].replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M:%S %Z') if p_sum.get('started_at') else 'N/A'}")
            # Conceptual button to view full DAG
            st.button("View DAG Details", key=f"view_dag_{p_sum.get('dag_id')}", on_click=st.switch_page, args=("pages/3_Pipelines_and_Builds.py",), kwargs={"dag_id_query": p_sum.get('dag_id')}) # Fictional query param passing
else:
    st.info("No recent pipeline summaries or failed to load.")
if st.button("View All Pipelines", key="view_all_pipelines_overview"):
    st.switch_page("pages/3_Pipelines_and_Builds.py")

st.markdown("---")

# --- Deployments Summary Section ---
st.header("Recent Deployments")
if deployments_summary:
    deploy_data_for_df = []
    for d_sum in deployments_summary:
        deploy_data_for_df.append({
            "Service": d_sum.get("service_name", "N/A"),
            "Environment": d_sum.get("target_environment", "N/A"),
            "Commit": d_sum.get("commit_sha", "N/A"),
            "Status": d_sum.get("status", "N/A"),
            "Completed At": datetime.datetime.fromisoformat(d_sum['completed_at'].replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M') if d_sum.get('completed_at') else 'N/A',
            "ID": d_sum.get("deployment_id", "N/A")
        })
    if deploy_data_for_df:
        st.dataframe(pd.DataFrame(deploy_data_for_df), use_container_width=True, hide_index=True)
else:
    st.info("No recent deployment summaries or failed to load.")
if st.button("View All Deployments", key="view_all_deployments_overview"):
    st.switch_page("pages/4_Deployments.py")

st.markdown("---")

# --- Agents Status Summary (Placeholder) ---
st.header("Agents Status Snapshot")
# TODO: Implement fetch_agents_summary() and display
# agents_summary = asyncio.run(fetch_agents_summary())
# if agents_summary:
#    cols_agents = st.columns(3)
#    cols_agents[0].metric("Total Agents", agents_summary.get("total", "N/A"))
#    cols_agents[1].metric("Active Agents", agents_summary.get("active", "N/A"))
#    cols_agents[2].metric("Agents with Issues", agents_summary.get("issues", "N/A"), delta_color="inverse")
# else:
st.info("Agent status summary not yet implemented in this view. See 'Agents Status' page.")
if st.button("View Agent Details", key="view_agents_overview"):
    st.switch_page("pages/5_Agents_Status.py")

st.sidebar.markdown("---")
if st.sidebar.button("Force Refresh All Overview Data"):
    st.cache_data.clear()
    st.rerun()

# Ensure imports for modules used in mock data are present if you uncomment their usage
# import uuid
# import hashlib
