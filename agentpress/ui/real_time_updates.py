import streamlit as st
import time
import requests
from agentpress.ui.utils import API_BASE_URL

def get_run_status(thread_id, run_id, is_agent_run):
    endpoint = f"agent_runs" if is_agent_run else f"runs"
    response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/{endpoint}/{run_id}/status")
    if response.status_code == 200:
        return response.json()
    return None

def real_time_status_update(thread_id, run_id, is_agent_run):
    status_placeholder = st.empty()
    while True:
        status = get_run_status(thread_id, run_id, is_agent_run)
        if status:
            status_placeholder.write(f"Current status: {status['status']}")
            if status['status'] in ['completed', 'failed', 'cancelled']:
                break
        time.sleep(1)
    return status