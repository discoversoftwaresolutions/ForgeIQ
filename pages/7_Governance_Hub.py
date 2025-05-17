# =====================================
# 📁 pages/7_Governance_Hub.py
# =====================================
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

st.set_page_config(page_title="Governance Hub - ForgeIQ", layout="wide")
st.title("📜 Governance Hub")
st.markdown("Monitor SLA violations, governance alerts, and access audit trails.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=60)
async def fetch_governance_alerts_data(
    alert_type_filter: Optional[str] = None,
    min_severity_filter: Optional[str] = None,
    limit: int = 25
) -> List[Dict[str, Any]]: # List of SLAViolationEvent or GovernanceAlertEvent -like dicts
    logger.info(f"Governance Hub: Fetching alerts. Type: {alert_type_filter}, Severity: {min_severity_filter}")
    try:
        # CONCEPTUAL SDK/API Call: client.governance.list_alerts(type=..., min_severity=..., limit=...)
        # Backend endpoint: GET /api/forgeiq/governance/alerts
        #   Query params: alert_type, min_severity, limit
        #   Returns: {"alerts": [alert_object_1, ...]}
        
        params = {"limit": limit}
        if alert_type_filter and alert_type_filter != "All": params["alert_type"] = alert_type_filter
        if min_severity_filter and min_severity_filter != "All": params["min_severity"] = min_severity_filter
            
        response = await client._request("GET", "/api/forgeiq/governance/alerts", params=params) # NEW BACKEND ENDPOINT
        alerts_list = response.get("alerts", [])
        logger.info(f"Governance Hub: Fetched {len(alerts_list)} alerts.")
        return alerts_list
    except Exception as e:
        logger.error(f"Governance Hub: Error fetching alerts: {e}", exc_info=True)
        st.error(f"Could not load governance alerts: {str(e)[:100]}")
        return []

@st.cache_data(ttl=300) # Cache audit logs longer, or don't cache if they are too dynamic/large for direct display
async def fetch_audit_logs_data(
    project_id_filter: Optional[str] = None,
    source_event_type_filter: Optional[str] = None,
    limit: int = 100 # Audit logs can be numerous
) -> List[Dict[str, Any]]: # List of AuditLogEntry-like dicts
    logger.info(f"Governance Hub: Fetching audit logs. Project: {project_id_filter}, Event Type: {source_event_type_filter}")
    try:
        # CONCEPTUAL SDK/API Call: client.governance.list_audit_logs(...)
        # Backend endpoint: GET /api/forgeiq/governance/audit-logs
        #   Query params: project_id, source_event_type, limit, date_start, date_end, user_actor
        #   Returns: {"audit_logs": [audit_log_entry_1, ...]}
        
        params = {"limit": limit}
        if project_id_filter and project_id_filter != "All": params["project_id"] = project_id_filter
        if source_event_type_filter and source_event_type_filter != "All": params["source_event_type"] = source_event_type_filter
            
        response = await client._request("GET", "/api/forgeiq/governance/audit-logs", params=params) # NEW BACKEND ENDPOINT
        logs_list = response.get("audit_logs", [])
        logger.info(f"Governance Hub: Fetched {len(logs_list)} audit logs.")
        return logs_list
    except Exception as e:
        logger.error(f"Governance Hub: Error fetching audit logs: {e}", exc_info=True)
        st.error(f"Could not load audit logs: {str(e)[:100]}")
        return []

# --- Page Layout & Filters ---
tab1, tab2 = st.tabs(["🚨 Alerts (SLA & Policy)", "🗒️ Audit Trail"])

with tab1:
    st.subheader("SLA Violations & Governance Alerts")
    col_f1, col_f2, col_f3 = st.columns(3)
    alert_type_options = ["All", "SLAViolationEvent", "GovernanceAlertEvent"] # From event_type fields
    severity_options_gov = ["All", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]

    with col_f1:
        alert_type_filter = st.selectbox("Filter by Alert Type:", options=alert_type_options, key="gov_alert_type")
    with col_f2:
        min_severity_filter = st.selectbox("Minimum Severity:", options=severity_options_gov, key="gov_min_sev")
    with col_f3:
        if st.button("Refresh Alerts", key="refresh_gov_alerts", use_container_width=True):
            # fetch_governance_alerts_data.clear() # More specific
            st.cache_data.clear()
            st.rerun()
    
    alerts_data = asyncio.run(fetch_governance_alerts_data(
        alert_type_filter=alert_type_filter if alert_type_filter != "All" else None,
        min_severity_filter=min_severity_filter if min_severity_filter != "All" else None
    ))

    if not alerts_data:
        st.info("No governance alerts match the current filters.")
    else:
        for alert in alerts_data:
            alert_id = alert.get("alert_id", "N/A")[-12:]
            alert_type = alert.get("event_type", alert.get("alert_type", "N/A")) # event_type for SLAViolation, alert_type for GovernanceAlert
            severity = alert.get("severity", "N/A")
            timestamp_str = alert.get("timestamp", "")
            ts_display = datetime.datetime.fromisoformat(timestamp_str.replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M') if timestamp_str else "N/A"

            color = "blue"
            if severity == "CRITICAL": color = "red"
            elif severity == "HIGH": color = "orange"
            elif severity == "MEDIUM": color = "orange" # Streamlit orange is more like warning
            
            with st.expander(f":{color}[{severity}] **{alert_type}** (ID: ...{alert_id}) - {ts_display}"):
                st.write(f"**Description:** {alert.get('description', alert.get('details', 'No details.'))}")
                if alert_type == "SLAViolationEvent":
                    st.caption(f"SLA Name: {alert.get('sla_name')}, Metric: {alert.get('metric_name')}, Observed: {alert.get('observed_value')}, Threshold: {alert.get('threshold_value')}")
                st.write("**Context/Details:**")
                st.json(alert.get("context_summary") or alert.get("event_details") or {"raw": alert}, expanded=False)
            st.divider()

with tab2:
    st.subheader("Audit Trail")
    col_a1, col_a2, col_a3 = st.columns(3)
    # TODO: Populate project_options_audit dynamically
    project_options_audit = ["All"] + st.session_state.get("project_ids_for_filtering", ["project_alpha", "project_beta"]) 
    # TODO: Populate event_type_options_audit dynamically from known event types
    event_type_options_audit = ["All", "NewCommitEvent", "DagExecutionStatusEvent", "DeploymentStatusEvent", "SecurityScanResultEvent"]

    with col_a1:
        audit_project_filter = st.selectbox("Filter by Project:", options=project_options_audit, key="audit_proj")
    with col_a2:
        audit_event_type_filter = st.selectbox("Filter by Source Event Type:", options=event_type_options_audit, key="audit_event_type")
    with col_a3:
        if st.button("Refresh Audit Logs", key="refresh_audit_logs", use_container_width=True):
            # fetch_audit_logs_data.clear()
            st.cache_data.clear()
            st.rerun()
            
    audit_log_entries = asyncio.run(fetch_audit_logs_data(
        project_id_filter=audit_project_filter if audit_project_filter != "All" else None,
        source_event_type_filter=audit_event_type_filter if audit_event_type_filter != "All" else None,
        limit=50 # Limit initial display
    ))

    if not audit_log_entries:
        st.info("No audit log entries match the current filters.")
    else:
        audit_df_data = []
        for entry in audit_log_entries:
            audit_df_data.append({
                "Timestamp": datetime.datetime.fromisoformat(entry['timestamp'].replace("Z","+00:00")).strftime('%Y-%m-%d %H:%M:%S') if entry.get('timestamp') else 'N/A',
                "Source Event Type": entry.get("source_event_type"),
                "Project ID": entry.get("project_id", "-"),
                "Actor": entry.get("user_or_actor", "-"),
                "Action": entry.get("action_description", "")[:100], # Truncate
                "Audit ID": entry.get("audit_id", "N/A")[-12:]
            })
        if audit_df_data:
            st.dataframe(pd.DataFrame(audit_df_data), use_container_width=True, hide_index=True)
            # TODO: Add pagination for audit logs
        else:
            st.info("Processed audit logs resulted in empty display.")
