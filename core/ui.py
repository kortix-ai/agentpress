import streamlit as st
import json
import os
from datetime import datetime

def load_thread_files(threads_dir: str):
    """Load all thread files from the threads directory."""
    thread_files = []
    if os.path.exists(threads_dir):
        for file in os.listdir(threads_dir):
            if file.endswith('.json'):
                thread_files.append(file)
    return thread_files

def load_thread_content(thread_file: str, threads_dir: str):
    """Load the content of a specific thread file."""
    with open(os.path.join(threads_dir, thread_file), 'r') as f:
        return json.load(f)

def format_message_content(content):
    """Format message content handling both string and list formats."""
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        formatted_content = []
        for item in content:
            if item.get('type') == 'text':
                formatted_content.append(item['text'])
            elif item.get('type') == 'image_url':
                formatted_content.append("[Image]")
        return "\n".join(formatted_content)
    return str(content)

def main():
    st.title("Thread Viewer")
    
    # Directory selection in sidebar
    st.sidebar.title("Configuration")
    
    # Initialize session state with default directory
    if 'threads_dir' not in st.session_state:
        default_dir = "./threads"
        if os.path.exists(default_dir):
            st.session_state.threads_dir = default_dir

    # Use Streamlit's file uploader for directory selection
    uploaded_dir = st.sidebar.text_input(
        "Enter threads directory path",
        value="./threads" if not st.session_state.threads_dir else st.session_state.threads_dir,
        placeholder="/path/to/threads",
        help="Enter the full path to your threads directory"
    )

    # Automatically load directory if it exists
    if os.path.exists(uploaded_dir):
        st.session_state.threads_dir = uploaded_dir
    else:
        st.sidebar.error("Directory not found!")
    
    if st.session_state.threads_dir:
        st.sidebar.success(f"Selected directory: {st.session_state.threads_dir}")
        threads_dir = st.session_state.threads_dir
        
        # Thread selection
        st.sidebar.title("Select Thread")
        thread_files = load_thread_files(threads_dir)
        
        if not thread_files:
            st.warning(f"No thread files found in '{threads_dir}'")
            return
        
        selected_thread = st.sidebar.selectbox(
            "Choose a thread file",
            thread_files,
            format_func=lambda x: f"Thread: {x.replace('.json', '')}"
        )
        
        if selected_thread:
            thread_data = load_thread_content(selected_thread, threads_dir)
            messages = thread_data.get("messages", [])
            
            # Display thread ID in sidebar
            st.sidebar.text(f"Thread ID: {selected_thread.replace('.json', '')}")
            
            # Display messages in chat-like interface
            for message in messages:
                role = message.get("role", "unknown")
                content = message.get("content", "")
                
                # Determine avatar based on role
                if role == "assistant":
                    avatar = "🤖"
                elif role == "user":
                    avatar = "👤"
                elif role == "system":
                    avatar = "⚙️"
                elif role == "tool":
                    avatar = "🔧"
                else:
                    avatar = "❓"
                
                # Format the message container
                with st.chat_message(role, avatar=avatar):
                    formatted_content = format_message_content(content)
                    st.markdown(formatted_content)
                    
                    if "tool_calls" in message:
                        st.markdown("**Tool Calls:**")
                        for tool_call in message["tool_calls"]:
                            st.code(
                                f"Function: {tool_call['function']['name']}\n"
                                f"Arguments: {tool_call['function']['arguments']}",
                                language="json"
                            )
    else:
        st.sidebar.warning("Please enter and load a threads directory")

if __name__ == "__main__":
    main()
