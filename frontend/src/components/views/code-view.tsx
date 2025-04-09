import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeViewProps {
  content: string;
  language?: string;
  fileName?: string;
}

export default function CodeView({ content, language = 'typescript', fileName }: CodeViewProps) {
  return (
    <div className="h-full flex flex-col">
      {fileName && (
        <div className="bg-zinc-800 px-4 py-2 text-white text-sm border-b border-zinc-700">
          {fileName}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: 'monospace',
            fontSize: 13,
            lineNumbers: 'on',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
} 