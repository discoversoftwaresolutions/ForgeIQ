# ===================================
# 📁 Dockerfile (for ForgeIQ-ui)
# ===================================
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV STREAMLIT_SERVER_PORT=8501 
# STREAMLIT_SERVER_HEADLESS means "don't open a browser on start"
# STREAMLIT_SERVER_ENABLE_CORS=false is often default and good for production
ENV STREAMLIT_SERVER_HEADLESS=true
ENV STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=true # Good practice

# Copy the SDK directory first if it's co-located and might change less often than app code
# Assuming your 'sdk' directory (with ForgeIQClient etc.) is in the root of this UI repo
COPY ./sdk /app/sdk 

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the Streamlit application files
COPY ./dashboard.py .
COPY ./pages /app/pages/
COPY ./assets /app/assets/ # If you have an assets folder

EXPOSE 8501

# Command to run the Streamlit application
# Railway will inject a $PORT environment variable. Streamlit can use this if configured,
# or Railway will map its $PORT to the EXPOSEd port (8501).
# Using --server.port $PORT is often more direct.
# However, Streamlit uses --server.port without $ by default.
# We set STREAMLIT_SERVER_PORT env var above, which Streamlit should pick up.
CMD ["streamlit", "run", "dashboard.py", "--server.address=0.0.0.0"]
