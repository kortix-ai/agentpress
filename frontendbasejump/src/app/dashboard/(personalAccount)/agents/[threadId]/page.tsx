'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getProject, getMessages, getThread, addUserMessage, startAgent, stopAgent, getAgentRuns, createThread, type Message, type Project, type Thread, type AgentRun } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowDown, Play, Square } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentPageProps {
  params: {
    threadId: string;
  };
}

// Simple component to handle message formatting
function MessageContent({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap">
      {content.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          {i < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function AgentPage({ params }: AgentPageProps) {
  const { threadId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('message');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [agent, setAgent] = useState<Project | null>(null);
  const [conversation, setConversation] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if we're creating a new conversation or using an existing one
        if (threadId === 'new') {
          try {
            // For new threads, we need a project ID - we could redirect to project selection
            // or use a default project (future enhancement)
            router.push('/dashboard');
            return;
          } catch (err) {
            console.error("Failed to create new thread:", err);
            setError("Failed to create a new conversation");
          }
        } else {
          // Load existing conversation (thread) data
          const conversationData = await getThread(threadId);
          setConversation(conversationData);
          
          if (conversationData && conversationData.project_id) {
            // Load agent (project) data
            const agentData = await getProject(conversationData.project_id);
            setAgent(agentData);
            
            // Only load messages and agent runs if we have a valid thread
            const messagesData = await getMessages(threadId);
            setMessages(messagesData);
            
            const agentRunsData = await getAgentRuns(threadId);
            setAgentRuns(agentRunsData);
          }
        }
      } catch (err: any) {
        console.error("Error loading conversation data:", err);
        
        // Handle permission errors specifically
        if (err.code === '42501' && err.message?.includes('has_role_on_account')) {
          setError("You don't have permission to access this conversation");
        } else {
          setError(err instanceof Error ? err.message : "An error occurred loading the conversation");
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [threadId, initialMessage, router]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Check for agent status periodically if an agent is running
  useEffect(() => {
    if (!conversation) return;
    
    const isAgentRunning = agentRuns.some(run => run.status === "running");
    if (!isAgentRunning) return;
    
    // Poll for updates every 3 seconds if agent is running
    const interval = setInterval(async () => {
      try {
        const updatedAgentRuns = await getAgentRuns(conversation.thread_id);
        setAgentRuns(updatedAgentRuns);
        
        // Also refresh messages
        const updatedMessages = await getMessages(conversation.thread_id);
        setMessages(updatedMessages);
        
        // If no agent is running anymore, stop polling
        if (!updatedAgentRuns.some(run => run.status === "running")) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling agent status:", err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [agentRuns, conversation]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending) return;
    if (!conversation) return;
    
    setIsSending(true);
    try {
      // Add user message
      await addUserMessage(conversation.thread_id, userMessage);
      
      // Start the agent
      await startAgent(conversation.thread_id);
      
      // Clear the input
      setUserMessage("");
      
      // Refresh data
      const updatedMessages = await getMessages(conversation.thread_id);
      setMessages(updatedMessages);
      
      const updatedAgentRuns = await getAgentRuns(conversation.thread_id);
      setAgentRuns(updatedAgentRuns);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle starting the agent
  const handleRunAgent = async () => {
    if (isSending || !conversation) return;
    
    setIsSending(true);
    try {
      await startAgent(conversation.thread_id);
      
      // Refresh agent runs
      const updatedAgentRuns = await getAgentRuns(conversation.thread_id);
      setAgentRuns(updatedAgentRuns);
    } catch (err) {
      console.error("Error starting agent:", err);
      setError(err instanceof Error ? err.message : "Failed to start agent");
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle stopping the agent
  const handleStopAgent = async () => {
    try {
      // Find the running agent run
      const runningAgent = agentRuns.find(run => run.status === "running");
      if (runningAgent) {
        await stopAgent(runningAgent.id);
        
        // Refresh agent runs
        if (conversation) {
          const updatedAgentRuns = await getAgentRuns(conversation.thread_id);
          setAgentRuns(updatedAgentRuns);
        }
      }
    } catch (err) {
      console.error("Error stopping agent:", err);
      setError(err instanceof Error ? err.message : "Failed to stop agent");
    }
  };
  
  // Check if agent is running
  const isAgentRunning = agentRuns.some(run => run.status === "running");
  
  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push(`/dashboard/agent`)}>
          Back to Agents
        </Button>
      </div>
    );
  }
  
  if (isLoading || (!agent && threadId !== 'new')) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
        </div>
        
        <div className="space-y-4 mt-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium">Start a conversation</h3>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Send a message to start talking with {agent?.name || "the AI agent"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <MessageContent content={message.content} />
                </div>
              </div>
            ))}
            
            {/* Show a loading indicator if the agent is running */}
            {isAgentRunning && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-4 rounded-lg bg-muted">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-foreground rounded-full animate-pulse"></div>
                    <div className="h-2 w-2 bg-foreground rounded-full animate-pulse delay-150"></div>
                    <div className="h-2 w-2 bg-foreground rounded-full animate-pulse delay-300"></div>
                    <span className="text-sm text-muted-foreground ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} id="messages-end"></div>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex flex-col space-y-2">
          <div className="flex-1">
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Type your message..."
              className="resize-none min-h-[80px]"
              disabled={isAgentRunning || isSending || !conversation}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey === false) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>
          <div className="flex justify-between items-center">
            <div>
              {isAgentRunning ? (
                <Button 
                  onClick={handleStopAgent} 
                  variant="outline" 
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Agent
                </Button>
              ) : (
                <Button 
                  onClick={handleRunAgent} 
                  variant="outline" 
                  size="sm" 
                  disabled={messages.length === 0 || isSending || !conversation}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent
                </Button>
              )}
            </div>
            <Button 
              onClick={handleSendMessage} 
              className="ml-2" 
              disabled={!userMessage.trim() || isAgentRunning || isSending || !conversation}
            >
              Send Message
              {isSending && <span className="ml-2">...</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 