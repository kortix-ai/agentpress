import React from 'react';
import { FileText, Terminal, Edit, Code, Bookmark, Database, Search, ExternalLink } from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export interface ToolResult {
  id: string;
  name: string;
  content: string; // Tool response content
  arguments?: string; // Tool arguments as a JSON string 
  status: 'completed' | 'error' | 'running';
  timestamp: Date;
}

// Helper to determine language from file extension
const getLanguageFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'js': return 'javascript';
    case 'jsx': return 'jsx';
    case 'ts': return 'typescript';
    case 'tsx': return 'typescript';
    case 'py': return 'python';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'yml': 
    case 'yaml': return 'yaml';
    case 'sh': return 'bash';
    case 'sql': return 'sql';
    default: return 'plaintext';
  }
};

// Get tool icon based on tool name
const getToolIcon = (toolName: string) => {
  const name = toolName.toLowerCase();
  
  if (name.includes('file') || name.includes('read') || name.includes('write')) {
    return <FileText size={16} className="text-blue-500" />;
  } else if (name.includes('terminal') || name.includes('command') || name.includes('shell')) {
    return <Terminal size={16} className="text-green-500" />;
  } else if (name.includes('edit') || name.includes('replace')) {
    return <Edit size={16} className="text-purple-500" />;
  } else if (name.includes('search') || name.includes('find')) {
    return <Search size={16} className="text-amber-500" />;
  } else if (name.includes('database') || name.includes('sql')) {
    return <Database size={16} className="text-indigo-500" />;
  } else if (name.includes('code') || name.includes('generate')) {
    return <Code size={16} className="text-rose-500" />;
  } else {
    return <Bookmark size={16} className="text-gray-500" />;
  }
};

// Format tool name for display
const formatToolName = (name: string) => {
  return name.replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface ToolDisplayComponentProps {
  name: string;
  arguments: any;
  content: string;
}

const FileToolDisplay: React.FC<ToolDisplayComponentProps> = ({ name, arguments: args, content }) => {
  // Extract file_path and file_content
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  const filePath = parsedArgs.file_path || parsedArgs.target_file || '';
  const fileName = filePath.split('/').pop() || 'file';
  
  const fileContent = parsedArgs.file_contents || parsedArgs.content || '';
  const language = getLanguageFromExtension(fileName);
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-500" />
          <span className="font-medium text-gray-800 truncate">{fileName}</span>
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full truncate max-w-[120px]">{filePath.replace(`/${fileName}`, '')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatToolName(name)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={tomorrow}
          customStyle={{ margin: 0, padding: '0.75rem', fontSize: '0.8125rem', borderRadius: 0, height: '100%' }}
          showLineNumbers={true}
        >
          {fileContent}
        </SyntaxHighlighter>
      </div>
      {content && (
        <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 border-t border-gray-100 truncate flex-shrink-0">
          {content}
        </div>
      )}
    </div>
  );
};

