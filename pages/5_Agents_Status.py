# =====================================
# 📁 pages/5_Agents_Status.py
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

st.set_page_config(page_title="Agents Status - ForgeIQ", layout="wide")
st.title("🤖 Agents Status Dashboard")
st.markdown("Monitor the status, capabilities, and health of all registered agents.")

# --- Data Fetching Functions ---
@st.cache_data(ttl=15) # Cache for 15 seconds for semi-live status
async def fetch_all_agents_status() -> List[Dict[str, Any]]:
    logger.info("Agents Status Page: Fetching all agent statuses...")
    try:
        # CONCEPTUAL SDK/API Call: client.agents.list_all() or client.get_agent_registry_status()
        # Backend endpoint: GET /api/forgeiq/agents
        # Backend retrieves this from AgentRegistry (which should now use SharedMemoryStore/Redis).
        # Should return a list of objects compatible with AgentRegistrationInfo TypedDict.

        response = await client._request("GET", "/api/forgeiq/agents") # NEW BACKEND ENDPOINT
        agents_list = response.get("agents", []) 
        logger.info(f"Agents Status Page: Fetched {len(agents_list)} agents.")
        return agents_list
    except Exception as e:
        logger.error(f"Agents Status Page: Error fetching agent statuses: {e}", exc_info=True)
        st.error(f"Could not load agent statuses: {str(e)[:100]}")
        return []

async def send_ping_to_agent(agent_id: str) -> Dict[str, Any]:
    logger.info(f"Agents Status Page: Sending conceptual ping to agent '{agent_id}'")
    try:
        # CONCEPTUAL SDK/API Call: client.agents.ping(agent_id=agent_id)
        # Backend endpoint: POST /api/forgeiq/agents/{agent_id}/ping
        # This endpoint would then perhaps publish a PingEvent for the specific agent
        # and wait for a PongEvent, or call a direct health check if agent exposes one.
        await asyncio.sleep(0.5) # Simulate API call
        # Mock response
        if random.random() > 0.2:
            return {"agent_id": agent_id, "status": "pong_received", "message": "Agent responded to ping."}
        else:
            return {"agent_id": agent_id, "status": "ping_timeout", "message": "Agent did not respond to ping."}
    except Exception as e:
        logger.error(f"Agents Status Page: Error pinging agent {agent_id}: {e}", exc_info=True)
        st.error(f"Failed to ping agent {agent_id}: {str(e)[:100]}")
        return {"agent_id": agent_id, "status": "ping_error", "message": str(e)}


# --- Page Layout & Display ---

refresh_button_cols = st.columns([0.8, 0.2]) # Give more space to other potential top-level actions
with refresh_button_cols[1]: # Place refresh button to the right
    if st.button("🔄 Refresh Agent Statuses", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

st.markdown("---")

agents_status_data = asyncio.run(fetch_all_agents_status())

if not agents_status_data:
    st.info("No agent data found or failed to load. Ensure agents are running and registering themselves.")
else:
    st.subheader(f"Found {len(agents_status_data)} Registered Agent(s)")

    # Prepare data for DataFrame display
    df_data = []
    for agent_info in agents_status_data:
        capabilities_str = ", ".join([cap.get("name", "N/A") for cap in agent_info.get("capabilities", [])])
        endpoints_str = ""
        for ep in agent_info.get("endpoints", []):
            endpoints_str += f"{ep.get('type', 'N/A')}: {ep.get('address', 'N/A')}\n"

        last_seen_str = agent_info.get("last_seen_timestamp", "")
        last_seen_display = "N/A"
        if last_seen_str:
            try:
                last_seen_dt = datetime.datetime.fromisoformat(last_seen_str.replace("Z", "+00:00"))
                last_seen_display = last_seen_dt.strftime('%Y-%m-%d %H:%M:%S %Z')
                # Check if agent is "stale" (e.g., no heartbeat in last 5 minutes)
                if (datetime.datetime.now(datetime.timezone.utc) - last_seen_dt).total_seconds() > 300: # 5 minutes
                    agent_info["status"] = agent_info.get("status","") + " (Stale)"
            except ValueError:
                last_seen_display = last_seen_str # Show raw if parsing fails


        df_data.append({
            "ID": agent_info.get("agent_id"),
            "Type": agent_info.get("agent_type"),
            "Status": agent_info.get("status"),
            "Capabilities": capabilities_str if capabilities_str else "N/A",
            "Endpoints": endpoints_str.strip() if endpoints_str else "N/A",
            "Last Seen": last_seen_display,
            "Metadata": json.dumps(agent_info.get("metadata"), indent=2) if agent_info.get("metadata") else "N/A"
        })

    if df_data:
        # Configure column widths and display
        # st.dataframe(pd.DataFrame(df_data), use_container_width=True, hide_index=True)
        # Using st.data_editor for a more interactive table (though not editing here)
        st.subheader("Agent Fleet Details")

        # Using columns for a nicer layout than just dataframe
        for i, agent_row in enumerate(df_data):
            with st.container(border=True):
                c1, c2, c3 = st.columns([1.5, 1, 2.5])
                with c1:
                    st.markdown(f"**ID:** `{agent_row['ID']}`")
                    st.markdown(f"**Type:** {agent_row['Type']}")
                with c2:
                    status = agent_row['Status']
                    if "active" in status.lower() and not "stale" in status.lower():
                        st.success(f"**Status:** {status}")
                    elif "stale" in status.lower() or "degraded" in status.lower():
                        st.warning(f"**Status:** {status}")
                    else:
                        st.error(f"**Status:** {status}")
                    st.caption(f"Last Seen: {agent_row['Last Seen']}")
                with c3:
                    with st.expander("Details (Capabilities, Endpoints, Metadata)"):
                        st.caption("Capabilities:")
                        st.code(agent_row['Capabilities'], language=None)
                        st.caption("Endpoints:")
                        st.code(agent_row['Endpoints'], language=None)
                        st.caption("Metadata:")
                        st.code(agent_row['Metadata'], language="json")

                # Conceptual Action Button (not functional without backend)
                # if st.button("Ping Agent", key=f"ping_{agent_row['ID']}", type="secondary"):
                #     with st.spinner(f"Pinging {agent_row['ID']}..."):
                #         ping_response = asyncio.run(send_ping_to_agent(agent_row['ID']))
                #     if ping_response:
                #         if ping_response.get("status") == "pong_received":
                #             st.toast(f"{agent_row['ID']} responded!", icon="✅")
                #         else:
                #             st.toast(f"Ping to {agent_row['ID']} failed: {ping_response.get('message')}", icon="❌")
            st.markdown("---") # Separator between agents

# For mock data if needed
# import random
# import hashlib
