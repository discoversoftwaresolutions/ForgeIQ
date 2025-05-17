# ===================================
# 📁 pages/4_Deployments.py
# ===================================
import streamlit as st
import asyncio
import logging
import pandas as pd
import datetime
from typing import List, Dict, Any, Optional
import uuid # For example data if needed

# --- SDK Client Access & Logger ---
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please go to the main Dashboard page first.")
    st.stop()
client = st.session_state.forgeiq_sdk_client
logger = logging.getLogger(__name__)
# --- End SDK Client Access & Logger ---

st.set_page_config(page_title="Deployments - ForgeIQ", layout="wide")
st.title("🚢 Deployments Overview")
st.markdown("Track the status of your service deployments across different environments.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=30) # Cache for 30 seconds for potentially live data
async def fetch_deployments_list(
    project_id_filter: Optional[str] = None,
    service_name_filter: Optional[str] = None,
    environment_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 25
) -> List[Dict[str, Any]]:
    logger.info(
        f"Deployments Page: Fetching deployments list. Filters - Project: {project_id_filter}, "
        f"Service: {service_name_filter}, Env: {environment_filter}, Status: {status_filter}"
    )
    try:
        # CONCEPTUAL SDK/API Call: client.deployments.list(project_id=..., service_name=..., ...)
        # Backend endpoint: GET /api/forgeiq/deployments
        #   Query params: project_id, service_name, target_environment, status, limit
        # It should return a list of objects compatible with SDKDeploymentStatusModel.

        params = {"limit": limit}
        if project_id_filter and project_id_filter != "All":
            params["project_id"] = project_id_filter
        if service_name_filter and service_name_filter != "All":
            params["service_name"] = service_name_filter
        if environment_filter and environment_filter != "All":
            params["target_environment"] = environment_filter
        if status_filter and status_filter != "All":
            params["status"] = status_filter

        # Using client._request for now; SDK would have a dedicated method client.list_deployments(**params)
        response = await client._request("GET", "/api/forgeiq/deployments", params=params) # NEW BACKEND ENDPOINT
        deployments_list = response.get("deployments", [])
        logger.info(f"Deployments Page: Fetched {len(deployments_list)} deployments.")
        return deployments_list
    except Exception as e:
        logger.error(f"Deployments Page: Error fetching deployments list: {e}", exc_info=True)
        st.error(f"Could not load deployments: {str(e)[:100]}")
        return []

async def trigger_rollback_sdk(deployment_id_to_rollback_from: str, project_id: str, service_name: str) -> Optional[Dict[str, Any]]:
    logger.info(f"Deployments Page: Requesting rollback for service '{service_name}' from deployment related to '{deployment_id_to_rollback_from}'")
    try:
        # CONCEPTUAL SDK/API Call: client.deployments.trigger_rollback(project_id, service_name, based_on_deployment_id=...)
        # Backend endpoint: POST /api/forgeiq/deployments/rollback 
        #   (Body might include project_id, service_name, and how to determine rollback target e.g. previous successful)
        payload = {
            "project_id": project_id,
            "service_name": service_name,
            "rollback_target_type": "previous_successful", # or specific deployment_id
            "current_deployment_id_for_context": deployment_id_to_rollback_from
        }
        response = await client._request("POST", "/api/forgeiq/deployments/rollback", json_data=payload) # NEW BACKEND ENDPOINT
        return response
    except Exception as e:
        logger.error(f"Deployments Page: Error triggering rollback for deployment context {deployment_id_to_rollback_from}: {e}", exc_info=True)
        st.error(f"Failed to trigger rollback: {str(e)[:100]}")
        return None

# --- Page Layout & Filters ---
st.sidebar.subheader("Deployment Filters")

# TODO: Populate these lists dynamically from backend API calls for existing projects, services, envs
project_options = ["All"] + sorted(list(set(d.get("project_id", "N/A") for d in asyncio.run(fetch_deployments_list(limit=100))))) # Fetch distinct project_ids
service_options = ["All"] + sorted(list(set(d.get("service_name", "N/A") for d in asyncio.run(fetch_deployments_list(limit=100))))) # Fetch distinct service_names
env_options = ["All", "staging", "production", "development"] # Example environments
status_options = ["All", "STARTED", "IN_PROGRESS", "SUCCESSFUL", "FAILED", "UNKNOWN"]

# Use session state to keep filter values persistent across reruns
if 'deploy_project_filter' not in st.session_state: st.session_state.deploy_project_filter = "All"
if 'deploy_service_filter' not in st.session_state: st.session_state.deploy_service_filter = "All"
if 'deploy_env_filter' not in st.session_state: st.session_state.deploy_env_filter = "All"
if 'deploy_status_filter' not in st.session_state: st.session_state.deploy_status_filter = "All"

st.session_state.deploy_project_filter = st.sidebar.selectbox("Project:", options=project_options, key="sb_deploy_proj")
st.session_state.deploy_service_filter = st.sidebar.selectbox("Service:", options=service_options, key="sb_deploy_serv")
st.session_state.deploy_env_filter = st.sidebar.selectbox("Environment:", options=env_options, key="sb_deploy_env")
st.session_state.deploy_status_filter = st.sidebar.selectbox("Status:", options=status_options, key="sb_deploy_stat")

if st.sidebar.button("Apply Filters & Refresh Deployments", use_container_width=True):
    # fetch_deployments_list.clear() # More specific cache clearing if needed
    st.cache_data.clear()
    st.rerun()

# Fetch and display deployments based on filters
deployments = asyncio.run(fetch_deployments_list(
    project_id_filter=st.session_state.deploy_project_filter,
    service_name_filter=st.session_state.deploy_service_filter,
    environment_filter=st.session_state.deploy_env_filter,
    status_filter=st.session_state.deploy_status_filter
))

st.subheader(f"Displaying {len(deployments)} Deployments")

if not deployments:
    st.info("No deployments match the current filters, or failed to load.")
else:
    cols_header = st.columns((0.5, 1.5, 1, 1, 1, 1.5, 1.5, 1))
    headers = ["Status", "Service", "Environment", "Commit", "Req ID", "Deployed At", "Deployment URL", "Actions"]
    for col, header_text in zip(cols_header, headers):
        col.markdown(f"**{header_text}**")

    for dep in deployments:
        # Use deployment_id or request_id as the key for UI elements
        ui_key_base = dep.get("deployment_id") or dep.get("request_id") or str(uuid.uuid4())

        status = dep.get("status", "UNKNOWN")
        service = dep.get("service_name", "N/A")
        env = dep.get("target_environment", "N/A")
        commit = dep.get("commit_sha", "N/A")[:7] # Short SHA
        req_id = dep.get("request_id", "N/A")[-8:] # Short Req ID

        completed_at_str = dep.get("completed_at") or dep.get("timestamp") # Use timestamp as fallback
        completed_display = "N/A"
        if completed_at_str:
            try:
                completed_display = datetime.datetime.fromisoformat(completed_at_str.replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M')
            except ValueError:
                completed_display = completed_at_str


        deployment_url = dep.get("deployment_url")
        logs_url = dep.get("logs_url") # Railway deployment specific logs URL

        cols_data = st.columns((0.5, 1.5, 1, 1, 1, 1.5, 1.5, 1))

        with cols_data[0]: # Status
            if status == "SUCCESSFUL": st.success("✅")
            elif status == "FAILED": st.error("❌")
            elif status == "IN_PROGRESS" or status == "STARTED": st.warning("⏳")
            else: st.caption(status[:10]) # Show status string if not common

        cols_data[1].markdown(f"**{service}**<br><small>Project: {dep.get('project_id', 'N/A')}</small>", unsafe_allow_html=True)
        cols_data[2].caption(env)
        cols_data[3].code(commit, language=None)
        cols_data[4].caption(f"...{req_id}")
        cols_data[5].caption(completed_display)

        with cols_data[6]: # Deployment URL
            if deployment_url:
                st.link_button("🔗 Open App", deployment_url, use_container_width=True)
            else:
                st.caption("No URL")

        with cols_data[7]: # Actions
            if logs_url:
                st.link_button("📜 View Logs", logs_url, type="secondary", use_container_width=True)

            # Conceptual Rollback - needs backend API and CI_CD_Agent logic
            # if status == "SUCCESSFUL" or status == "FAILED": # Allow rollback from terminal states
            #     if st.button("Rollback", key=f"rollback_{ui_key_base}", type="secondary", use_container_width=True, help="Conceptual: Rollback to previous version"):
            #         with st.spinner("Initiating rollback..."):
            #             rb_response = asyncio.run(trigger_rollback_sdk(ui_key_base, dep.get("project_id"), service))
            #         if rb_response and rb_response.get("status") == "accepted":
            #             st.toast(f"Rollback initiated for {service}!", icon="🎉")
            #             st.cache_data.clear() # Refresh data
            #             st.rerun()
            #         else:
            #             st.error(f"Rollback failed: {rb_response.get('message', 'Unknown error')}")
        st.markdown("---")