const ShellToolDisplay: React.FC<ToolDisplayComponentProps> = ({ name, arguments: args, content }) => {
  // Process shell output
  let output = content;
  try {
    const parsedOutput = JSON.parse(content);
    if (parsedOutput.output) {
      output = parsedOutput.output;
    }
  } catch (e) {
    // If not JSON, use as is
  }
  
  const command = typeof args === 'string' 
    ? JSON.parse(args).command || '-' 
    : args.command || '-';
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-green-500" />
          <span className="font-medium text-gray-800">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-black bg-opacity-10 rounded text-xs font-mono text-gray-600 truncate max-w-[180px]">{command}</span>
        </div>
      </div>
      <div className="flex-1 bg-gray-900 text-green-400 overflow-auto">
        <SyntaxHighlighter
          language="bash"
          style={tomorrow}
          customStyle={{ margin: 0, padding: '0.75rem', background: '#111', color: '#22c55e', fontSize: '0.8125rem', borderRadius: 0, height: '100%' }}
        >
          {output}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// Displays a file edit operation showing diff
const EditToolDisplay: React.FC<ToolDisplayComponentProps> = ({ name, arguments: args, content }) => {
  const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  const filePath = parsedArgs.file_path || parsedArgs.target_file || '';
  const fileName = filePath.split('/').pop() || 'file';
  
  // Extract before/after content from str_replace
  const oldStr = parsedArgs.old_str || '';
  const newStr = parsedArgs.new_str || '';
  
  // Show snippet from response if available
  const snippetMatch = content.match(/Snippet of changes:([\s\S]*)/i);
  const snippet = snippetMatch ? snippetMatch[1].trim() : '';
  
  const language = getLanguageFromExtension(fileName);
  
  return (
    <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Edit size={16} className="text-purple-500" />
          <span className="font-medium text-gray-800 truncate">{fileName}</span>
          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full truncate max-w-[120px]">{filePath.replace(`/${fileName}`, '')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatToolName(name)}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex flex-col">
        {(oldStr && newStr) && (
          <div className="grid grid-cols-2 border-b border-gray-100 flex-1">
            <div className="border-r border-gray-100 flex flex-col h-full">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-red-50 border-b border-gray-100 flex-shrink-0">Before</div>
              <div className="overflow-auto h-full">
                <SyntaxHighlighter
                  language={language}
                  style={tomorrow}
                  customStyle={{ margin: 0, padding: '0.5rem', background: '#fff', fontSize: '0.8125rem', borderRadius: 0 }}
                  className="bg-red-50 bg-opacity-5 h-full"
                >
                  {oldStr}
                </SyntaxHighlighter>
              </div>
            </div>
            <div className="flex flex-col h-full">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-green-50 border-b border-gray-100 flex-shrink-0">After</div>
              <div className="overflow-auto h-full">
                <SyntaxHighlighter
                  language={language}
                  style={tomorrow}
                  customStyle={{ margin: 0, padding: '0.5rem', background: '#fff', fontSize: '0.8125rem', borderRadius: 0 }}
                  className="bg-green-50 bg-opacity-5 h-full"
                >
                  {newStr}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )}
        
        {snippet && !oldStr && !newStr && (
          <div className="border-b border-gray-100 flex-1 flex flex-col">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100 flex-shrink-0">Changes</div>
            <div className="overflow-auto h-full">
              <SyntaxHighlighter
                language={language}
                style={tomorrow}
                customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.8125rem', borderRadius: 0 }}
                showLineNumbers={true}
              >
                {snippet}
              </SyntaxHighlighter>
            </div>
          </div>
        )}
      </div>
      
      {content && (
        <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 truncate flex-shrink-0">
          {content.split('Snippet of changes:')[0] || content}
        </div>
      )}
    </div>
  );
};

// Default tool display for other tool types
const DefaultToolDisplay: React.FC<ToolDisplayComponentProps> = ({ name, arguments: args, content }) => {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm h-full flex flex-col">
      <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          {getToolIcon(name)}
          <span className="font-medium text-gray-800">{formatToolName(name)}</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="whitespace-pre-wrap text-sm text-gray-700">{content}</pre>
      </div>
      {args && Object.keys(typeof args === 'string' ? JSON.parse(args) : args).length > 0 && (
        <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 border-t border-gray-100 flex-shrink-0">
          <details className="group">
            <summary className="cursor-pointer hover:text-gray-800 flex items-center gap-1">
              <ExternalLink size={12} /> View Arguments
            </summary>
            <div className="pt-2 text-xs">
              <pre className="bg-gray-100 p-2 rounded text-gray-700 overflow-auto max-h-[100px]">
                {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// Main component that decides which specialized display to use
const ToolDisplay: React.FC<ToolResult> = ({ 
  name, 
  content, 
  arguments: args = '{}',
  status
}) => {
  let parsedArgs;
  try {
    parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
  } catch (e) {
    parsedArgs = {};
  }
  
  // Choose the appropriate display based on tool name
  const toolNameLower = name.toLowerCase();
  
  if (status === 'running') {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-white p-4 h-full flex items-center justify-center">
        <div className="flex items-center gap-3 justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-700">Running {formatToolName(name)}...</span>
        </div>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="rounded-lg overflow-hidden border border-red-200 shadow-sm bg-red-50 p-3 h-full flex flex-col">
        <div className="text-red-600 font-medium mb-2 flex items-center gap-2 flex-shrink-0">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Error executing {formatToolName(name)}
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="text-sm text-red-700 whitespace-pre-wrap bg-red-100 p-3 rounded h-full">{content}</pre>
        </div>
      </div>
    );
  }
  
  if (toolNameLower.includes('create_file') || 
      toolNameLower.includes('write') || 
      toolNameLower.includes('file_rewrite') ||
      toolNameLower.includes('read_file')) {
    return <FileToolDisplay name={name} arguments={parsedArgs} content={content} />;
  }
  
  if (toolNameLower.includes('execute_command') || 
      toolNameLower.includes('shell') ||
      toolNameLower.includes('run_terminal')) {
    return <ShellToolDisplay name={name} arguments={parsedArgs} content={content} />;
  }
  
  if (toolNameLower.includes('edit_file') || toolNameLower.includes('str_replace')) {
    return <EditToolDisplay name={name} arguments={parsedArgs} content={content} />;
  }
  
  // Default handler for other tool types
  return <DefaultToolDisplay name={name} arguments={parsedArgs} content={content} />;
};

export default ToolDisplay; 