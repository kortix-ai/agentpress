'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  getMessages, 
  addMessage, 
  startAgent, 
  stopAgent, 
  streamAgent, 
  type Message,
  type AgentRun,
  getAgentStatus
} from '@/lib/api';

interface ChatInterfaceProps {
  threadId: string;
}

export function ChatInterface({ threadId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [promptValue, setPromptValue] = useState('Create a modern, responsive landing page');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'stopped' | 'completed'>('idle');
  const [currentAgentRunId, setCurrentAgentRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const streamingContentRef = useRef<string>('');
  const lastMessageIdRef = useRef<string | null>(null);

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [threadId]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const loadMessages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMessages(threadId);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    try {
      // Add user message to UI first
      const userMessage: Message = {
        role: 'user',
        content
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input
      setUserInput('');
      
      // Add message to the thread in the backend
      await addMessage(threadId, userMessage);
      
      // If there's an active agent, stop it
      if (currentAgentRunId && agentStatus === 'running') {
        stopStreamRef.current?.();
        await stopAgent(currentAgentRunId);
      }
      
      // Reset streaming state
      streamingContentRef.current = '';
      lastMessageIdRef.current = null;
      
      // Start a new agent run
      const { agent_run_id } = await startAgent(threadId);
      setCurrentAgentRunId(agent_run_id);
      setAgentStatus('running');
      
      // Start streaming
      startStreaming(agent_run_id);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  const handleUserInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      sendMessage(userInput.trim());
    }
  };

  const startStreaming = (agentRunId: string) => {
    console.log(`[CHAT] Starting stream for agent run: ${agentRunId}`);
    setIsStreaming(true);
    
    // First stop any existing stream
    if (stopStreamRef.current) {
      console.log('[CHAT] Cleaning up existing stream');
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    
    // Add an empty assistant message which will be updated during streaming
    console.log('[CHAT] Adding empty assistant message for streaming');
    setMessages(prev => {
      const newMessage: Message = {
        role: 'assistant',
        content: ''
      };
      lastMessageIdRef.current = `assistant-${Date.now()}`;
      return [...prev, newMessage];
    });
    
    // Reset streaming content
    streamingContentRef.current = '';
    
    // Start the stream
    console.log('[CHAT] Setting up stream agent');
    const cleanup = streamAgent(agentRunId, {
      onMessage: (content) => {
        // Don't update if already closing or content is empty
        if (!content.trim()) return;
        
        streamingContentRef.current += content;
        
        // Update the last message
        setMessages(prev => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: streamingContentRef.current
            };
            return updated;
          }
          return prev;
        });
      },
      onToolCall: (name, args) => {
        console.log(`[CHAT] Tool call received: ${name}`);
        // Add a tool call message
        setMessages(prev => [
          ...prev,
          {
            role: 'tool',
            name,
            content: JSON.stringify(args),
            tool_call_id: `tool-${Date.now()}`
          }
        ]);
      },
      onError: (error) => {
        console.error('[CHAT] Stream error:', error);
        setError('Error during streaming: ' + (error.message || 'Unknown error'));
        setIsStreaming(false);
        setAgentStatus('stopped');
        stopStreamRef.current = null;
      },
      onClose: async () => {
        console.log('[CHAT] Stream closed');
        
        try {
          // Check final agent status if we have an agent run ID
          if (currentAgentRunId) {
            console.log(`[CHAT] Checking final status for agent run: ${currentAgentRunId}`);
            const status = await getAgentStatus(currentAgentRunId);
            console.log(`[CHAT] Final agent status: ${status.status}`);
            
            // Set appropriate status based on server response
            if (status.status === 'completed' || status.status === 'stopped' || status.status === 'error') {
              console.log(`[CHAT] Setting final status: ${status.status}`);
              setAgentStatus(status.status === 'error' ? 'stopped' : status.status);
              
              // Mark as not streaming, but don't remove content yet
              setIsStreaming(false);
              
              // Fetch the final messages
              console.log('[CHAT] Refreshing messages');
              await loadMessages();
              
              // Reset streaming refs
              streamingContentRef.current = '';
              stopStreamRef.current = null;
            }
          } else {
            console.log('[CHAT] No agent run ID to check status for');
            setAgentStatus('completed');
            setIsStreaming(false);
            
            // Refresh messages
            console.log('[CHAT] Refreshing messages');
            await loadMessages();
            
            // Reset streaming refs
            streamingContentRef.current = '';
            stopStreamRef.current = null;
          }
        } catch (err) {
          console.error('[CHAT] Error checking agent status:', err);
          setAgentStatus('completed'); // Default to completed on error
          setIsStreaming(false);
          
          // Still refresh messages
          console.log('[CHAT] Refreshing messages after error');
          await loadMessages();
          
          // Reset streaming refs
          streamingContentRef.current = '';
          stopStreamRef.current = null;
        }
      }
    });
    
    stopStreamRef.current = cleanup;
  };

  const handleStopAgent = async () => {
    if (!currentAgentRunId) {
      console.warn('[CHAT] No agent run ID to stop');
      return;
    }
    
    console.log(`[CHAT] Stopping agent run: ${currentAgentRunId}`);
    
    try {
      // First stop the stream if it exists
      if (stopStreamRef.current) {
        console.log('[CHAT] Cleaning up stream connection');
        stopStreamRef.current();
        stopStreamRef.current = null;
      }
      
      // Mark as not streaming but keep the content visible during transition
      setIsStreaming(false);
      
      // Then stop the agent through the API
      console.log('[CHAT] Sending stop request to backend');
      await stopAgent(currentAgentRunId);
      
      // Update UI state
      console.log('[CHAT] Agent stopped successfully');
      setAgentStatus('stopped');
      
      // Refresh messages first to load the final state
      console.log('[CHAT] Refreshing messages after stop');
      await loadMessages();
      
      // Add a message indicating the agent was stopped - after refreshing messages
      console.log('[CHAT] Adding stop message');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '🛑 Agent has been stopped manually. Any pending tasks will not complete.'
        }
      ]);
    } catch (err: any) {
      console.error('[CHAT] Error stopping agent:', err);
      setError(err.message || 'Failed to stop agent');
      
      // Still update UI state to avoid being stuck
      setAgentStatus('stopped');
      setIsStreaming(false);
    }
  };

  const startAgentWithCustomPrompt = async (stream: boolean = false) => {
    if (!promptValue.trim()) return;
    
    try {
      await sendMessage(promptValue.trim());
    } catch (err) {
      // Already handled in sendMessage
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Task description and controls */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">Task Description</h2>
        <div className="space-y-4">
          <Textarea
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            className="w-full"
            rows={3}
          />

          <div className="flex space-x-2">
            <Button 
              onClick={() => startAgentWithCustomPrompt(false)}
              disabled={agentStatus === 'running' || !promptValue.trim()}
            >
              Start Agent
            </Button>
            <Button 
              onClick={() => startAgentWithCustomPrompt(true)}
              variant="secondary"
              disabled={agentStatus === 'running' || !promptValue.trim()}
            >
              Start & Stream
            </Button>
            {agentStatus === 'running' && (
              <Button 
                onClick={handleStopAgent}
                variant="destructive"
              >
                ⏹️ Stop Agent
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Status:</span>
            <span className={`inline-block w-2 h-2 rounded-full ${
              agentStatus === 'running' 
                ? 'bg-green-500 animate-pulse' 
                : agentStatus === 'stopped' 
                  ? 'bg-red-500' 
                  : agentStatus === 'completed' 
                    ? 'bg-blue-500' 
                    : 'bg-gray-500'
            }`}></span>
            <span>
              {agentStatus === 'running' 
                ? 'Running' 
                : agentStatus === 'stopped' 
                  ? 'Stopped' 
                  : agentStatus === 'completed' 
                    ? 'Completed' 
                    : 'Not Running'}
            </span>
            
            {isStreaming && (
              <span className="ml-2 flex items-center text-indigo-600">
                <span className="mr-1 inline-block w-3 h-3 border-2 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent rounded-full animate-spin"></span>
                Streaming
              </span>
            )}
            
            <div className="ml-auto flex items-center">
              <input
                type="checkbox"
                id="autoScroll"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoScroll" className="text-sm">Auto-scroll</label>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-4 mb-4 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading messages...</div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500 mb-2">{error}</p>
              <button onClick={loadMessages} className="text-blue-500 underline">
                Try again
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages yet. Start by describing your task.
            </div>
          ) : (
            messages.map((message, index) => {
              if (message.role === 'user') {
                return (
                  <div key={`user-${index}`} className="bg-blue-100 rounded-lg p-3 ml-12">
                    <div className="whitespace-pre-wrap font-mono">{message.content}</div>
                  </div>
                );
              } else if (message.role === 'assistant') {
                return (
                  <div key={`assistant-${index}`} className="bg-gray-100 rounded-lg p-3 mr-12">
                    <div className="whitespace-pre-wrap font-mono">{message.content}</div>
                  </div>
                );
              } else if (message.role === 'tool') {
                return (
                  <div key={message.tool_call_id || `tool-${index}`} className="bg-yellow-50 rounded-lg p-3 mr-12">
                    <div className="font-medium">Tool Call: {message.name}</div>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {message.content}
                    </pre>
                  </div>
                );
              }
              return null;
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <form onSubmit={handleUserInputSubmit} className="mt-4 flex space-x-2">
          <Input
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={agentStatus === 'running'}
          />
          <Button type="submit" disabled={!userInput.trim() || agentStatus === 'running'}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
} 