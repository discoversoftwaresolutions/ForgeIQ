# ============================================
# 📁 pages/3_Pipelines_and_Builds.py
# ============================================
import streamlit as st
import asyncio
import logging
import pandas as pd
import datetime
from typing import List, Dict, Any, Optional
import uuid # For example data or unique keys

# --- SDK Client Access & Logger ---
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please go to the main Dashboard page first.")
    st.stop()
client = st.session_state.forgeiq_sdk_client
logger = logging.getLogger(__name__)
# --- End SDK Client Access & Logger ---

st.set_page_config(page_title="Pipelines & Builds - ForgeIQ", layout="wide")
st.title("🚀 Pipelines & Builds Tracker")
st.markdown("Monitor ongoing and completed pipeline (DAG) executions and their constituent tasks.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=15) # Cache for 15 seconds for potentially live data
async def fetch_pipeline_executions_data(
    project_id_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 25
) -> List[Dict[str, Any]]: # List of SDKDagExecutionStatusModel-like dicts
    logger.info(
        f"Pipelines Page: Fetching pipeline executions. Filters - Project: {project_id_filter}, Status: {status_filter}"
    )
    try:
        # CONCEPTUAL SDK/API Call: client.pipelines.list_executions(project_id=..., status=..., limit=...)
        # Backend endpoint: GET /api/forgeiq/pipelines/executions
        #   Query params: project_id, status, limit
        #   Returns: {"pipelines": [SDKDagExecutionStatusModel_like_summary_1, ...]}

        params = {"limit": limit}
        if project_id_filter and project_id_filter != "All": params["project_id"] = project_id_filter
        if status_filter and status_filter != "All": params["status"] = status_filter

        response = await client._request("GET", "/api/forgeiq/pipelines/executions", params=params) # NEW BACKEND ENDPOINT
        pipelines_list = response.get("pipelines", [])
        logger.info(f"Pipelines Page: Fetched {len(pipelines_list)} pipeline executions.")
        return pipelines_list
    except Exception as e:
        logger.error(f"Pipelines Page: Error fetching pipeline executions: {e}", exc_info=True)
        st.error(f"Could not load pipeline executions: {str(e)[:100]}")
        return []

@st.cache_data(ttl=10) # Shorter TTL for details as they might update more frequently
async def fetch_dag_full_details(dag_id: str, project_id: Optional[str]) -> Optional[Dict[str, Any]]: # SDKDagExecutionStatusModel
    logger.info(f"Pipelines Page: Fetching full details for DAG '{dag_id}' in project '{project_id}'")
    try:
        # This uses the existing SDK method which calls the backend
        # Backend gets this from SharedMemoryStore where PlanAgent writes it
        # The response should be SDKDagExecutionStatusModel compatible and include the DAG node structure
        # This API endpoint was: GET /api/forgeiq/projects/{project_id}/dags/{dag_id}/status
        # We might need a richer one like GET /api/forgeiq/pipelines/executions/{dag_id}
        details = await client.get_dag_execution_status(project_id=project_id or "default", dag_id=dag_id) # Ensure project_id is passed
        return details
    except Exception as e:
        logger.error(f"Pipelines Page: Error fetching DAG details for {dag_id}: {e}", exc_info=True)
        st.error(f"Could not load DAG details for {dag_id}: {str(e)[:100]}")
        return None

async def trigger_pipeline_rerun_sdk(project_id: str, dag_id: str) -> Optional[Dict[str, Any]]:
    logger.info(f"Pipelines Page: Requesting rerun for DAG '{dag_id}' in project '{project_id}'")
    try:
        # CONCEPTUAL SDK/API Call: client.pipelines.rerun_execution(dag_id=...)
        # Backend endpoint: POST /api/forgeiq/pipelines/executions/{dag_id}/rerun
        payload = {"project_id": project_id} # Backend might need original project context
        response = await client._request("POST", f"/api/forgeiq/pipelines/executions/{dag_id}/rerun", json_data=payload) # NEW BACKEND ENDPOINT
        return response # e.g., {"message": "Rerun initiated", "new_dag_id": "..."}
    except Exception as e:
        logger.error(f"Pipelines Page: Error triggering rerun for DAG {dag_id}: {e}", exc_info=True)
        st.error(f"Failed to trigger rerun for DAG {dag_id}: {str(e)[:100]}")
        return None

# --- Page Layout & Filters ---
st.sidebar.subheader("Pipeline Filters")
# TODO: Populate project_list_options from an API call
# For now, using session state if set by Projects page or mock
project_options_pipelines = ["All"] + st.session_state.get("project_ids_for_filtering", ["project_alpha", "project_beta", "project_gamma"])
status_options_pipelines = ["All", "RUNNING", "COMPLETED_SUCCESS", "FAILED", "QUEUED", "STARTED", "COMPLETED_PARTIAL"]

if 'pipeline_project_filter' not in st.session_state: st.session_state.pipeline_project_filter = "All"
if 'pipeline_status_filter' not in st.session_state: st.session_state.pipeline_status_filter = "All"

st.session_state.pipeline_project_filter = st.sidebar.selectbox("Filter by Project:", options=project_options_pipelines, key="sb_pipe_proj")
st.session_state.pipeline_status_filter = st.sidebar.selectbox("Filter by Status:", options=status_options_pipelines, key="sb_pipe_stat")

if st.sidebar.button("Apply Filters & Refresh Pipelines", use_container_width=True):
    st.cache_data.clear()
    st.rerun()

# --- Display Pipelines ---
pipeline_executions = asyncio.run(fetch_pipeline_executions_data(
    project_id_filter=st.session_state.pipeline_project_filter if st.session_state.pipeline_project_filter != "All" else None,
    status_filter=st.session_state.pipeline_status_filter if st.session_state.pipeline_status_filter != "All" else None
))

st.subheader(f"Displaying {len(pipeline_executions)} Pipeline Executions")

if not pipeline_executions:
    st.info("No pipeline executions match the current filters or failed to load.")
else:
    for exec_summary in pipeline_executions:
        dag_id = exec_summary.get("dag_id", "N/A")
        project_id = exec_summary.get("project_id", "N/A")
        status = exec_summary.get("status", "UNKNOWN")
        started_at_str = exec_summary.get("started_at", "")

        started_display = "N/A"
        if started_at_str:
            try: started_display = datetime.datetime.fromisoformat(started_at_str.replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M')
            except ValueError: started_display = started_at_str

        status_icon = "❓"
        if status == "COMPLETED_SUCCESS": status_icon = "✅"
        elif status == "FAILED": status_icon = "❌"
        elif status == "RUNNING" or status == "STARTED": status_icon = "⏳"
        elif status == "QUEUED": status_icon = " M0,0H24V24H0z' fill='none'/> <path d='M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h2zm0 8h-2v2h2z'> </path> </g> </svg>" # Clock icon (SVG for queue) - this needs HTML
            status_icon = "🕒" # Simpler emoji

        expander_title = f"{status_icon} DAG: **{dag_id}** (Project: {project_id}) - Status: **{status}** - Started: {started_display}"

        with st.expander(expander_title):
            st.caption(f"Full DAG ID: {dag_id}")
            st.write(f"**Description:** {exec_summary.get('dag', {}).get('description', exec_summary.get('message', 'N/A'))}") # Assuming 'dag' might be in summary

            if exec_summary.get("completed_at"):
                st.write(f"**Completed:** {datetime.datetime.fromisoformat(exec_summary['completed_at'].replace('Z','+00:00')).strftime('%Y-%m-%d %H:%M')}")

            cols_actions = st.columns(3)
            with cols_actions[0]:
                if st.button("View Details & Tasks", key=f"details_dag_{dag_id}", use_container_width=True):
                    st.session_state.selected_dag_id_for_details = dag_id
                    st.session_state.selected_project_id_for_details = project_id # For fetch_dag_full_details
                    # We might need to clear other selections if any
            with cols_actions[1]:
                if status not in ["COMPLETED_SUCCESS", "RUNNING", "QUEUED"]: # Allow rerun for failed/partial
                    if st.button("🔁 Re-run Pipeline", key=f"rerun_dag_{dag_id}", use_container_width=True, type="secondary"):
                        with st.spinner(f"Requesting rerun for DAG {dag_id}..."):
                            rerun_resp = asyncio.run(trigger_pipeline_rerun_sdk(project_id, dag_id))
                        if rerun_resp and rerun_resp.get("new_dag_id"):
                            st.success(f"Pipeline rerun initiated! New DAG ID: {rerun_resp['new_dag_id']}")
                            st.cache_data.clear(); st.rerun()
                        else:
                            st.error(f"Failed to initiate rerun for DAG {dag_id}.")
            # with cols_actions[2]:
            #     if status == "RUNNING":
            #         if st.button("❌ Cancel Pipeline", key=f"cancel_dag_{dag_id}", use_container_width=True, type="destructive"):
            #             # Backend API: POST /api/forgeiq/pipelines/executions/{dag_id}/cancel
            #             st.warning("Cancel functionality not yet implemented.")


            # Display full details if this DAG is selected
            if st.session_state.get("selected_dag_id_for_details") == dag_id:
                with st.spinner(f"Loading full details for DAG {dag_id}..."):
                    dag_full_details = asyncio.run(fetch_dag_full_details(st.session_state.selected_project_id_for_details, dag_id))

                if dag_full_details:
                    st.markdown("##### Task Execution Statuses:")
                    tasks_for_df = []
                    for task_status in dag_full_details.get("task_statuses", []):
                        tasks_for_df.append({
                            "Task ID": task_status.get("task_id"),
                            "Status": task_status.get("status"),
                            "Message/Summary": (task_status.get("message") or task_status.get("result_summary",""))[:150], # Truncate
                            "Started": datetime.datetime.fromisoformat(task_status['started_at'].replace("Z","+00:00")).strftime('%H:%M:%S') if task_status.get('started_at') else '-',
                            "Completed": datetime.datetime.fromisoformat(task_status['completed_at'].replace("Z","+00:00")).strftime('%H:%M:%S') if task_status.get('completed_at') else '-',
                        })
                    if tasks_for_df:
                        st.dataframe(pd.DataFrame(tasks_for_df), height=min(300, len(tasks_for_df)*40 + 40), use_container_width=True, hide_index=True)
                    else:
                        st.caption("No task status details found for this DAG execution.")

                    # DAG Visualization
                    dag_definition_nodes = dag_full_details.get("dag", {}).get("nodes", []) # PlanAgent should store original DAG def with status
                    if not dag_definition_nodes and dag_full_details.get("nodes"): # If nodes are top-level in status event
                         dag_definition_nodes = dag_full_details.get("nodes")

                    if dag_definition_nodes:
                        st.markdown("##### Pipeline Structure (DAG):")
                        dot_string = "digraph {\n  rankdir=LR;\n  node [shape=box, style=rounded];\n"
                        for node in dag_definition_nodes:
                            node_id = node.get("id", "unknown_node")
                            task_type = node.get("task_type", "unknown_type")
                            node_label = f"{node_id}\\n({task_type})"
                            # Optionally color nodes by status if available here (would need merging task_statuses with dag_nodes)
                            dot_string += f'  "{node_id}" [label="{node_label}"];\n'
                            for dep in node.get("dependencies", []):
                                dot_string += f'  "{dep}" -> "{node_id}";\n'
                        dot_string += "}"
                        try:
                            st.graphviz_chart(dot_string)
                        except Exception as e_gv:
                            st.warning(f"Could not render DAG visualization (Graphviz might not be installed or DOT string error): {e_gv}")
                            st.code(dot_string, language="dot")
                    else:
                        st.caption("DAG structure not available for visualization.")

                    if st.button("Hide Full Details", key=f"hide_full_details_{dag_id}"):
                        if "selected_dag_id_for_details" in st.session_state: del st.session_state.selected_dag_id_for_details
                        if "selected_project_id_for_details" in st.session_state: del st.session_state.selected_project_id_for_details
                        st.rerun()
                else:
                    st.warning(f"Could not load full details for DAG {dag_id}.")
