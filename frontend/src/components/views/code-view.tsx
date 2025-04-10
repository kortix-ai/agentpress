import React, { useState, useRef } from 'react';
import Editor, { DiffEditor, BeforeMount } from '@monaco-editor/react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define proper type for editor ref
type DiffEditorOptions = {
  renderSideBySide?: boolean;
  enableSplitViewResizing?: boolean;
  lineDecorationsWidth?: number;
  folding?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  glyphMargin?: boolean;
  renderIndicators?: boolean;
  originalEditable?: boolean;
  useInlineViewWhenSpaceIsLimited?: boolean;
  isInEmbeddedEditor?: boolean;
  diffWordWrap?: 'off' | 'on' | 'inherit';
  hideUnchangedRegions?: {
    enabled?: boolean;
    contextLineCount?: number;
    minimumLineCount?: number;
  };
};

type MonacoDiffEditor = {
  updateOptions: (options: DiffEditorOptions) => void;
};

// Define the color tokens for syntax highlighting
const syntaxHighlighting = {
  comments: '#6A9955',
  keywords: '#0000FF',
  strings: '#A31515',
  numbers: '#098658',
  functions: '#795E26',
  types: '#267f99',
  variables: '#001080',
  operators: '#000000',
  parameters: '#001080',
  constants: '#0070C1',
  decorators: '#AF00DB'
};

interface CodeViewProps {
  content?: string;
  originalContent?: string;
  modifiedContent?: string;
  language?: string;
  fileName?: string;
  highlighting?: typeof syntaxHighlighting;
  showDiff?: boolean;
}

export default function CodeView({ 
  content,
  originalContent,
  modifiedContent,
  language = 'typescript', 
  fileName,
  highlighting = syntaxHighlighting,
  showDiff = true
}: CodeViewProps) {
  const [viewMode, setViewMode] = useState<'original' | 'modified' | 'diff'>(showDiff ? 'diff' : 'original');
  const diffEditorRef = useRef<MonacoDiffEditor | null>(null);
  
  // Determine which content to display based on view mode
  const displayContent = viewMode === 'original' 
    ? originalContent || content
    : viewMode === 'modified' 
      ? modifiedContent || content
      : originalContent || content;

  // Prepare editor before mount
  const handleBeforeMount: BeforeMount = (monaco) => {
    // Create a custom theme
    monaco.editor.defineTheme('customLightTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: highlighting.comments.replace('#', ''), fontStyle: 'italic' },
        { token: 'keyword', foreground: highlighting.keywords.replace('#', ''), fontStyle: 'bold' },
        { token: 'string', foreground: highlighting.strings.replace('#', '') },
        { token: 'number', foreground: highlighting.numbers.replace('#', '') },
        { token: 'identifier', foreground: highlighting.variables.replace('#', '') },
        { token: 'type', foreground: highlighting.types.replace('#', '') },
        { token: 'delimiter', foreground: highlighting.operators.replace('#', '') },
        { token: 'constant', foreground: highlighting.constants.replace('#', '') },
      ],
      colors: {
        'editor.foreground': '#000000',
        'editor.background': '#FFFFFF',
        'editor.selectionBackground': '#ADD6FF',
        'editor.lineHighlightBackground': '#F0F0F0',
        'diffEditor.insertedTextBackground': '#BBFFBB40',  // Light green with opacity
        'diffEditor.removedTextBackground': '#FFBBBB40',   // Light red with opacity
        'diffEditor.insertedLineBackground': '#CCFFCC30',  // Very light green for entire line
        'diffEditor.removedLineBackground': '#FFCCCC30',   // Very light red for entire line
        'diffEditor.border': 'transparent',                // Transparent borders
      }
    });
  };

  // Handle diff editor mounted
  const handleDiffEditorDidMount = (editor: MonacoDiffEditor) => {
    diffEditorRef.current = editor;
    
    // Set to inline diff view with customizations
    editor.updateOptions({
      renderSideBySide: false,           // Inline diff view
      enableSplitViewResizing: false,
      lineDecorationsWidth: 5,           // Minimal width for line decorations
      folding: false,                    // Disable code folding
      lineNumbers: 'on',                 // Show line numbers
      glyphMargin: false,                // Hide glyph margin
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with file name and tabs */}
      <div className="px-4 py-2 text-zinc-800 text-sm border-b border-zinc-300 flex justify-between items-center">
        <span>{fileName || 'Code View'}</span>
        
        {/* Tabs for view modes */}
        <Tabs 
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
      
      <div className="flex-1 min-h-0">
        {viewMode === 'diff' && originalContent && modifiedContent ? (
          // Monaco Diff Editor
          <DiffEditor
            height="100%"
            language={language}
            original={originalContent}
            modified={modifiedContent}
            theme="customLightTheme"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              // Diff editor specific options
              renderSideBySide: false,                // Inline diff view
              enableSplitViewResizing: false,
              diffWordWrap: 'on',
              renderOverviewRuler: false,
              ignoreTrimWhitespace: false,
              renderIndicators: true,
              originalEditable: false,
              useInlineViewWhenSpaceIsLimited: true,
              isInEmbeddedEditor: true,
              hideUnchangedRegions: { enabled: true },
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 5,                // Minimal width for line decorations
              overviewRulerBorder: false,             // No border for overview ruler
            }}
            beforeMount={handleBeforeMount}
            onMount={handleDiffEditorDidMount}
          />
        ) : (
          // Regular Editor
          <Editor
            height="100%"
            language={language}
            value={displayContent}
            theme="customLightTheme"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontFamily: 'monospace',
              fontSize: 13,
              lineNumbers: 'on',
              automaticLayout: true,
            }}
            beforeMount={handleBeforeMount}
          />
        )}
      </div>
    </div>
  );
} 