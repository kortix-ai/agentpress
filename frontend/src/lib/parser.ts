export interface ParsedToolCall {
  name: string;
  arguments: Record<string, string>;
  content: string;
  type: 'tool_call';
  state: 'processing' | 'complete';
}

export type ParsedPart = string | ParsedToolCall;

/**
 * Parse the content to identify tool calls and regular text
 */
export function parseStreamContent(content: string): ParsedPart[] {
  if (!content) return [];
  
  const parts: ParsedPart[] = [];
  let currentIndex = 0;
  
  // Find all potential tool call occurrences using a simpler approach
  const tagMatches = Array.from(content.matchAll(/<([a-z-_]+)([^>]*)>([\s\S]*?)(?:<\/\1>|$)/gi));
  
  for (const match of tagMatches) {
    const matchIndex = match.index!;
    
    // Add any text before this tool call
    if (matchIndex > currentIndex) {
      parts.push(content.substring(currentIndex, matchIndex));
    }
    
    const [fullMatch, tagName, attributesString, toolContent] = match;
    const hasClosingTag = fullMatch.includes(`</${tagName}>`);
    
    // Parse attributes
    const attributes: Record<string, string> = {};
    
    // Handle both attribute="value" and attribute=value formats
    const attributeMatches = attributesString.matchAll(/([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi);
    
    for (const attrMatch of Array.from(attributeMatches)) {
      const [, name, doubleQuoted, singleQuoted, unquoted] = attrMatch;
      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
      attributes[name] = value;
    }
    
    parts.push({
      name: tagName,
      arguments: attributes,
      content: toolContent,
      type: 'tool_call',
      state: hasClosingTag ? 'complete' : 'processing'
    });
    
    currentIndex = matchIndex + fullMatch.length;
  }
  
  // Add any remaining text
  if (currentIndex < content.length) {
    parts.push(content.substring(currentIndex));
  }
  
  return parts;
} 