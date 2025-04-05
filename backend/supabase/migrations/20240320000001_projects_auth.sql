-- Create projects table
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger for updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_metadata ON projects USING gin (metadata);

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

-- Thread policies based on metadata
CREATE POLICY thread_select_policy ON threads
    FOR SELECT
    USING (
        auth.uid() = (metadata->>'user_id')::UUID OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = (threads.metadata->>'project_id')::UUID
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_insert_policy ON threads
    FOR INSERT
    WITH CHECK (
        auth.uid() = (metadata->>'user_id')::UUID OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = (threads.metadata->>'project_id')::UUID
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_update_policy ON threads
    FOR UPDATE
    USING (
        auth.uid() = (metadata->>'user_id')::UUID OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = (threads.metadata->>'project_id')::UUID
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY thread_delete_policy ON threads
    FOR DELETE
    USING (
        auth.uid() = (metadata->>'user_id')::UUID OR 
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = (threads.metadata->>'project_id')::UUID
            AND projects.user_id = auth.uid()
        )
    );

-- Message policies based on thread ownership
CREATE POLICY message_select_policy ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = messages.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_insert_policy ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = messages.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_update_policy ON messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = messages.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY message_delete_policy ON messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = messages.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

-- Create policies for agent_runs based on thread metadata
CREATE POLICY agent_run_select_policy ON agent_runs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_insert_policy ON agent_runs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_update_policy ON agent_runs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

CREATE POLICY agent_run_delete_policy ON agent_runs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            LEFT JOIN projects ON projects.project_id = (threads.metadata->>'project_id')::UUID
            WHERE threads.thread_id = agent_runs.thread_id
            AND (
                (threads.metadata->>'user_id')::UUID = auth.uid() OR 
                projects.user_id = auth.uid()
            )
        )
    );

-- Grant permissions to roles for projects
GRANT ALL PRIVILEGES ON TABLE projects TO authenticated, service_role; 