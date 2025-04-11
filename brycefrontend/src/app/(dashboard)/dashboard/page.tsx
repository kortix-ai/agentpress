'use client';

import React, { useState, Suspense } from 'react';
import { useAuth } from '@/context/auth-context';
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from 'next/navigation';
import { ChatInput } from '@/components/chat-input';

function DashboardContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = (message: string) => {
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Create a new project or conversation based on the input
    // Here we could route based on the message, for demo just going to projects/new
    router.push('/projects/new');
  };

  // Skeleton loading state
  if (isAuthLoading) {
    return (
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
    );
  }

  const firstName = user?.email?.split('@')[0] || 'there';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[560px] max-w-[90%]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium text-foreground mb-2">Hello {firstName}.</h1>
          <h2 className="text-2xl text-muted-foreground">What can I help with?</h2>
        </div>
        
        <ChatInput 
          onSubmit={handleSubmit} 
          loading={isSubmitting}
          placeholder="Ask anything..."
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