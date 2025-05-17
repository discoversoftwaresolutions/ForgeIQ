# =====================================
# 📁 dashboard.py (ForgeIQ-ui main app)
# =====================================
import streamlit as st
import os
import logging
from typing import Optional

# --- SDK Client Setup ---
# This assumes your SDK package 'sdk' is in the PYTHONPATH
# Or, if you install it as a package: from forgeiq_sdk import ForgeIQClient, HookManager, etc.
# For now, let's assume the sdk directory can be imported if PYTHONPATH is set appropriately.
try:
    from sdk.client import ForgeIQClient # Assuming top-level 'sdk' directory
    from sdk.exceptions import APIError, AuthenticationError
except ImportError:
    st.error("ForgeIQ SDK not found. Please ensure it's installed and accessible in PYTHONPATH.")
    st.stop() # Stop execution if SDK is missing

# --- Page Configuration (Must be the first Streamlit command) ---
st.set_page_config(
    page_title="ForgeIQ System Dashboard",
    page_icon="🛠️", # Example emoji
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': 'mailto:support@example.com', # Replace with your support
        'Report a bug': "mailto:bugs@example.com", # Replace
        'About': "# ForgeIQ Agentic Build System Dashboard\nThis is a dashboard to monitor and interact with the ForgeIQ system."
    }
)

# --- Logging Setup for Streamlit App ---
# Streamlit has its own way of handling logs, but we can configure our modules' loggers
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
numeric_log_level = getattr(logging, LOG_LEVEL, logging.INFO)
# Configure for libraries used by the dashboard (like the SDK)
logging.basicConfig(
    level=numeric_log_level,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__) # Logger for this dashboard app

# --- SDK Client Initialization ---
# Store client in session state to persist across reruns and pages
if 'forgeiq_sdk_client' not in st.session_state:
    api_base_url = os.getenv("FORGEIQ_API_BASE_URL")
    api_key = os.getenv("FORGEIQ_API_KEY") # Optional

    if not api_base_url:
        st.error("CRITICAL: FORGEIQ_API_BASE_URL environment variable is not set for the UI. Cannot connect to backend.")
        # For local dev, you might default to something like "http://localhost:8000" (FastAPI default)
        # if your ForgeIQ-backend (Python/FastAPI) runs on port 8000.
        # Our Node.js ForgeIQ-backend was on port 3002, Python on 8000.
        # Let's assume the Python ForgeIQ-backend from response #70 is target on port 8000.
        api_base_url_default = "http://localhost:8000" # Default if ForgeIQ-Backend (Python) runs on 8000
        logger.warning(f"FORGEIQ_API_BASE_URL not set, defaulting to {api_base_url_default} for UI.")
        api_base_url = api_base_url_default 
        # st.stop() # Or stop execution

    try:
        st.session_state.forgeiq_sdk_client = ForgeIQClient(base_url=api_base_url, api_key=api_key)
        logger.info(f"ForgeIQ SDK Client initialized for UI, targeting: {api_base_url}")
    except ValueError as e: # Catch ValueError from ForgeIQClient if base_url is still an issue
        st.error(f"Failed to initialize SDK client: {e}")
        st.stop()
    except Exception as e:
        st.error(f"An unexpected error occurred initializing SDK client: {e}")
        logger.error("SDK Client init error in Streamlit app", exc_info=True)
        st.stop()

# --- Main Page Content (Acts as the default page or can redirect) ---
# Streamlit's new st.navigation feature can be used here if preferred over pages/ dir for simpler apps
# For now, we assume the pages/ directory structure for multi-page app.
# This main dashboard.py will be the first page listed in the navigation.

st.title("🛠️ ForgeIQ System Dashboard")
st.markdown("Welcome to the central monitoring and interaction hub for the ForgeIQ Agentic Build System.")
st.markdown("---")

st.subheader("Quick Links")
cols = st.columns(3)
with cols[0]:
    if st.button("🚀 View Pipelines & Builds"):
        st.switch_page("pages/3_Pipelines_and_Builds.py")
with cols[1]:
    if st.button("🚢 View Deployments"):
        st.switch_page("pages/4_Deployments.py")
with cols[2]:
    if st.button("🤖 View Agent Status"):
        st.switch_page("pages/5_Agents_Status.py")

st.markdown("---")
st.info("Use the sidebar navigation to explore different aspects of the system.")

# You can add a high-level summary or key metrics directly on this main page too,
# similar to what would be on the "Overview" page.
# For example, fetching system health:

# @st.cache_data(ttl=60) # Cache for 60 seconds
# async def get_backend_health():
#     try:
#         if 'forgeiq_sdk_client' in st.session_state and st.session_state.forgeiq_sdk_client:
#             # The SDK methods should be async. Streamlit handles running async functions.
#             # Assuming your SDK client's methods are async and ForgeIQ-backend has /api/health
#             # We need a generic health check method in the SDK or call the endpoint directly.
#             health_data = await st.session_state.forgeiq_sdk_client._request("GET", "/api/health")
#             return health_data
#     except APIError as e:
#         logger.error(f"API Error fetching backend health: {e}")
#         return {"status": "API Error", "message": str(e)}
#     except Exception as e:
#         logger.error(f"Error fetching backend health: {e}", exc_info=True)
#         return {"status": "Error", "message": "Could not connect or unknown error."}

# health_status = asyncio.run(get_backend_health()) # Streamlit runs async functions directly now

# if health_status:
#     st.subheader("System Status")
#     if health_status.get("status", "").startswith("ForgeIQ Backend (Python/FastAPI) is healthy"):
#         st.success(f"ForgeIQ Backend: Healthy (Redis: {health_status.get('redis_event_bus_status', 'unknown')})")
#     else:
#         st.error(f"ForgeIQ Backend: Unhealthy or error - {health_status.get('message', 'No details')}")
# else:
#     st.warning("Could not retrieve backend health status.")

# To run this app, navigate to its repository root in your terminal and run:
# streamlit run dashboard.py
# Ensure necessary environment variables like FORGEIQ_API_BASE_URL are set.
