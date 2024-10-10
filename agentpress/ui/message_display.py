import streamlit as st
import requests
from agentpress.ui.utils import API_BASE_URL, AI_MODELS, STANDARD_SYSTEM_MESSAGE
from agentpress.ui.thread_runner import prepare_run_thread_data, run_thread, prepare_run_thread_agent_data, run_thread_agent, display_response_content

def display_messages_and_runner(thread_id):
    st.subheader(f"Messages for Thread: {thread_id}")

    messages = fetch_messages(thread_id)
    display_message_list(messages)
    
    display_add_message_form(thread_id)
    display_run_thread_form(thread_id)
    display_run_agent_form(thread_id)

def fetch_messages(thread_id):
    messages_response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/messages/")
    if messages_response.status_code == 200:
        return messages_response.json()
    else:
        st.error("Failed to fetch messages.")
        return []

def display_message_list(messages):
    for msg in messages:
        with st.chat_message(msg['role']):
            st.write(msg['content'])

def display_add_message_form(thread_id):
    st.write("### Add a New Message")
    with st.form(key="add_message_form"):
        role = st.selectbox("Role", ["user", "assistant"], key="add_role")
        content = st.text_area("Content", key="add_content")
        submitted = st.form_submit_button("Add Message")
        if submitted:
            add_message(thread_id, role, content)

def display_run_thread_form(thread_id):
    st.write("### Run Thread")
    with st.form(key="run_thread_form"):
        model_name = st.selectbox("Model", AI_MODELS, key="model_name")
        temperature = st.slider("Temperature", 0.0, 1.0, 0.5, key="temperature")
        max_tokens = st.number_input("Max Tokens", min_value=1, max_value=10000, value=500, key="max_tokens")
        system_message = st.text_area("System Message", value=STANDARD_SYSTEM_MESSAGE, key="system_message", height=100)
        additional_system_message = st.text_area("Additional System Message", key="additional_system_message", height=100)
        
        tool_options = list(st.session_state.tools.keys())
        selected_tools = st.multiselect("Select Tools", options=tool_options, key="selected_tools")
        
        submitted = st.form_submit_button("Run Thread")
        if submitted:
            run_thread_data = prepare_run_thread_data(
                model_name, temperature, max_tokens, system_message, 
                additional_system_message, selected_tools
            )
            response = run_thread(thread_id, run_thread_data)
            if response:
                st.subheader("Thread Run Response")
                st.json(response)

def display_run_agent_form(thread_id):
    st.write("### Run Agent")
    with st.form(key="run_agent_form"):
        model_name = st.selectbox("Model", AI_MODELS, key="agent_model_name")
        temperature = st.slider("Temperature", 0.0, 1.0, 0.5, key="agent_temperature")
        max_tokens = st.number_input("Max Tokens", min_value=1, max_value=10000, value=500, key="agent_max_tokens")
        system_message = st.text_area("System Message", value=STANDARD_SYSTEM_MESSAGE, key="agent_system_message", height=100)
        additional_system_message = st.text_area("Additional System Message", key="agent_additional_system_message", height=100)
        
        tool_options = list(st.session_state.tools.keys())
        selected_tools = st.multiselect("Select Tools", options=tool_options, key="agent_selected_tools")
        
        autonomous_iterations_amount = st.number_input("Autonomous Iterations", min_value=1, max_value=10, value=3, key="autonomous_iterations_amount")
        continue_instructions = st.text_area("Continue Instructions", key="continue_instructions", height=100, help="Required: Instructions for continuing the conversation in subsequent iterations")
        
        submitted = st.form_submit_button("Run Agent")
        if submitted:
            if not continue_instructions:
                st.error("Continue Instructions are required for running the agent.")
            else:
                run_agent_data = prepare_run_thread_agent_data(
                    model_name, temperature, max_tokens, system_message, 
                    additional_system_message, selected_tools, 
                    autonomous_iterations_amount, continue_instructions
                )
                response = run_thread_agent(thread_id, run_agent_data)
                if response:
                    st.subheader("Agent Run Response")
                    st.json(response)

def add_message(thread_id, role, content):
    message_data = {"role": role, "content": content}
    add_msg_response = requests.post(
        f"{API_BASE_URL}/threads/{thread_id}/messages/",
        json=message_data
    )
    if add_msg_response.status_code == 200:
        st.success("Message added successfully.")
        st.rerun()
    else:
        st.error("Failed to add message.")