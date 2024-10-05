import streamlit as st
import requests
from core.ui.utils import API_BASE_URL

def display_tools():
    st.header("Available Tools")
    
    tools = fetch_tools()
    
    if not tools:
        st.warning("No tools available. Please check the API connection.")
        return

    view_mode = st.radio("View Mode", ["Simple", "Detailed"])

    if view_mode == "Simple":
        display_simple_view(tools)
    else:
        display_detailed_view(tools)

def display_simple_view(tools):
    for tool_name, tool_info in tools.items():
        with st.expander(f"🛠️ {tool_name}"):
            st.write(f"**Description:** {tool_info['description']}")

def display_detailed_view(tools):
    for tool_name, tool_info in tools.items():
        with st.expander(f"🛠️ {tool_name}"):
            st.write(f"**Description:** {tool_info['description']}")
            if tool_info['schema']:
                st.write("**Schema:**")
                st.json(tool_info['schema'])

def fetch_tools():
    response = requests.get(f"{API_BASE_URL}/tools/")
    if response.status_code == 200:
        tools = response.json()
        st.session_state.tools = tools
        return tools
    else:
        st.error(f"Failed to fetch tools. Status code: {response.status_code}")
        st.error(f"Error message: {response.text}")
        return {}