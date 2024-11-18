0.1.8
- Added base processor classes for extensible tool handling:
  - ToolParserBase: Abstract base class for parsing LLM responses
  - ToolExecutorBase: Abstract base class for tool execution strategies
  - ResultsAdderBase: Abstract base class for managing results
- Added dual support for OpenAPI and XML tool calling patterns:
  - XML schema decorator for XML-based tool definitions
  - XML-specific processors for parsing and execution
  - Standard processors for OpenAPI function calling
- Enhanced streaming capabilities:
  - execute_tools_on_stream: Execute tools in real-time during streaming

0.1.7
- v1 streaming responses
