import streamlit as st
from core.ui.thread_management import display_thread_management
from core.ui.message_display import display_messages_and_runner
from core.ui.thread_runner import fetch_thread_runs, display_runs
from core.ui.tool_display import display_tools
from core.ui.utils import initialize_session_state, fetch_data, API_BASE_URL

def main():
    initialize_session_state()
    fetch_data()

    st.set_page_config(page_title="AI Assistant Management System", layout="wide")

    st.sidebar.title("Navigation")
    mode = st.sidebar.radio("Select Mode", ["Thread Management", "Tools"])

    st.title("AI Assistant Management System")

    if mode == "Tools":
        display_tools()
    else:  # Thread Management
        display_thread_management_content()

def display_thread_management_content():
    col1, col2 = st.columns([1, 3])
    
    with col1:
        display_thread_management()
        if st.session_state.selected_thread:
            display_thread_runner(st.session_state.selected_thread)
    
    with col2:
        if st.session_state.selected_thread:
            display_messages_and_runner(st.session_state.selected_thread)

def display_thread_runner(thread_id):
    st.subheader("Thread Runs")
    
    limit = st.number_input("Number of runs to retrieve", min_value=1, max_value=100, value=20)
    if st.button("Fetch Runs"):
        runs = fetch_thread_runs(thread_id, limit)
        display_runs(runs)

if __name__ == "__main__":
    main()