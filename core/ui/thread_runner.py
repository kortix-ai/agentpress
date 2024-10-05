import streamlit as st
import requests
import json
from core.ui.utils import API_BASE_URL, AI_MODELS, STANDARD_SYSTEM_MESSAGE

def display_thread_runner(thread_id):
    st.write("## ⚙️ Run Thread")
    
    manual_config = display_manual_setup_tab()
    
    # Common settings
    additional_instructions = st.text_area("Additional Instructions", key="additional_instructions", height=100)
    stream = st.checkbox("📡 Stream Responses", key="stream_responses")

    # Prepare the run thread data
    run_thread_data = prepare_run_thread_data(manual_config, additional_instructions, stream)

    # Display the preview of the request payload in an expander
    with st.expander("📤 Preview Request Payload", expanded=False):
        st.json(run_thread_data)

    # Center the run button and make it more prominent
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if st.button("▶️ Run Thread", key="run_thread_button", use_container_width=True):
            run_thread(thread_id, run_thread_data)

    display_thread_run_status(thread_id)

def display_manual_setup_tab():
    model_name = st.selectbox("Model", AI_MODELS, key="model_name")
    
    col1, col2 = st.columns(2)
    with col1:
        temperature = st.slider("Temperature", 0.0, 1.0, 0.5, key="temperature")
    with col2:
        max_tokens = st.number_input("Max Tokens", min_value=1, max_value=10000, value=500, key="max_tokens")
    
    system_message = st.text_area("System Message", value=STANDARD_SYSTEM_MESSAGE, key="system_message", height=100)
    
    tool_options = list(st.session_state.tools.keys())
    selected_tools = st.multiselect("Select Tools", options=tool_options, key="selected_tools")

    manual_config = {
        "model_name": model_name,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "system_message": system_message,
        "selected_tools": selected_tools
    }

    return manual_config

def prepare_run_thread_data(manual_config, additional_instructions, stream):
    tools = [st.session_state.tools[tool]['schema'] for tool in manual_config['selected_tools'] if tool in st.session_state.tools]
    return {
        "system_message": {"role": "system", "content": manual_config['system_message']},
        "model_name": manual_config['model_name'],
        "temperature": manual_config['temperature'],
        "max_tokens": manual_config['max_tokens'],
        "tools": tools,
        "additional_instructions": additional_instructions,
        "stream": stream
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
            
            # Display the return payload in an expander
            with st.expander("📥 Return Payload", expanded=False):
                st.json(response_data)
            
            # Display the actual response content
            st.write("### 📬 Response Content")
            display_response_content(response_data)
            
            st.rerun()
        else:
            st.error("Failed to run thread.")
            with st.expander("❌ Error Response", expanded=True):
                st.json(run_thread_response.json())

def display_response_content(response_data):
    if isinstance(response_data, dict) and 'response' in response_data:
        for item in response_data['response']:
            if isinstance(item, dict):
                if 'content' in item:
                    st.markdown(item['content'])
                elif 'tool_calls' in item:
                    st.write("**Tool Calls:**")
                    for tool_call in item['tool_calls']:
                        st.write(f"- Function: `{tool_call['function']['name']}`")
                        st.code(tool_call['function']['arguments'], language="json")
            elif isinstance(item, str):
                st.markdown(item)
    else:
        st.json(response_data)

def display_thread_run_status(thread_id):
    status_response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/run/status/")
    if status_response.status_code == 200:
        status_data = status_response.json()
        st.write("### ⚙️ Thread Run Status")
        status = status_data.get('status')
        if status == 'completed':
            st.success(f"**Status:** {status}")
        elif status == 'error':
            st.error(f"**Status:** {status}")
            with st.expander("Error Details", expanded=True):
                st.code(status_data.get('error_message'), language="")
        else:
            st.info(f"**Status:** {status}")
    else:
        st.warning("Could not retrieve thread run status.")