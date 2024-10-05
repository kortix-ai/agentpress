import streamlit as st
from core.ui.thread_management import display_thread_management
from core.ui.message_display import display_messages
from core.ui.thread_runner import display_thread_runner
from core.ui.agent_management import display_agent_management
from core.ui.tool_display import display_tools
from core.ui.utils import initialize_session_state, fetch_data

def main():
    initialize_session_state()
    fetch_data()

    st.sidebar.title("Navigation")
    mode = st.sidebar.radio("Select Mode", ["Agent Management", "Thread Management", "Tools"])

    st.title("AI Assistant Management System")

    if mode == "Agent Management":
        display_agent_management()
    elif mode == "Tools":
        display_tools()
    else:  # Thread Management
        display_thread_management_content()

def display_thread_management_content():
    st.header("Thread Management")
    display_thread_management()

    if st.session_state.selected_thread:
        display_messages(st.session_state.selected_thread)
        display_thread_runner(st.session_state.selected_thread)

if __name__ == "__main__":
    main()