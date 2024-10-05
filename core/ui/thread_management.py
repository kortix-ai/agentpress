import streamlit as st
import requests
from core.ui.utils import API_BASE_URL

def display_thread_management():
    col1, col2 = st.columns([1, 2])

    with col1:
        if st.button("➕ Create New Thread"):
            create_new_thread()

    with col2:
        display_thread_selector()

def create_new_thread():
    response = requests.post(f"{API_BASE_URL}/threads/")
    if response.status_code == 200:
        thread_id = response.json()['thread_id']
        st.session_state.selected_thread = thread_id
        st.rerun()
    else:
        st.error("Failed to create a new thread.")

def display_thread_selector():
    threads_response = requests.get(f"{API_BASE_URL}/threads/")
    if threads_response.status_code == 200:
        threads = threads_response.json()
        thread_options = [str(thread['thread_id']) for thread in threads]

        if st.session_state.selected_thread is None and threads:
            st.session_state.selected_thread = str(threads[0]['thread_id'])

        selected_thread = st.selectbox(
            "🔍 Select Thread",
            thread_options,
            key="thread_select",
            index=thread_options.index(str(st.session_state.selected_thread)) if st.session_state.selected_thread else 0
        )

        if selected_thread:
            st.session_state.selected_thread = int(selected_thread)