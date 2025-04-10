import React from 'react';

interface TextViewProps {
  content: string;
  title?: string;
}

export default function TextView({ content, title }: TextViewProps) {
  return (
    <div className="h-full flex flex-col">
      {title && (
        <div className="bg-zinc-100 px-4 py-2 text-zinc-800 text-sm border-b border-zinc-200">
          {title}
        </div>
      )}
      <div className="flex-1 bg-white p-4 rounded-md overflow-auto">
        <pre className="whitespace-pre-wrap text-sm">{content}</pre>
      </div>
    </div>
  );
} 