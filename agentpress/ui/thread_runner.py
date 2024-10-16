import streamlit as st
import requests
from agentpress.ui.utils import API_BASE_URL
from datetime import datetime

def prepare_run_thread_data(model_name, temperature, max_tokens, system_message, additional_system_message, selected_tools):
    return {
        "system_message": {"role": "system", "content": system_message},
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": selected_tools,
        "additional_system_message": additional_system_message,
        "tool_choice": "auto"  # Add this line to ensure tool_choice is always set
    }

def prepare_run_thread_agent_data(model_name, temperature, max_tokens, system_message, additional_system_message, selected_tools, autonomous_iterations_amount, continue_instructions):
    return {
        "system_message": {"role": "system", "content": system_message},
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "tools": selected_tools,
        "additional_system_message": additional_system_message,
        "autonomous_iterations_amount": autonomous_iterations_amount,
        "continue_instructions": continue_instructions
    }

def run_thread(thread_id, run_thread_data):
    with st.spinner("Running thread..."):
        try:
            run_thread_response = requests.post(
                f"{API_BASE_URL}/threads/{thread_id}/run/",
                json=run_thread_data
            )
            run_thread_response.raise_for_status()
            response_data = run_thread_response.json()
            st.success(f"Thread run completed successfully! Status: {response_data.get('status', 'Unknown')}")
            
            if 'id' in response_data:
                st.session_state.latest_run_id = response_data['id']
            
            st.subheader("Response Content")
            display_response_content(response_data)
            
            # Display the full response data
            st.subheader("Full Response Data")
            st.json(response_data)
            
            return response_data  # Return the response data
        except requests.exceptions.RequestException as e:
            st.error(f"Failed to run thread. Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                st.text("Response content:")
                st.text(e.response.text)
        except Exception as e:
            st.error(f"An unexpected error occurred: {str(e)}")
        
        return None  # Return None if there was an error

def run_thread_agent(thread_id, run_thread_agent_data):
    with st.spinner("Running thread agent..."):
        try:
            run_thread_response = requests.post(
                f"{API_BASE_URL}/threads/{thread_id}/run_agent/",
                json=run_thread_agent_data
            )
            run_thread_response.raise_for_status()
            response_data = run_thread_response.json()
            st.success(f"Thread agent run completed successfully! Status: {response_data['status']}")
            
            st.subheader("Agent Response")
            display_agent_response_content(response_data)
            
            # Display the full response data
            st.subheader("Full Agent Response Data")
            st.json(response_data)
            
            return response_data
        except requests.exceptions.RequestException as e:
            st.error(f"Failed to run thread agent. Error: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                st.text("Response content:")
                st.text(e.response.text)
        except Exception as e:
            st.error(f"An unexpected error occurred: {str(e)}")

def display_response_content(response_data):
    if isinstance(response_data, dict) and 'choices' in response_data:
        message = response_data['choices'][0]['message']
        st.write(f"**Role:** {message['role']}")
        st.write(f"**Content:** {message['content']}")
        
        if 'tool_calls' in message and message['tool_calls']:
            st.write("**Tool Calls:**")
            for tool_call in message['tool_calls']:
                st.write(f"- Function: `{tool_call['function']['name']}`")
                st.code(tool_call['function']['arguments'], language="json")
    else:
        st.json(response_data)

def display_agent_response_content(response_data):
    st.write(f"**Status:** {response_data['status']}")
    st.write(f"**Total Iterations:** {response_data['total_iterations']}")
    st.write(f"**Completed Iterations:** {response_data.get('iterations_count', 'N/A')}")
    
    for i, iteration in enumerate(response_data['iterations']):
        with st.expander(f"Iteration {i+1}"):
            display_response_content(iteration)
    
    st.write("**Final Configuration:**")
    st.json(response_data['final_config'])

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
                st.write(f"**Autonomous Iterations:** {run['autonomous_iterations_amount']}")
            
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

            if run['continue_instructions']:
                st.write("**Continue Instructions:**")
                st.text(run['continue_instructions'])

            if run['status'] == "in_progress":
                if st.button(f"Stop Run {run['id']}", key=f"stop_button_{run['id']}"):
                    stop_thread_run(run['thread_id'], run['id'])
                    st.rerun()

            if st.button(f"Refresh Status for Run {run['id']}", key=f"refresh_button_{run['id']}"):
                updated_run = get_thread_run_status(run['thread_id'], run['id'])
                if updated_run:
                    run.update(updated_run)
                    st.rerun()

def stop_thread_run(thread_id, run_id):
    response = requests.post(f"{API_BASE_URL}/threads/{thread_id}/runs/{run_id}/stop")
    if response.status_code == 200:
        st.success("Thread run stopped successfully.")
        return response.json()
    else:
        st.error(f"Failed to stop thread run. Status code: {response.status_code}")
        return None

def get_thread_run_status(thread_id, run_id):
    response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/runs/{run_id}/status")
    if response.status_code == 200:
        return response.json()
    else:
        st.error(f"Failed to get thread run status. Status code: {response.status_code}")
        return None
