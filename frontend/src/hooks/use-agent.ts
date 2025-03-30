import { useState, useRef, useCallback } from 'react';
import { agentService, type AgentStatus, type AgentRun } from '@/lib/services/agent-service';

interface UseAgentOptions {
  onMessage?: (content: string) => void;
  onToolCall?: (name: string, args: any) => void;
  onError?: (error: any) => void;
  onStatusChange?: (status: AgentStatus) => void;
  onComplete?: (finalContent: string) => void;
}

export function useAgent(options: UseAgentOptions = {}) {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [currentAgentRunId, setCurrentAgentRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const stopStreamRef = useRef<(() => void) | null>(null);
  const streamingContentRef = useRef<string>('');
  const pendingContentRef = useRef<string>('');
  const hasCompletedRef = useRef(false);
  const isClosingRef = useRef(false);

  const handleStatusChange = useCallback((status: AgentStatus) => {
    setAgentStatus(status);
    options.onStatusChange?.(status);
  }, [options.onStatusChange]);

  const startAgent = useCallback(async (threadId: string) => {
    try {
      setError(null);
      setIsCompleted(false);
      hasCompletedRef.current = false;
      pendingContentRef.current = '';
      
      // If there's an active agent, stop it first
      if (currentAgentRunId && agentStatus === 'running') {
        await stopAgent();
      }
      
      // Start a new agent run
      const { agent_run_id } = await agentService.startAgent(threadId);
      setCurrentAgentRunId(agent_run_id);
      handleStatusChange('running');
      
      // Start streaming
      startStreaming(agent_run_id);
      
      return agent_run_id;
    } catch (err: any) {
      setError(err.message || 'Failed to start agent');
      handleStatusChange('stopped');
      throw err;
    }
  }, [currentAgentRunId, agentStatus, handleStatusChange]);

  const stopAgent = useCallback(async () => {
    if (!currentAgentRunId) return;
    
    try {
      // Stop the stream first
      stopStreamRef.current?.();
      
      // Then stop the agent
      await agentService.stopAgent(currentAgentRunId);
      
      // Update status
      handleStatusChange('stopped');
      setIsStreaming(false);
      setIsCompleted(false);
      hasCompletedRef.current = false;
      
      // Reset refs
      streamingContentRef.current = '';
      pendingContentRef.current = '';
      stopStreamRef.current = null;
    } catch (err: any) {
      setError(err.message || 'Failed to stop agent');
      throw err;
    }
  }, [currentAgentRunId, handleStatusChange]);

  const startStreaming = useCallback((agentRunId: string) => {
    setIsStreaming(true);
    streamingContentRef.current = '';
    isClosingRef.current = false;
    
    const cleanup = agentService.streamAgent(agentRunId, {
      onMessage: (content) => {
        if (!isClosingRef.current) {
          streamingContentRef.current += content;
          pendingContentRef.current = streamingContentRef.current;
          options.onMessage?.(content);
        }
      },
      onToolCall: (name, args) => {
        if (!isClosingRef.current) {
          options.onToolCall?.(name, args);
        }
      },
      onError: (error) => {
        console.error('Stream error:', error);
        if (error.message?.includes('Authentication required')) {
          setError('Authentication error. Please refresh the page.');
        } else {
          setError('Error during streaming: ' + (error.message || 'Unknown error'));
        }
        handleStatusChange('stopped');
        setIsCompleted(false);
        hasCompletedRef.current = false;
        isClosingRef.current = true;
        options.onError?.(error);
      },
      onClose: () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        // Ensure we show the final content before completing
        if (pendingContentRef.current) {
          options.onMessage?.(pendingContentRef.current);
        }
        
        // Small delay to ensure the final content is rendered
        setTimeout(() => {
          setIsStreaming(false);
          handleStatusChange('completed');
          setIsCompleted(true);
          hasCompletedRef.current = true;
          
          // Call onComplete with the final content
          options.onComplete?.(streamingContentRef.current);
          
          // Reset refs
          streamingContentRef.current = '';
          pendingContentRef.current = '';
          stopStreamRef.current = null;
        }, 100);
      }
    });
    
    stopStreamRef.current = cleanup;
  }, [handleStatusChange, options]);

  const getStreamingContent = useCallback(() => {
    return streamingContentRef.current;
  }, []);

  return {
    agentStatus,
    currentAgentRunId,
    isStreaming,
    isCompleted,
    error,
    startAgent,
    stopAgent,
    getStreamingContent
  };
} 