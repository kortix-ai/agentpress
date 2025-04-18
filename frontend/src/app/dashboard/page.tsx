"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { ChatInput } from '@/components/thread/chat-input';
import { createProject, addUserMessage, startAgent, createThread, getProjects } from "@/lib/api";
import { generateThreadName } from "@/lib/actions/threads";
import { useAuth } from "@/components/AuthProvider";

function DashboardContent() {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      const pendingRequest = localStorage.getItem('suna-pending-request');
      
      if (pendingRequest) {
        console.log("Found pending request:", pendingRequest);
        getProjects()
          .then(projects => {
            if (projects.length === 0) {
              console.log("No existing projects, processing pending request...");
              localStorage.removeItem('suna-pending-request'); 
              handleSubmit(pendingRequest);
            } else {
              console.log("User has existing projects, ignoring pending request.");
              localStorage.removeItem('suna-pending-request');
            }
          })
          .catch(error => {
            console.error("Error checking projects for pending request:", error);
            localStorage.removeItem('suna-pending-request');
          });
      }
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (message: string, options?: { model_name?: string; enable_thinking?: boolean }) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const projectName = await generateThreadName(trimmedMessage);
      
      const newAgent = await createProject({
        name: projectName,
        description: "",
      });
      
      const thread = await createThread(newAgent.id);
      
      await addUserMessage(thread.thread_id, trimmedMessage);
      
      await startAgent(thread.thread_id, {
        model_name: options?.model_name,
        enable_thinking: options?.enable_thinking,
        stream: true
      });
      
      localStorage.removeItem('suna-pending-request');
      
      router.push(`/dashboard/agents/${thread.thread_id}`);
    } catch (error) {
      console.error("Error creating agent:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[90%]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium text-foreground mb-2">Hey </h1>
          <h2 className="text-2xl text-muted-foreground">What would you like Suna to do today?</h2>
        </div>
        
        <ChatInput 
          onSubmit={handleSubmit} 
          loading={isSubmitting}
          placeholder="Describe what you need help with..."
          value={inputValue}
          onChange={setInputValue}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[90%]">
          <div className="flex flex-col items-center text-center mb-10">
            <Skeleton className="h-10 w-40 mb-2" />
            <Skeleton className="h-7 w-56" />
          </div>
          
          <Skeleton className="w-full h-[100px] rounded-xl" />
          <div className="flex justify-center mt-3">
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
