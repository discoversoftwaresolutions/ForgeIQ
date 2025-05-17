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

# Good practice: Enable XSRF protection for the server
ENV STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=true

# Copy the SDK directory first if it's co-located and might change less often than app code
# Assuming your 'sdk' directory (with ForgeIQClient etc.) is in the root of this UI repo
COPY ./sdk /app/sdk 

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the Streamlit application files
COPY ./dashboard.py .
COPY ./pages /app/pages/

# Optional: Copy the assets folder if available in the build context.
# If you do have an assets folder, uncomment the next line and make sure the folder exists.
# COPY ./assets /app/assets/
# Otherwise, create an empty assets folder in the image.
RUN mkdir -p /app/assets

EXPOSE 8501

# Command to run the Streamlit application
CMD ["streamlit", "run", "dashboard.py", "--server.address=0.0.0.0"]
