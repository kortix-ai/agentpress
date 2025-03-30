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
    thread_id UUID PRIMARY KEY,
    user_id UUID,
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
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

-- Grant permissions to roles
GRANT ALL PRIVILEGES ON TABLE projects TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE threads TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE agent_runs TO authenticated, service_role;