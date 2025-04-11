import React from 'react';

interface BrowserViewProps {
  url: string;
  content?: string;
  isLoading?: boolean;
}

export function BrowserView({ url, content, isLoading = false }: BrowserViewProps) {
  return (
    <div className="w-full h-full flex flex-col border rounded">
      {/* URL bar */}
      <div className="p-2 border-b bg-zinc-50 flex items-center">
        <div className="text-xs text-zinc-600 truncate">{url}</div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 p-2 overflow-auto">
        {isLoading ? (
          <div className="text-sm text-zinc-400">Loading...</div>
        ) : (
          <div className="text-sm text-zinc-400">Browser View content will be displayed here</div>
        )}
      </div>
    </div>
  );
} 