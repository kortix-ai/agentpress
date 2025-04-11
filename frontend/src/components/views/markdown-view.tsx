import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownViewProps {
  content: string;
  title?: string;
}

export default function MarkdownView({ content, title }: MarkdownViewProps) {
  return (
    <div className="h-full flex flex-col">
      {title && (
        <div className="bg-zinc-100 px-4 py-2 text-zinc-800 text-sm border-b border-zinc-200">
          {title}
        </div>
      )}
      <div className="flex-1 bg-white p-4 rounded-md overflow-auto">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
} 