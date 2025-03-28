-- Create threads table
CREATE TABLE threads (
    thread_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create state_stores table
CREATE TABLE state_stores (
    store_id UUID PRIMARY KEY,
    store_data JSONB NOT NULL DEFAULT '{}'::jsonb,
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

CREATE TRIGGER update_state_stores_updated_at
    BEFORE UPDATE ON state_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at
    BEFORE UPDATE ON agent_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_threads_created_at ON threads(created_at);
CREATE INDEX idx_threads_user_id ON threads(user_id);
CREATE INDEX idx_state_stores_created_at ON state_stores(created_at);
CREATE INDEX idx_agent_runs_thread_id ON agent_runs(thread_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at);

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY thread_select_policy ON threads
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY thread_insert_policy ON threads
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY thread_update_policy ON threads
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY thread_delete_policy ON threads
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for agent_runs based on thread ownership
CREATE POLICY agent_run_select_policy ON agent_runs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM threads
            WHERE threads.thread_id = agent_runs.thread_id
            AND threads.user_id = auth.uid()
        )
    );

CREATE POLICY agent_run_insert_policy ON agent_runs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM threads
            WHERE threads.thread_id = agent_runs.thread_id
            AND threads.user_id = auth.uid()
        )
    );

CREATE POLICY agent_run_update_policy ON agent_runs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            WHERE threads.thread_id = agent_runs.thread_id
            AND threads.user_id = auth.uid()
        )
    );

CREATE POLICY agent_run_delete_policy ON agent_runs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM threads
            WHERE threads.thread_id = agent_runs.thread_id
            AND threads.user_id = auth.uid()
        )
    );

-- Enable Row Level Security for state_stores
ALTER TABLE state_stores ENABLE ROW LEVEL SECURITY;

-- Create policies for state_stores
CREATE POLICY state_store_select_policy ON state_stores
    FOR SELECT
    USING (true);

CREATE POLICY state_store_insert_policy ON state_stores
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY state_store_update_policy ON state_stores
    FOR UPDATE
    USING (true);

CREATE POLICY state_store_delete_policy ON state_stores
    FOR DELETE
    USING (true); 