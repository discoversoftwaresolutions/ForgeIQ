# ============================================
# 📁 pages/8_System_Configuration.py
# ============================================
import streamlit as st
import asyncio
import logging
from typing import Dict, Any, List

# --- SDK Client Access & Logger ---
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please go to the main Dashboard page first.")
    st.stop()
client = st.session_state.forgeiq_sdk_client
logger = logging.getLogger(__name__)
# --- End SDK Client Access & Logger ---

st.set_page_config(page_title="System Configuration - ForgeIQ", layout="wide")
st.title("⚙️ System Configuration Viewer")
st.markdown("View key configurations of the ForgeIQ system. (Read-only)")

# --- Data Fetching Functions ---
@st.cache_data(ttl=300) # Cache config longer
async def fetch_build_system_config_data(project_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    logger.info(f"SysConfig Page: Fetching build system config (Project: {project_id or 'Global'})")
    try:
        # Uses SDK method defined in sdk/build_system.py
        # This calls backend endpoint: GET /api/forgeiq/projects/{project_id}/build-config
        # or a global one: GET /api/forgeiq/config/build-system (if project_id is None)
        if project_id and project_id != "Global (Effective)":
            # Assuming SDK has client.build_system.get_project_configuration(project_id)
            # This endpoint was defined in ForgeIQ-backend
            response = await client.build_system.get_project_configuration(project_id=project_id) # type: ignore
            return response.get("configuration") if response else None
        else:
            # CONCEPTUAL SDK/API: client.config.get_full_build_system_config()
            # Backend endpoint: GET /api/forgeiq/config/build-system (returns entire BuildSystemConfig)
            response = await client._request("GET", "/api/forgeiq/config/build-system") # NEW BACKEND ENDPOINT
            return response # Expects the full BuildSystemConfig structure
    except Exception as e:
        logger.error(f"SysConfig Page: Error fetching build system config: {e}", exc_info=True)
        st.error(f"Could not load build system configuration: {str(e)[:100]}")
        return None

@st.cache_data(ttl=60)
async def fetch_agent_registry_summary_data() -> Dict[str, Any]:
    logger.info("SysConfig Page: Fetching agent registry summary...")
    try:
        # CONCEPTUAL SDK/API: client.agents.get_registry_summary()
        # Backend endpoint: GET /api/forgeiq/agents/summary (or use the existing GET /api/forgeiq/agents and summarize in UI)
        response = await client._request("GET", "/api/forgeiq/agents") # Uses existing agent list endpoint
        agents_list = response.get("agents", [])
        summary = {"total_registered": len(agents_list), "types": {}}
        for agent_info in agents_list:
            agent_type = agent_info.get("agent_type", "Unknown")
            summary["types"][agent_type] = summary["types"].get(agent_type, 0) + 1
        return summary
    except Exception as e:
        logger.error(f"SysConfig Page: Error fetching agent registry summary: {e}", exc_info=True)
        st.error(f"Could not load agent registry summary: {str(e)[:100]}")
        return {}

# --- Page Layout & Display ---
st.sidebar.subheader("Config View Options")
# TODO: Populate project_list_options from an API call
project_options_config = ["Global (Effective)"] + st.session_state.get("project_ids_for_filtering", ["project_alpha", "project_beta"]) 
selected_project_for_config = st.sidebar.selectbox("View Config For Project:", options=project_options_config, key="sb_cfg_proj")

if st.sidebar.button("Refresh Configurations", use_container_width=True):
    st.cache_data.clear()
    st.rerun()

# Build System Configuration
st.header("Build System Configuration")
project_id_arg = None if selected_project_for_config == "Global (Effective)" else selected_project_for_config
build_config_data = asyncio.run(fetch_build_system_config_data(project_id=project_id_arg))

if build_config_data:
    if project_id_arg:
        st.markdown(f"#### Effective Configuration for Project: `{project_id_arg}`")
        st.caption("Shows project-specific overrides merged with global defaults where applicable.")
    else:
        st.markdown(f"#### Global Build System Configuration")
    
    # Displaying parts of the config. Assumes structure from core.build_system_config.py
    if project_id_arg: # Displaying specific project config
         st.json(build_config_data, expanded=False)
    else: # Displaying global config (which contains projects dict)
        st.subheader("Global DAG Rules")
        st.json(build_config_data.get("global_dag_rules", {}))
        st.subheader("Global Task Weights")
        st.json(build_config_data.get("global_task_weights", {}))
        st.subheader("Global Clearance Policies")
        st.json(build_config_data.get("global_clearance_policies", {}))
        
        with st.expander("View All Project-Specific Configs (within Global View)", expanded=False):
            st.json(build_config_data.get("projects", {}))
else:
    st.warning("Could not load build system configuration.")

st.markdown("---")

# Agent Registry Summary
st.header("Agent Registry Summary")
agent_summary_data = asyncio.run(fetch_agent_registry_summary_data())
if agent_summary_data:
    st.metric("Total Registered Agents", agent_summary_data.get("total_registered", "N/A"))
    st.write("Agent Types Registered:")
    if agent_summary_data.get("types"):
        st.json(agent_summary_data.get("types"))
    else:
        st.caption("No agent type data available.")
    st.link_button("Go to Full Agent Status Page ➔", "/5_Agents_Status") # Assumes page filename
else:
    st.warning("Could not load agent registry summary.")

# TODO: Add sections for viewing MessageRouter rules, Orchestrator known flows, etc. (read-only)
