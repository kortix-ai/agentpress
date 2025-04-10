'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type AgentStatusContextType = {
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  agentStatus: 'idle' | 'running' | 'completed' | 'error';
  setAgentStatus: (status: 'idle' | 'running' | 'completed' | 'error') => void;
};

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(undefined);

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');

  return (
    <AgentStatusContext.Provider
      value={{
        isStreaming,
        setIsStreaming,
        agentStatus,
        setAgentStatus,
      }}
    >
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  if (context === undefined) {
    throw new Error('useAgentStatus must be used within an AgentStatusProvider');
  }
  return context;
} 