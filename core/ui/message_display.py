import streamlit as st
import requests
import json
from core.ui.utils import API_BASE_URL

def display_messages(thread_id):
    st.subheader(f"🧵 Thread ID: {thread_id}")
    # st.write("### 📝 Messages")

    messages = fetch_messages(thread_id)
    display_message_json(messages)
    display_message_list(messages)
    display_add_message_form(thread_id)

def fetch_messages(thread_id):
    messages_response = requests.get(f"{API_BASE_URL}/threads/{thread_id}/messages/")
    if messages_response.status_code == 200:
        return messages_response.json()
    else:
        st.error("Failed to fetch messages.")
        return []

def display_message_json(messages):
    if st.button("Show/Hide JSON"):
        st.session_state.show_json = not st.session_state.get('show_json', False)

    if st.session_state.get('show_json', False):
        json_str = json.dumps(messages, indent=2)
        st.code(json_str, language="json")

def display_message_list(messages):
    for msg in messages:
        with st.chat_message(msg['role']):
            st.write(msg['content'])

def display_add_message_form(thread_id):
    st.write("### ➕ Add a New Message")
    with st.form(key="add_message_form"):
        role = st.selectbox("🔹 Role", ["user", "assistant"], key="add_role")
        content = st.text_area("📝 Content", key="add_content")
        submitted = st.form_submit_button("➕ Add Message")
        if submitted:
            add_message(thread_id, role, content)

def add_message(thread_id, role, content):
    message_data = {"role": role, "content": content}
    add_msg_response = requests.post(
        f"{API_BASE_URL}/threads/{thread_id}/messages/",
        json=message_data
    )
    if add_msg_response.status_code == 200:
        st.rerun()
    else:
        st.error("Failed to add message.")