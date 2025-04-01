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
  
  // Clean up the data if it starts with "data: "
  const cleanData = rawData.startsWith('data: ') ? rawData.substring(6) : rawData;
  
  // For debugging
  console.log('[PARSER] Processing data:', cleanData.substring(0, 100));
  
  try {
    // First check if we have valid ModelResponse data
    if (!cleanData.includes('ModelResponse') || !cleanData.includes('delta=Delta')) {
      console.log('[PARSER] Not a valid ModelResponse format');
      return result;
    }
    
    // Extract content using a direct approach for Delta format
    let content = null;
    
    // Check for content='...' pattern inside delta=Delta(...)
    const deltaMatch = /delta=Delta\(([^)]+)\)/i.exec(cleanData);
    if (deltaMatch && deltaMatch[1]) {
      const deltaContent = deltaMatch[1];
      
      // Check for content='...' or content="..." in the delta content
      const contentSingleQuote = /content='([^']*)'/i.exec(deltaContent);
      if (contentSingleQuote && contentSingleQuote[1]) {
        content = contentSingleQuote[1];
        console.log('[PARSER] Found content with single quotes:', 
          content.length > 50 ? content.substring(0, 50) + '...' : content);
      } else {
        const contentDoubleQuote = /content="([^"]*)"/i.exec(deltaContent);
        if (contentDoubleQuote && contentDoubleQuote[1]) {
          content = contentDoubleQuote[1];
          console.log('[PARSER] Found content with double quotes:', 
            content.length > 50 ? content.substring(0, 50) + '...' : content);
        }
      }
    }
    
    // If content was found, process it
    if (content) {
      // Clean up escaped characters
      content = content
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"');
      
      // Set the content in the result
      if (content.trim()) {
        result.content = content;
        
        // Process create-file tag in content
        if (content.includes('<create-file')) {
          const filePathMatch = content.match(/<create-file file_path="([^"]+)">/i);
          if (filePathMatch && filePathMatch[1]) {
            result.isCreateFile = true;
            result.createFilePath = filePathMatch[1];
            console.log('[PARSER] File creation detected:', result.createFilePath);
            
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
    if (cleanData.includes('tool_calls=')) {
      const toolCallsSection = cleanData.split('tool_calls=')[1].split(']')[0] + ']';
      
      if (toolCallsSection && toolCallsSection !== '[None]') {
        // Find name and arguments in the tool call
        const nameMatch = /name=(['"])([^'"]*)\1/i.exec(toolCallsSection);
        const argsMatch = /arguments=(['"])([^'"]*)\1/i.exec(toolCallsSection);
        
        if (nameMatch && nameMatch[2]) {
          result.toolCall = {
            name: nameMatch[2],
            arguments: argsMatch && argsMatch[2] ? argsMatch[2] : ''
          };
          console.log('[PARSER] Tool call detected:', result.toolCall.name);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('[PARSER] Error parsing model response:', error, cleanData.substring(0, 200));
    return result;
  }
} 