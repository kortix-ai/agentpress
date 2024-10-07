import streamlit as st
import requests
from core.ui.utils import API_BASE_URL
from datetime import datetime

def prepare_run_thread_data(model_name, temperature, max_tokens, system_message, additional_system_message, selected_tools):
    return {
        "system_message": {"role": "system", "content": system_message},
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": selected_tools,
        "additional_system_message": additional_system_message
    }

def run_thread(thread_id, run_thread_data):
    with st.spinner("Running thread..."):
        run_thread_response = requests.post(
            f"{API_BASE_URL}/threads/{thread_id}/run/",
            json=run_thread_data
        )
        if run_thread_response.status_code == 200:
            response_data = run_thread_response.json()
            st.success("Thread run completed successfully!")
            
            if 'id' in response_data:
                st.session_state.latest_run_id = response_data['id']
            
            st.subheader("Response Content")
            display_response_content(response_data)
            st.rerun()
        else:
            st.error(f"Failed to run thread. Status code: {run_thread_response.status_code}")
            st.text("Response content:")
            st.text(run_thread_response.text)

def display_response_content(response_data):
    if isinstance(response_data, dict) and 'choices' in response_data:
        message = response_data['choices'][0]['message']
        st.write(f"**Role:** {message['role']}")
        st.write(f"**Content:** {message['content']}")
        
        if 'tool_calls' in message:
            st.write("**Tool Calls:**")
            for tool_call in message['tool_calls']:
                st.write(f"- Function: `{tool_call['function']['name']}`")
                st.code(tool_call['function']['arguments'], language="json")
    else:
        st.json(response_data)

def fetch_thread_runs(thread_id, limit):
    response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/runs?limit={limit}")
    if response.status_code == 200:
        return response.json()
    else:
        st.error("Failed to retrieve runs.")
        return []

def format_timestamp(timestamp):
    if timestamp:
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
    return 'N/A'

def display_runs(runs):
    for run in runs:
        with st.expander(f"Run {run['id']} - Status: {run['status']}", expanded=False):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Created At:** {format_timestamp(run['created_at'])}")
                st.write(f"**Started At:** {format_timestamp(run['started_at'])}")
                st.write(f"**Completed At:** {format_timestamp(run['completed_at'])}")
                st.write(f"**Cancelled At:** {format_timestamp(run['cancelled_at'])}")
                st.write(f"**Failed At:** {format_timestamp(run['failed_at'])}")
            with col2:
                st.write(f"**Model:** {run['model']}")
                st.write(f"**Temperature:** {run['temperature']}")
                st.write(f"**Top P:** {run['top_p']}")
                st.write(f"**Max Tokens:** {run['max_tokens']}")
                st.write(f"**Tool Choice:** {run['tool_choice']}")
                st.write(f"**Execute Tools Async:** {run['execute_tools_async']}")
            
            st.write("**System Message:**")
            st.json(run['system_message'])
            
            if run['tools']:
                st.write("**Tools:**")
                st.json(run['tools'])
            
            if run['usage']:
                st.write("**Usage:**")
                st.json(run['usage'])
            
            if run['response_format']:
                st.write("**Response Format:**")
                st.json(run['response_format'])
            
            if run['last_error']:
                st.error("**Last Error:**")
                st.code(run['last_error'])