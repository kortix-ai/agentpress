import streamlit as st
import requests
from core.constants import AI_MODELS, STANDARD_SYSTEM_MESSAGE

API_BASE_URL = "http://localhost:8000"

def fetch_tools():
    response = requests.get(f"{API_BASE_URL}/tools/")
    if response.status_code == 200:
        st.session_state.tools = response.json()
    else:
        st.error("Failed to fetch tools.")

def initialize_session_state():
    if 'selected_thread' not in st.session_state:
        st.session_state.selected_thread = None
    if 'tools' not in st.session_state:
        st.session_state.tools = []
    if 'fetch_tools' not in st.session_state:
        st.session_state.fetch_tools = fetch_tools

def fetch_data():
    fetch_tools()