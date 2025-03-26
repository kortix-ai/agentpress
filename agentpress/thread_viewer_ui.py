import streamlit as st
from datetime import datetime
from agentpress.thread_manager import ThreadManager
from agentpress.db_connection import DBConnection
import asyncio

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

async def load_threads():
    """Load all thread IDs from the database."""
    db = DBConnection()
    prisma = await db.prisma
    threads = await prisma.thread.find_many(
        order={
            'createdAt': 'desc'
        }
    )
    return [(thread.id, thread.createdAt) for thread in threads]

async def load_thread_content(thread_id: str):
    """Load the content of a specific thread from the database."""
    thread_manager = ThreadManager()
    return await thread_manager.get_messages(thread_id)

def render_message(role, content, avatar):
    """Render a message with a consistent chat-like style."""
    # Create columns for avatar and message
    col1, col2 = st.columns([1, 11])
    
    # Style based on role
    if role == "assistant":
        bgcolor = "rgba(25, 25, 25, 0.05)"
    elif role == "user":
        bgcolor = "rgba(25, 120, 180, 0.05)"
    elif role == "system":
        bgcolor = "rgba(180, 25, 25, 0.05)"
    else:
        bgcolor = "rgba(100, 100, 100, 0.05)"
    
    # Display avatar in first column
    with col1:
        st.markdown(f"<div style='text-align: center; font-size: 24px;'>{avatar}</div>", unsafe_allow_html=True)
    
    # Display message in second column
    with col2:
        st.markdown(
            f"""
            <div style='background-color: {bgcolor}; padding: 10px; border-radius: 5px;'>
                <strong>{role.upper()}</strong><br>
                {content}
            </div>
            """,
            unsafe_allow_html=True
        )

def main():
    st.title("Thread Viewer")
    
    # Initialize thread data in session state
    if 'threads' not in st.session_state:
        st.session_state.threads = asyncio.run(load_threads())
    
    # Thread selection in sidebar
    st.sidebar.title("Select Thread")
    
    if not st.session_state.threads:
        st.warning("No threads found in database")
        return
    
    # Format thread options with creation date
    thread_options = {
        f"{row[0]} ({datetime.fromisoformat(row[1]).strftime('%Y-%m-%d %H:%M')})"
        : row[0] for row in st.session_state.threads
    }
    
    selected_thread_display = st.sidebar.selectbox(
        "Choose a thread",
        options=list(thread_options.keys()),
    )
    
    if selected_thread_display:
        # Get the actual thread ID from the display string
        selected_thread_id = thread_options[selected_thread_display]
        
        # Display thread ID in sidebar
        st.sidebar.text(f"Thread ID: {selected_thread_id}")
        
        # Add refresh button
        if st.sidebar.button("🔄 Refresh Thread"):
            st.session_state.threads = asyncio.run(load_threads())
            st.experimental_rerun()
        
        # Load and display messages
        messages = asyncio.run(load_thread_content(selected_thread_id))
        
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
            
            # Format the content
            formatted_content = format_message_content(content)
            
            # Render the message
            render_message(role, formatted_content, avatar)
            
            # Display tool calls if present
            if "tool_calls" in message:
                with st.expander("🛠️ Tool Calls"):
                    for tool_call in message["tool_calls"]:
                        st.code(
                            f"Function: {tool_call['function']['name']}\n"
                            f"Arguments: {tool_call['function']['arguments']}",
                            language="json"
                        )
            
            # Add some spacing between messages
            st.markdown("<br>", unsafe_allow_html=True)

if __name__ == "__main__":
    main()
