import streamlit as st
import requests

st.title("ForgeIQ Agent Overview")
error_input = st.text_area("Paste an error log to analyze")

if st.button("Diagnose"):
    res = requests.post("http://localhost:8000/analyze", json={"error_log": error_input})
    result = res.json()
    st.write(f"🧠 Diagnosis: `{result['diagnosis']}` with confidence `{result['confidence'] * 100:.2f}%`")
