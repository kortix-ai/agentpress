import React from 'react';

interface TerminalViewProps {
  content: string;
  title?: string;
}

export default function TerminalView({ content, title }: TerminalViewProps) {
  return (
    <div className="h-full flex flex-col">
      {title && (
        <div className="bg-zinc-900 px-4 py-2 text-zinc-300 text-sm border-b border-zinc-800">
          {title}
        </div>
      )}
      <div className="flex-1 bg-black text-green-400 font-mono p-4 rounded-b-md overflow-auto">
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
} 