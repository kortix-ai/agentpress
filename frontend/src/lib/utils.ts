import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Parses content from ModelResponse format that looks like:
 * data: ModelResponse(id='...', choices=[StreamingChoices(finish_reason=None, index=0, delta=Delta(content='...', role=None, function_call=None, tool_calls=None, audio=None), logprobs=None)], ...)
 */
export function parseModelResponse(rawData: string): { 
  content: string | null;
  toolCall: { name: string, arguments: string } | null;
  isCreateFile: boolean;
  createFilePath: string | null;
  createFileContent: string | null;
} {
  const result = {
    content: null as string | null,
    toolCall: null as { name: string, arguments: string } | null,
    isCreateFile: false,
    createFilePath: null as string | null,
    createFileContent: null as string | null
  };
  
  // Skip non-data lines
  if (!rawData.startsWith('data: ')) {
    return result;
  }
  
  try {
    // Extract content from Delta(content='...') pattern
    // Handle both single quotes and empty content cases
    const contentMatch = 
      rawData.match(/delta=Delta\(content='([^']*)'/i) || 
      rawData.match(/delta=Delta\(content="([^"]*)"/i) ||
      rawData.match(/delta=Delta\(content=([^,)]+)/i);
    
    if (contentMatch && contentMatch[1]) {
      let content = contentMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
      
      // Handle empty or whitespace-only content
      if (content.trim()) {
        result.content = content;
        
        // Process create-file tag in aggregated content
        if (content.includes('<create-file')) {
          const filePathMatch = content.match(/<create-file file_path="([^"]+)">/i);
          if (filePathMatch && filePathMatch[1]) {
            result.isCreateFile = true;
            result.createFilePath = filePathMatch[1];
            
            // Try to extract file content between create-file tags
            const fileContentMatch = content.match(/<create-file file_path="[^"]+">([^<]*)<\/create-file>/i);
            if (fileContentMatch && fileContentMatch[1]) {
              result.createFileContent = fileContentMatch[1].trim();
              
              // Replace the raw create-file tag in content with a more readable format
              result.content = content.replace(
                /<create-file file_path="([^"]+)">([^<]*)<\/create-file>/i,
                `Creating file: $1`
              );
            }
          }
        }
      }
    }
    
    // Check for tool calls
    const toolCallMatch = rawData.match(/tool_calls=\[([^\]]+)\]/i);
    if (toolCallMatch && toolCallMatch[1] && toolCallMatch[1] !== 'None') {
      // Extract name and arguments from tool call
      const nameMatch = toolCallMatch[1].match(/name='([^']+)'/i);
      const argsMatch = toolCallMatch[1].match(/arguments='([^']+)'/i);
      
      if (nameMatch && nameMatch[1]) {
        result.toolCall = {
          name: nameMatch[1],
          arguments: argsMatch && argsMatch[1] ? argsMatch[1] : ''
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('[PARSER] Error parsing model response:', error);
    return result;
  }
}
