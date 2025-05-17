# =====================================
# 📁 dashboard.py (ForgeIQ-ui main app)
# =====================================
import streamlit as st
import os
import logging # Standard Python logging
import asyncio # For running async SDK calls if needed from sync context
from typing import Optional, Dict, Any # For type hints

# --- Page Configuration (Must be the first Streamlit command) ---
st.set_page_config(
    page_title="ForgeIQ Dashboard",
    page_icon="🛠️", 
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': None, # Replace with actual links or remove
        'Report a bug': None,
        'About': """
        ## ForgeIQ Agentic Build System Dashboard
        Monitor and interact with your ForgeIQ services and agents.
        Version 2.0 (Streamlit Edition)
        """
    }
)

# --- Logging Setup for Streamlit App ---
# Using standard Python logging. SDK and other modules will use this if configured.
LOG_LEVEL_STR = os.getenv("LOG_LEVEL", "INFO").upper()
numeric_log_level = getattr(logging, LOG_LEVEL_STR, logging.INFO)

# Configure root logger - Streamlit might have its own handling,
# but this helps ensure our SDK/app logs are formatted if they don't have handlers.
# For more control, get specific loggers: logger = logging.getLogger("dashboard_app")
logging.basicConfig(
    level=numeric_log_level,
    format='%(asctime)s [%(levelname)-8s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    # stream=sys.stderr # Default for basicConfig
)
dashboard_logger = logging.getLogger(__name__) # Logger for this specific dashboard app

# --- SDK Client Initialization & Management ---
# This assumes your 'sdk' directory (with client.py, models.py etc.) is in the root of this UI repo
# and thus importable.
try:
    from sdk.client import ForgeIQClient
    from sdk.exceptions import APIError, AuthenticationError, ForgeIQSDKError
except ImportError as e:
    dashboard_logger.critical(f"Failed to import ForgeIQ SDK modules: {e}. Ensure 'sdk' directory is present and in PYTHONPATH.")
    st.error("A critical error occurred: ForgeIQ SDK could not be loaded. Please check application configuration.")
    st.stop()


def get_sdk_client() -> Optional[ForgeIQClient]:
    """Initializes and returns a ForgeIQClient instance, stored in session state."""
    if 'forgeiq_sdk_client' not in st.session_state:
        api_base_url = os.getenv("FORGEIQ_API_BASE_URL")
        api_key = os.getenv("FORGEIQ_API_KEY") # Optional

        if not api_base_url:
            # Default for local dev if ForgeIQ-backend (Python/FastAPI) runs on 8000
            api_base_url_default = "http://localhost:8000" 
            dashboard_logger.warning(f"FORGEIQ_API_BASE_URL not set, defaulting to {api_base_url_default} for UI.")
            api_base_url = api_base_url_default

        try:
            # hook_manager could be initialized here if UI needs to register client-side hooks
            st.session_state.forgeiq_sdk_client = ForgeIQClient(base_url=api_base_url, api_key=api_key)
            dashboard_logger.info(f"ForgeIQ SDK Client initialized for UI, targeting: {api_base_url}")
        except ValueError as ve:
            st.error(f"SDK Initialization Error: {ve}. Please check FORGEIQ_API_BASE_URL.")
            st.session_state.forgeiq_sdk_client = None
        except Exception as e:
            st.error(f"An unexpected error occurred initializing SDK client: {e}")
            dashboard_logger.error("SDK Client init error in Streamlit app", exc_info=True)
            st.session_state.forgeiq_sdk_client = None

    return st.session_state.forgeiq_sdk_client

# Initialize client once
client = get_sdk_client()

# --- Main Page / Entry Point Content ---
# This dashboard.py serves as the landing page.
# Streamlit automatically creates navigation from files in the 'pages/' directory.

st.title("🛠️ ForgeIQ - Agentic Build System")
st.markdown("Welcome! Use the sidebar to navigate through the system's capabilities.")
st.markdown("---")

if not client:
    st.error("ForgeIQ Backend connection not established. Please ensure the backend is running and UI is correctly configured.")
    st.warning("Most dashboard features will be unavailable.")
    st.stop() # Stop further rendering if client failed to init

st.subheader("System Health At a Glance")

# Health check function (async, cached)
@st.cache_data(ttl=30) # Cache for 30 seconds
async def fetch_backend_health(sdk_client: ForgeIQClient) -> Dict[str, Any]:
    if not sdk_client:
        return {"status": "SDK Client Not Initialized"}
    try:
        dashboard_logger.info("UI: Fetching backend health...")
        # Assuming the Python SDK's _request method can be used or it has a dedicated health method
        health_data = await sdk_client._request("GET", "/api/health") 
        dashboard_logger.info(f"UI: Backend health response: {health_data}")
        return health_data
    except APIError as e:
        dashboard_logger.error(f"UI: API Error fetching backend health: {e}")
        return {"status": "API Error", "message": str(e), "details": e.error_body}
    except ForgeIQSDKError as e: # Catch other SDK errors
        dashboard_logger.error(f"UI: SDK Error fetching backend health: {e}")
        return {"status": "SDK Error", "message": str(e)}
    except Exception as e:
        dashboard_logger.error(f"UI: Unexpected error fetching backend health: {e}", exc_info=True)
        return {"status": "Error", "message": "Could not connect or unknown error."}

# Run the async function to get data for display
# Streamlit handles the event loop for functions decorated with @st.cache_data or @st.cache_resource
health_status_data = asyncio.run(fetch_backend_health(client)) # Run async function

if health_status_data:
    backend_status = health_status_data.get("status", "Unknown")
    redis_status = health_status_data.get("redis_event_bus_status", "Unknown")

    col1, col2 = st.columns(2)
    with col1:
        if "healthy" in backend_status.lower():
            st.success(f"ForgeIQ Backend: **{backend_status}**")
        else:
            st.error(f"ForgeIQ Backend: **{backend_status}** (Message: {health_status_data.get('message', 'N/A')})")
    with col2:
        if redis_status == "connected":
            st.success(f"Redis Connection: **{redis_status}**")
        else:
            st.warning(f"Redis Connection: **{redis_status}**")
else:
    st.warning("Could not retrieve backend health status.")


st.markdown("---")
st.write("Select a section from the sidebar to view detailed information or perform actions.")

# Example of how to properly close client on Streamlit app exit (not straightforward with script-based exit)
# Streamlit doesn't have a direct "on_exit" hook easily accessible for async cleanup.
# The httpx.AsyncClient used by the SDK will close itself when garbage collected if not explicitly closed,
# but explicit close is best. This is a known challenge in Streamlit for resource cleanup.
# For Railway deployment, container shutdown will handle it.
