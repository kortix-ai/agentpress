import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import '@/styles/markdown.css';
import { renderToString } from 'react-dom/server';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Instead of importing 'diff', let's create a simple custom diff function
// This avoids the need for an external dependency

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

// Simple implementation of diff
function simpleDiff(oldStr: string, newStr: string): DiffPart[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const result: DiffPart[] = [];
  
  // Find added and removed lines (very basic implementation)
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  // Find removed lines
  oldLines.forEach(line => {
    if (!newSet.has(line)) {
      result.push({ value: line + '\n', removed: true });
    } else {
      result.push({ value: line + '\n' });
    }
  });
  
  // Find added lines
  newLines.forEach(line => {
    if (!oldSet.has(line) && !result.some(part => part.value.trim() === line)) {
      result.push({ value: line + '\n', added: true });
    }
  });
  
  return result.sort((a, b) => {
    if (a.removed && !b.removed) return -1;
    if (!a.removed && b.removed) return 1;
    if (a.added && !b.added) return 1;
    if (!a.added && b.added) return -1;
    return 0;
  });
}

interface MarkdownViewProps {
  title?: string;
  originalContent?: string;
  modifiedContent?: string;
  showDiff?: boolean;
}

// Mock content for preview purposes
const MOCK_ORIGINAL = `# Original Document

This is the original version of the document.

## Introduction

This project aims to solve a specific problem by implementing a solution.

## Implementation

\`\`\`javascript
function originalFunction() {
  console.log("This is the original implementation");
}
\`\`\`
`;

const MOCK_MODIFIED = `# Modified Document

This is the modified version of the document.

## Introduction

This project aims to solve a specific problem by implementing an optimized solution.

## Implementation

\`\`\`javascript
function improvedFunction() {
  console.log("This is the improved implementation");
  return true;
}
\`\`\`

## Additional Section

This section was added to provide more context.
`;

// Simple diff formatting component
function DiffView({ original, modified }: { original: string, modified: string }) {
  const [diffContent, setDiffContent] = useState<string>('');
  
  useEffect(() => {
    // Generate diff
    const diff = simpleDiff(original, modified);
    
    // Format diff as markdown with added/removed content highlighted
    const formattedDiff = diff.map(part => {
      // Render markdown to HTML string using server-side rendering function
      const htmlContent = renderToString(<ReactMarkdown>{part.value}</ReactMarkdown>);
      
      // Wrap with the appropriate styling
      if (part.added) {
        return `<div class="bg-green-400/20 border-l-4 border-green-500 pl-2 my-1 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
      }
      if (part.removed) {
        return `<div class="bg-red-400/20 border-l-4 border-red-500 pl-2 my-1 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
      }
      return `<div class="text-zinc-400 prose prose-invert prose-sm max-w-none novel-prose">${htmlContent}</div>`;
    }).join('');
    
    setDiffContent(formattedDiff);
  }, [original, modified]);
  
  return (
    <div 
      className="prose prose-invert prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: diffContent }}
    />
  );
}

// Markdown viewer component using ReactMarkdown
function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none novel-prose">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function MarkdownView({ 
  title, 
  originalContent = MOCK_ORIGINAL,
  modifiedContent = MOCK_MODIFIED,
  showDiff = false 
}: MarkdownViewProps) {
  const [viewMode, setViewMode] = useState<'original' | 'modified' | 'diff'>('original');
  
  // Set initial view mode to diff if showDiff is true
  useEffect(() => {
    if (showDiff) {
      setViewMode('diff');
    }
  }, [showDiff]);

  return (
    <div className="h-full flex flex-col text-white border border-zinc-200 rounded-lg backdrop-blur-sm">
      {/* Header section with tabs */}
      <div className="border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
        <div className="text-zinc-400 text-sm font-medium">
          {title || 'Markdown View'}
        </div>
        
        {/* Tabs in header */}
        <Tabs 
          defaultValue={viewMode} 
          value={viewMode} 
          onValueChange={(value) => setViewMode(value as 'original' | 'modified' | 'diff')}
          className="w-auto"
        >
          <TabsList className="">
            <TabsTrigger value="original" className="text-xs py-1">Original</TabsTrigger>
            <TabsTrigger value="modified" className="text-xs py-1">Modified</TabsTrigger>
            <TabsTrigger value="diff" className="text-xs py-1">Diff</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'original' && (
          <MarkdownViewer content={originalContent} />
        )}
        {viewMode === 'modified' && (
          <MarkdownViewer content={modifiedContent} />
        )}
        {viewMode === 'diff' && (
          <DiffView original={originalContent} modified={modifiedContent} />
        )}
      </div>
    </div>
  );
} 