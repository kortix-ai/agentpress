-- Create projects table
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create threads table
CREATE TABLE threads (
    thread_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create messages table
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    is_llm_message BOOLEAN NOT NULL DEFAULT TRUE,
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create agent_runs table
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id),
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_threads_updated_at
    BEFORE UPDATE ON threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at
    BEFORE UPDATE ON agent_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_threads_created_at ON threads(created_at);
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_threads_project_id ON threads(project_id);
CREATE INDEX idx_agent_runs_thread_id ON agent_runs(thread_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Project policies
CREATE POLICY project_select_policy ON projects
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY project_insert_policy ON projects
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY project_update_policy ON projects
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY project_delete_policy ON projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- Thread policies based on project ownership
CREATE POLICY thread_select_policy ON threads
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = threads.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_insert_policy ON threads
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = threads.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_update_policy ON threads
    FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = threads.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_delete_policy ON threads
    FOR DELETE
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = threads.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Create policies for agent_runs based on thread ownership
CREATE POLICY agent_run_select_policy ON agent_runs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM threads
            JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_insert_policy ON agent_runs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_update_policy ON agent_runs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_delete_policy ON agent_runs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

-- Create message policies based on thread ownership
CREATE POLICY message_select_policy ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = messages.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_insert_policy ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = messages.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_update_policy ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = messages.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_delete_policy ON messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON threads.project_id = projects.project_id
            WHERE threads.thread_id = messages.thread_id
            AND (
                threads.user_id = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

-- Grant permissions to roles
GRANT ALL PRIVILEGES ON TABLE projects TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE threads TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE messages TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE agent_runs TO authenticated, service_role;

-- Create a function that matches the Python get_messages behavior
CREATE OR REPLACE FUNCTION get_llm_formatted_messages(p_thread_id UUID)
RETURNS JSONB
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
DECLARE
    messages_array JSONB := '[]'::JSONB;
BEGIN
    -- Check if thread exists
    IF NOT EXISTS (
        SELECT 1 FROM threads t
        WHERE t.thread_id = p_thread_id
    ) THEN
        RAISE EXCEPTION 'Thread not found';
    END IF;

    -- Parse content if it's stored as a string and return proper JSON objects
    WITH parsed_messages AS (
        SELECT 
            CASE 
                WHEN jsonb_typeof(content) = 'string' THEN content::text::jsonb
                ELSE content
            END AS parsed_content,
            created_at
        FROM messages
        WHERE thread_id = p_thread_id
        AND is_llm_message = TRUE
    ),
    -- Process each message to ensure tool_calls function arguments are strings
    processed_messages AS (
        SELECT 
            CASE 
                -- When the message has tool_calls
                WHEN jsonb_path_exists(parsed_content, '$.tool_calls') THEN 
                    (
                        WITH tool_calls AS (
                            -- Extract and process each tool call
                            SELECT 
                                jsonb_array_elements(parsed_content -> 'tool_calls') AS tool_call,
                                i AS idx
                            FROM generate_series(0, jsonb_array_length(parsed_content -> 'tool_calls') - 1) AS i
                        ),
                        processed_tool_calls AS (
                            SELECT 
                                idx,
                                CASE 
                                    -- If function arguments exist and is not a string, convert to JSON string
                                    WHEN jsonb_path_exists(tool_call, '$.function.arguments') 
                                         AND jsonb_typeof(tool_call #> '{function,arguments}') != 'string' THEN
                                        jsonb_set(
                                            tool_call, 
                                            '{function,arguments}', 
                                            to_jsonb(tool_call #>> '{function,arguments}')
                                        )
                                    ELSE tool_call
                                END AS processed_tool_call
                            FROM tool_calls
                        ),
                        -- Convert processed tool calls back to an array
                        tool_calls_array AS (
                            SELECT jsonb_agg(processed_tool_call ORDER BY idx) AS tool_calls_array
                            FROM processed_tool_calls
                        )
                        -- Replace tool_calls in the original message
                        SELECT jsonb_set(parsed_content, '{tool_calls}', tool_calls_array)
                        FROM tool_calls_array
                    )
                ELSE parsed_content
            END AS final_content,
            created_at
        FROM parsed_messages
    )
    -- Aggregate messages into an array
    SELECT JSONB_AGG(final_content ORDER BY created_at)
    INTO messages_array
    FROM processed_messages;
    
    -- Handle the case when no messages are found
    IF messages_array IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;
    
    RETURN messages_array;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_llm_formatted_messages TO authenticated, service_role;