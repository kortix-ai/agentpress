import streamlit as st
import requests
from core.ui.utils import API_BASE_URL
from datetime import datetime

def display_thread_management():
    st.subheader("Thread Management")

    if st.button("➕ Create New Thread", key="create_thread_button"):
        create_new_thread()

    display_thread_selector()

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
        
        # Sort threads by creation date if available, otherwise by thread_id
        def sort_key(thread):
            if 'creation_date' in thread:
                try:
                    return datetime.strptime(thread['creation_date'], "%Y-%m-%d %H:%M:%S")
                except ValueError:
                    st.warning(f"Invalid date format for thread {thread['thread_id']}")
            return thread['thread_id']
        
        sorted_threads = sorted(threads, key=sort_key, reverse=True)
        
        thread_options = []
        for thread in sorted_threads:
            if 'creation_date' in thread:
                thread_options.append(f"{thread['thread_id']} - Created: {thread['creation_date']}")
            else:
                thread_options.append(thread['thread_id'])

        if st.session_state.selected_thread is None and sorted_threads:
            st.session_state.selected_thread = sorted_threads[0]['thread_id']

        selected_thread = st.selectbox(
            "🔍 Select Thread",
            thread_options,
            key="thread_select",
            index=next((i for i, t in enumerate(sorted_threads) if t['thread_id'] == st.session_state.selected_thread), 0)
        )

        if selected_thread:
            st.session_state.selected_thread = selected_thread.split(' - ')[0] if ' - ' in selected_thread else selected_thread
    else:
        st.error(f"Failed to fetch threads. Status code: {threads_response.status_code}")