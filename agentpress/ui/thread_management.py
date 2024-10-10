import streamlit as st
import requests
from agentpress.ui.utils import API_BASE_URL
from datetime import datetime
from agentpress.ui.thread_runner import stop_thread_run, stop_agent_run, get_thread_run_status, get_agent_run_status

def display_thread_management():
    st.subheader("Thread Management")

    if st.button("➕ Create New Thread", key="create_thread_button"):
        create_new_thread()

    display_thread_selector()

    if st.session_state.selected_thread:
        display_run_history(st.session_state.selected_thread)

def create_new_thread():
    response = requests.post(f"{API_BASE_URL}/threads/")
    if response.status_code == 200:
        thread_id = response.json()['thread_id']
        st.session_state.selected_thread = thread_id
        st.success(f"New thread created with ID: {thread_id}")
        st.rerun()
    else:
        st.error("Failed to create a new thread.")

def display_thread_selector():
    threads_response = requests.get(f"{API_BASE_URL}/threads/")
    if threads_response.status_code == 200:
        threads = threads_response.json()
        
        # Sort threads by created_at timestamp (newest first)
        sorted_threads = sorted(threads, key=lambda x: x['created_at'], reverse=True)
        
        thread_options = [f"{thread['thread_id']} - Created: {format_timestamp(thread['created_at'])}" for thread in sorted_threads]

        if st.session_state.selected_thread is None and sorted_threads:
            st.session_state.selected_thread = sorted_threads[0]['thread_id']

        selected_thread = st.selectbox(
            "🔍 Select Thread",
            thread_options,
            key="thread_select",
            index=next((i for i, t in enumerate(sorted_threads) if t['thread_id'] == st.session_state.selected_thread), 0)
        )

        if selected_thread:
            st.session_state.selected_thread = selected_thread.split(' - ')[0]
    else:
        st.error(f"Failed to fetch threads. Status code: {threads_response.status_code}")

def display_run_history(thread_id):
    st.subheader("Run History")
    
    # Fetch thread runs
    thread_runs = fetch_thread_runs(thread_id)
    agent_runs = fetch_agent_runs(thread_id)
    
    # Display thread runs
    st.write("### Thread Runs")
    for run in thread_runs:
        with st.expander(f"Run {run['id']} - Status: {run['status']}"):
            st.write(f"Created At: {format_timestamp(run['created_at'])}")
            st.write(f"Status: {run['status']}")
            
            if run['status'] == "in_progress":
                if st.button(f"Stop Run {run['id']}", key=f"stop_thread_run_{run['id']}"):
                    stop_thread_run(thread_id, run['id'])
                    st.rerun()
            
            if st.button(f"Refresh Status for Run {run['id']}", key=f"refresh_thread_run_{run['id']}"):
                updated_run = get_thread_run_status(thread_id, run['id'])
                if updated_run:
                    run.update(updated_run)
                    st.rerun()
    
    # Display agent runs
    st.write("### Agent Runs")
    for run in agent_runs:
        with st.expander(f"Agent Run {run['id']} - Status: {run['status']}"):
            st.write(f"Created At: {format_timestamp(run['created_at'])}")
            st.write(f"Status: {run['status']}")
            st.write(f"Iterations: {run['iterations_count']} / {run['autonomous_iterations_amount']}")
            
            if run['status'] == "in_progress":
                if st.button(f"Stop Agent Run {run['id']}", key=f"stop_agent_run_{run['id']}"):
                    stop_agent_run(thread_id, run['id'])
                    st.rerun()
            
            if st.button(f"Refresh Status for Agent Run {run['id']}", key=f"refresh_agent_run_{run['id']}"):
                updated_run = get_agent_run_status(thread_id, run['id'])
                if updated_run:
                    run.update(updated_run)
                    st.rerun()

def fetch_thread_runs(thread_id):
    response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/runs")
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Failed to fetch thread runs.")
        return []

def fetch_agent_runs(thread_id):
    response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/agent_runs")
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Failed to fetch agent runs.")
        return []

def format_timestamp(timestamp):
    return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')