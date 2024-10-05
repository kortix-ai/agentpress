import streamlit as st
import requests
from core.ui.utils import API_BASE_URL, AI_MODELS, STANDARD_SYSTEM_MESSAGE

def display_agent_management():
    st.header("Agent Management")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        display_create_agent_form()
    
    with col2:
        display_existing_agents()

def display_create_agent_form():
    st.subheader("Create New Agent")
    with st.form("create_agent_form"):
        new_agent_name = st.text_input("Agent Name")
        new_agent_model = st.selectbox("Model", AI_MODELS)
        new_agent_system_prompt = st.text_area("System Prompt", value=STANDARD_SYSTEM_MESSAGE)
        new_agent_temperature = st.slider("Temperature", 0.0, 1.0, 0.5)
        tool_options = list(st.session_state.tools.keys())
        new_agent_tools = st.multiselect("Tools", tool_options)
        
        submitted = st.form_submit_button("Create Agent")
        if submitted:
            create_agent(new_agent_name, new_agent_model, new_agent_system_prompt, new_agent_temperature, new_agent_tools)

def create_agent(name, model, system_prompt, temperature, tools):
    response = requests.post(f"{API_BASE_URL}/agents/", json={
        "name": name,
        "model": model,
        "system_prompt": system_prompt,
        "temperature": temperature,
        "selected_tools": tools
    })
    if response.status_code == 200:
        st.success("Agent created successfully!")
        st.session_state.fetch_agents()
    else:
        st.error("Failed to create agent.")

def display_existing_agents():
    st.subheader("Existing Agents")
    for agent in st.session_state.agents:
        with st.expander(f"Agent: {agent['name']}"):
            display_agent_details(agent)

def display_agent_details(agent):
    st.write(f"Model: {agent['model']}")
    st.write(f"Temperature: {agent['temperature']}")
    st.write(f"Tools: {', '.join(agent['selected_tools'])}")
    
    if st.button(f"Edit Agent {agent['id']}"):
        st.session_state.editing_agent = agent['id']
    
    if st.button(f"Delete Agent {agent['id']}"):
        delete_agent(agent['id'])
    
    if st.session_state.get('editing_agent') == agent['id']:
        edit_agent_form(agent)

def edit_agent_form(agent):
    with st.form(f"edit_agent_form_{agent['id']}"):
        updated_name = st.text_input("Agent Name", value=agent['name'])
        updated_model = st.selectbox("Model", AI_MODELS, index=AI_MODELS.index(agent['model']))
        updated_system_prompt = st.text_area("System Prompt", value=agent['system_prompt'])
        updated_temperature = st.slider("Temperature", 0.0, 1.0, value=agent['temperature'])
        tool_options = list(st.session_state.tools.keys())
        updated_tools = st.multiselect("Tools", options=tool_options, default=agent['selected_tools'])
        
        if st.form_submit_button("Update Agent"):
            update_agent(agent['id'], updated_name, updated_model, updated_system_prompt, updated_temperature, updated_tools)
            st.session_state.editing_agent = None

def update_agent(agent_id, name, model, system_prompt, temperature, tools):
    response = requests.put(f"{API_BASE_URL}/agents/{agent_id}", json={
        "name": name,
        "model": model,
        "system_prompt": system_prompt,
        "temperature": temperature,
        "selected_tools": tools
    })
    if response.status_code == 200:
        st.success("Agent updated successfully!")
        st.session_state.fetch_agents()
    else:
        st.error("Failed to update agent.")

def delete_agent(agent_id):
    response = requests.delete(f"{API_BASE_URL}/agents/{agent_id}")
    if response.status_code == 200:
        st.success("Agent deleted successfully!")
        st.session_state.fetch_agents()
    else:
        st.error("Failed to delete agent.")