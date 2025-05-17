# ===================================
# 📁 pages/6_Security_Hub.py
# ===================================
import streamlit as st
import asyncio
import logging
import pandas as pd
import datetime
from typing import List, Dict, Any, Optional

# --- SDK Client Access & Logger ---
if 'forgeiq_sdk_client' not in st.session_state or st.session_state.forgeiq_sdk_client is None:
    st.error("SDK client not initialized. Please go to the main Dashboard page first.")
    st.stop()
client = st.session_state.forgeiq_sdk_client
logger = logging.getLogger(__name__)
# --- End SDK Client Access & Logger ---

st.set_page_config(page_title="Security Hub - ForgeIQ", layout="wide")
st.title("🛡️ Security Hub")
st.markdown("Review security scan results and findings across your projects.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=60) # Cache for 1 minute
async def fetch_security_scan_results(
    project_id_filter: Optional[str] = None,
    scan_type_filter: Optional[str] = None,
    min_severity_filter: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]: # List of SecurityScanResultEvent-like dicts
    logger.info(
        f"Security Hub: Fetching scan results. Filters - Project: {project_id_filter}, "
        f"Scan Type: {scan_type_filter}, Severity: {min_severity_filter}"
    )
    try:
        # CONCEPTUAL SDK/API Call: client.security.list_scan_results(project_id=..., scan_type=..., min_severity=..., limit=...)
        # Backend endpoint: GET /api/forgeiq/security/scan-results
        #   Query params: project_id, scan_type, min_severity, limit
        #   Returns: {"scan_results": [SecurityScanResultEvent_like_dict_1, ...]}
        
        params = {"limit": limit}
        if project_id_filter and project_id_filter != "All": params["project_id"] = project_id_filter
        if scan_type_filter and scan_type_filter != "All": params["scan_type"] = scan_type_filter
        if min_severity_filter and min_severity_filter != "All": params["min_severity"] = min_severity_filter
            
        # Using client._request for now; SDK would have client.security.list_scan_results(**params)
        response = await client._request("GET", "/api/forgeiq/security/scan-results", params=params) # NEW BACKEND ENDPOINT
        results_list = response.get("scan_results", [])
        logger.info(f"Security Hub: Fetched {len(results_list)} scan results.")
        return results_list
    except Exception as e:
        logger.error(f"Security Hub: Error fetching scan results: {e}", exc_info=True)
        st.error(f"Could not load security scan results: {str(e)[:100]}")
        return []

# --- Page Layout & Filters ---
st.sidebar.subheader("Security Scan Filters")

# TODO: Populate these lists dynamically from backend API calls
project_options_sec = ["All"] + st.session_state.get("project_ids_for_filtering", ["project_alpha", "project_beta"])
scan_type_options = ["All", "SAST_PYTHON_BANDIT", "SCA_PYTHON_PIP_AUDIT", "CONTAINER_IMAGE_TRIVY", "IAC_TFSEC"] # Example scan types
severity_options = ["All", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]

if 'sec_project_filter' not in st.session_state: st.session_state.sec_project_filter = "All"
if 'sec_scantype_filter' not in st.session_state: st.session_state.sec_scantype_filter = "All"
if 'sec_severity_filter' not in st.session_state: st.session_state.sec_severity_filter = "All" # Filter findings by this severity or higher

st.session_state.sec_project_filter = st.sidebar.selectbox("Project:", options=project_options_sec, key="sb_sec_proj")
st.session_state.sec_scantype_filter = st.sidebar.selectbox("Scan Type:", options=scan_type_options, key="sb_sec_type")
st.session_state.sec_severity_filter = st.sidebar.selectbox("Minimum Severity:", options=severity_options, key="sb_sec_sev")

if st.sidebar.button("Apply Filters & Refresh Scans", use_container_width=True):
    st.cache_data.clear()
    st.rerun()

# --- Display Scan Results ---
scan_results = asyncio.run(fetch_security_scan_results(
    project_id_filter=st.session_state.sec_project_filter,
    scan_type_filter=st.session_state.sec_scantype_filter,
    min_severity_filter=st.session_state.sec_severity_filter
))

st.subheader(f"Displaying {len(scan_results)} Security Scan Events")

if not scan_results:
    st.info("No security scan results match the current filters or failed to load.")
else:
    for result_event in scan_results:
        event_id = result_event.get("triggering_event_id", str(uuid.uuid4()))[-8:]
        project_id = result_event.get("project_id", "N/A")
        scan_type = result_event.get("scan_type", "N/A")
        tool = result_event.get("tool_name", "N/A")
        status = result_event.get("status", "UNKNOWN")
        timestamp_str = result_event.get("timestamp", "")
        findings_list = result_event.get("findings", [])
        num_findings = len(findings_list)

        ts_display = datetime.datetime.fromisoformat(timestamp_str.replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M') if timestamp_str else "N/A"

        expander_title = f"Scan: **{scan_type}** on **{project_id}** (Tool: {tool}) - Status: **{status}** - Findings: **{num_findings}** - Time: {ts_display}"
        
        with st.expander(expander_title):
            st.markdown(f"**Details for Scan triggered by event {event_id}**")
            st.caption(f"Commit: {result_event.get('commit_sha', 'N/A')}, Artifact: {result_event.get('artifact_name', 'N/A')}")
            st.code(result_event.get("summary", "No summary."), language=None)

            if findings_list:
                st.markdown("##### Findings:")
                findings_data_for_df = []
                for finding in findings_list:
                    findings_data_for_df.append({
                        "ID": finding.get("finding_id", "N/A")[-12:],
                        "Severity": finding.get("severity", "N/A"),
                        "Description": finding.get("description", "N/A")[:150], # Truncate
                        "File": finding.get("file_path", "N/A"),
                        "Line": finding.get("line_number", "-"),
                        "Rule ID": finding.get("rule_id", "N/A"),
                        "Tool": finding.get("tool_name", "N/A")
                    })
                
                # Apply severity filter for display if a filter is set
                if st.session_state.sec_severity_filter != "All":
                    severity_order = {"INFORMATIONAL":0, "LOW":1, "MEDIUM":2, "HIGH":3, "CRITICAL":4}
                    min_sev_level = severity_order.get(st.session_state.sec_severity_filter, -1)
                    findings_data_for_df = [
                        f for f in findings_data_for_df 
                        if severity_order.get(f["Severity"], -1) >= min_sev_level
                    ]

                if findings_data_for_df:
                    st.dataframe(pd.DataFrame(findings_data_for_df), use_container_width=True, hide_index=True)
                else:
                    st.caption("No findings match the current severity filter for this scan event.")
            else:
                st.caption("No findings reported for this scan event.")
            st.markdown("---")
