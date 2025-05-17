# ==============================
# 📁 pages/2_Projects.py
# ==============================
import streamlit as st
import asyncio
import logging
import pandas as pd
import datetime
from typing import List, Dict, Any, Optional
import uuid # For generating request IDs if SDK doesn't

# --- SDK Client Access & Logger ---
# This should be at the top of every page file in the pages/ directory
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please return to the main Dashboard page first to establish connection.")
    st.stop() # Stop execution if SDK is missing
client = st.session_state.forgeiq_sdk_client # Get client from session state

logger = logging.getLogger(__name__) # Page-specific logger
# --- End SDK Client Access & Logger ---

st.set_page_config(page_title="Projects - ForgeIQ", layout="wide")
st.title("🏗️ Projects Dashboard")
st.markdown("View all projects managed by ForgeIQ and initiate actions.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=120) # Cache for 2 minutes
async def fetch_all_projects_data() -> List[Dict[str, Any]]:
    logger.info("Projects Page: Fetching list of all projects...")
    try:
        # SDK Enhancement Needed: client should have a method like client.projects.list() or client.list_all_projects()
        # This method would call a new backend API endpoint: GET /api/forgeiq/projects
        # Backend should return: List[{"id": "...", "name": "...", "description": "...", "status": "...", "last_activity_ts": "ISO_DATETIME"}]

        # For now, using client._request as a placeholder for a direct API call.
        # In the actual SDK, this would be a dedicated method.
        response = await client._request("GET", "/api/forgeiq/projects") # NEW BACKEND ENDPOINT
        projects_list = response.get("projects", []) 
        logger.info(f"Projects Page: Fetched {len(projects_list)} projects.")
        return projects_list
    except Exception as e:
        logger.error(f"Projects Page: Error fetching projects list: {e}", exc_info=True)
        st.error(f"Could not load projects: {str(e)[:100]}")
        return []

async def trigger_pipeline_for_project_sdk(project_id: str, prompt: str, commit_sha: Optional[str] = None) -> Optional[Dict[str, Any]]:
    logger.info(f"Projects Page: Triggering pipeline for project '{project_id}' with prompt: '{prompt[:30]}...'")
    try:
        # Using the SDK method defined in sdk/client.py
        response = await client.submit_pipeline_prompt(
            project_id=project_id,
            user_prompt=prompt,
            additional_context={"source": "ForgeIQ-UI/ProjectsPage", "commit_sha": commit_sha or "latest"},
            request_id=str(uuid.uuid4()) # Ensure SDK method can take request_id
        )
        return response
    except Exception as e:
        logger.error(f"Projects Page: Error triggering pipeline for {project_id}: {e}", exc_info=True)
        st.error(f"Failed to trigger pipeline: {str(e)[:100]}")
        return None

# --- Page Layout and Display ---

# Action buttons at the top
col_actions1, col_actions2 = st.columns([1,4])
with col_actions1:
    if st.button("🔄 Refresh Projects List", use_container_width=True):
        st.cache_data.clear() # Clears all @st.cache_data on this page
        st.rerun()
# with col_actions2: # Placeholder for future actions like "Create New Project"
    # if st.button("➕ Create New Project", disabled=True, use_container_width=True): # Conceptual
        # st.info("Project creation via UI is a future feature.")


projects_list_data = asyncio.run(fetch_all_projects_data())

if not projects_list_data:
    st.info("No projects found or available. You might need to configure projects in the ForgeIQ system.")
    st.stop()

st.subheader(f"Found {len(projects_list_data)} Project(s)")
st.markdown("---")

# Display projects in a more structured way, perhaps with expanders for actions
for project in projects_list_data:
    project_id = project.get("id", "N/A")
    project_name = project.get("name", "Unnamed Project")
    project_desc = project.get("description", "No description available.")
    project_status = project.get("status", "Unknown")
    last_activity_str = project.get("last_activity_ts", "")

    last_activity_display = "N/A"
    if last_activity_str:
        try:
            last_activity_display = datetime.datetime.fromisoformat(last_activity_str.replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M %Z')
        except ValueError:
            last_activity_display = last_activity_str # Show raw if parsing fails

    with st.container(border=True):
        c1, c2 = st.columns([3,1])
        with c1:
            st.subheader(f"{project_name} (ID: {project_id})")
            st.caption(project_desc)
            st.markdown(f"**Status:** {project_status} | **Last Activity:** {last_activity_display}")

        # Placeholder for project-specific quick stats or links
        # with c2:
        #     st.metric("Recent Builds", "5", delta="1 (failed)") # Example metric

        with st.expander("🚀 Trigger New Pipeline for this Project"):
            form_key = f"pipeline_form_{project_id}"
            with st.form(key=form_key):
                # In a real app, fetch latest commit for this project_id or allow user input
                commit_sha_default = "HEAD" 
                commit_sha = st.text_input("Commit SHA (optional, default: HEAD/latest):", 
                                           value=commit_sha_default, key=f"commit_{project_id}")

                pipeline_prompt = st.text_area(
                    "Describe the pipeline to run:", 
                    height=120, 
                    key=f"prompt_{project_id}",
                    placeholder="e.g., Run full CI: lint, unit tests, build image, and deploy to staging."
                )
                submitted = st.form_submit_button("Generate & Start Pipeline")

                if submitted:
                    if not pipeline_prompt:
                        st.warning("Please provide a pipeline description/prompt.")
                    else:
                        with st.spinner(f"Requesting pipeline for {project_name}..."):
                            response = asyncio.run(trigger_pipeline_for_project_sdk(
                                project_id, pipeline_prompt, commit_sha or commit_sha_default
                            ))
                        if response and response.get("request_id"):
                            st.success(f"Pipeline generation request submitted for '{project_name}'! Request ID: {response['request_id']}")
                            st.info("Navigate to 'Pipelines & Builds' page to track its status.")
                            st.balloons()
                        else:
                            st.error("Failed to submit pipeline generation request for this project.")

        # Add a small spacer
        st.markdown("<br>", unsafe_allow_html=True) 

# --- End of Project List ---
