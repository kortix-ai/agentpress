import React from 'react';
import { MessageSquare } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">Start a conversation</h3>
      <p className="text-xs text-muted-foreground mb-0 max-w-md">
        Ask a question or describe what you need help with
      </p>
    </div>
  );
} 