import streamlit as st
from datetime import datetime
from agentpress.db_connection import DBConnection
import asyncio
import json

def format_message_content(content):
    """Format message content handling various formats."""
    try:
        if isinstance(content, str):
            # Try to parse JSON strings
            try:
                parsed = json.loads(content)
                if isinstance(parsed, (dict, list)):
                    return json.dumps(parsed, indent=2)
            except json.JSONDecodeError:
                return content
        elif isinstance(content, list):
            formatted_content = []
            for item in content:
                if item.get('type') == 'text':
                    formatted_content.append(item['text'])
                elif item.get('type') == 'image_url':
                    formatted_content.append("[Image]")
            return "\n".join(formatted_content)
        return json.dumps(content, indent=2)
    except:
        return str(content)

async def load_threads():
    """Load all thread IDs from the database."""
    db = DBConnection()
    rows = await db.fetch_all(
        """
        SELECT id, created_at 
        FROM threads 
        ORDER BY created_at DESC
        """
    )
    return rows

async def load_thread_content(thread_id: str, filters: dict):
    """Load messages from a thread with filters."""
    db = DBConnection()
    
    query_parts = ["SELECT type, content, include_in_llm_message_history, created_at FROM messages WHERE thread_id = ?"]
    params = [thread_id]
    
    if filters.get('message_types'):
        # Convert comma-separated string to list and clean up whitespace
        types_list = [t.strip() for t in filters['message_types'].split(',') if t.strip()]
        if types_list:
            query_parts.append("AND type IN (" + ",".join(["?" for _ in types_list]) + ")")
            params.extend(types_list)
    
    if filters.get('exclude_message_types'):
        # Convert comma-separated string to list and clean up whitespace
        exclude_types_list = [t.strip() for t in filters['exclude_message_types'].split(',') if t.strip()]
        if exclude_types_list:
            query_parts.append("AND type NOT IN (" + ",".join(["?" for _ in exclude_types_list]) + ")")
            params.extend(exclude_types_list)
    
    if filters.get('before_timestamp'):
        query_parts.append("AND created_at < ?")
        params.append(filters['before_timestamp'])
    
    if filters.get('after_timestamp'):
        query_parts.append("AND created_at > ?")
        params.append(filters['after_timestamp'])
    
    if filters.get('include_in_llm_message_history') is not None:
        query_parts.append("AND include_in_llm_message_history = ?")
        params.append(filters['include_in_llm_message_history'])
    
    # Add ordering
    order_direction = "DESC" if filters.get('order', 'asc').lower() == 'desc' else "ASC"
    query_parts.append(f"ORDER BY created_at {order_direction}")
    
    # Add limit and offset
    if filters.get('limit'):
        query_parts.append("LIMIT ?")
        params.append(filters['limit'])
    
    if filters.get('offset'):
        query_parts.append("OFFSET ?")
        params.append(filters['offset'])
    
    query = " ".join(query_parts)
    rows = await db.fetch_all(query, tuple(params))
    return rows

def render_message(msg_type: str, content: str, include_in_llm: bool, timestamp: str):
    """Render a message using Streamlit components."""
    # Message type and metadata
    col1, col2 = st.columns([3, 1])
    with col1:
        st.text(f"Type: {msg_type}")
    with col2:
        st.text("🟢 LLM" if include_in_llm else "⚫ Non-LLM")
    
    # Timestamp
    st.text(f"Time: {datetime.fromisoformat(timestamp).strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Message content
    st.code(content, language="json")
    
    # Separator
    st.divider()

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
        selected_thread_id = thread_options[selected_thread_display]
        
        # Display thread ID in sidebar
        st.sidebar.text(f"Thread ID: {selected_thread_id}")
        
        # Add refresh button
        if st.sidebar.button("🔄 Refresh Thread"):
            st.session_state.threads = asyncio.run(load_threads())
            st.rerun()
        
        # Advanced filtering options in sidebar
        st.sidebar.title("Filter Options")
        
        # Message type filters
        col1, col2 = st.sidebar.columns(2)
        with col1:
            message_types = st.text_input(
                "Include Types",
                help="Enter message types to include, separated by commas"
            )
        with col2:
            exclude_message_types = st.text_input(
                "Exclude Types",
                help="Enter message types to exclude, separated by commas"
            )
        
        # Limit and offset
        col1, col2 = st.sidebar.columns(2)
        with col1:
            limit = st.number_input("Limit", min_value=1, value=50)
        with col2:
            offset = st.number_input("Offset", min_value=0, value=0)
        
        # Timestamp filters
        st.sidebar.subheader("Time Range")
        before_timestamp = st.sidebar.date_input("Before Date", value=None)
        after_timestamp = st.sidebar.date_input("After Date", value=None)
        
        # LLM history filter
        include_in_llm = st.sidebar.radio(
            "LLM History Filter",
            options=["All Messages", "LLM Only", "Non-LLM Only"]
        )
        
        # Sort order
        order = st.sidebar.radio("Sort Order", ["Ascending", "Descending"])
        
        # Prepare filters
        filters = {
            'message_types': message_types if message_types else None,
            'exclude_message_types': exclude_message_types if exclude_message_types else None,
            'limit': limit,
            'offset': offset,
            'order': 'desc' if order == "Descending" else 'asc'
        }
        
        # Add timestamp filters if selected
        if before_timestamp:
            filters['before_timestamp'] = before_timestamp.isoformat()
        if after_timestamp:
            filters['after_timestamp'] = after_timestamp.isoformat()
        
        # Add LLM history filter
        if include_in_llm == "LLM Only":
            filters['include_in_llm_message_history'] = True
        elif include_in_llm == "Non-LLM Only":
            filters['include_in_llm_message_history'] = False
        
        # Load messages with filters
        messages = asyncio.run(load_thread_content(selected_thread_id, filters))
        
        if not messages:
            st.info("No messages found with current filters")
            return
        
        # Display messages
        for msg_type, content, include_in_llm, timestamp in messages:
            formatted_content = format_message_content(content)
            render_message(msg_type, formatted_content, include_in_llm, timestamp)

if __name__ == "__main__":
    main()
