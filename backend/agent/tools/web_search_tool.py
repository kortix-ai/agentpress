import asyncio
import os

from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from exa_py import Exa

# Load environment variables
load_dotenv()

class SearchTool(Tool):
    """Tool for executing web searches using the Exa API."""
    
    def __init__(self):
        super().__init__()
        self.exa = Exa(api_key="91ada9c3-6d2f-4cd6-90c2-c7d943c5db25")
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "info_search_web",
            "description": "Search web pages using search engine. Use for obtaining latest information or finding references.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="info-search-web",
        mappings=[
            {"param_name": "query", "node_type": "content", "path": "."}
        ],
        example='''
        <info-search-web>
        search query here
        </info-search-web>
        '''
    )
    async def info_search_web(self, query: str) -> ToolResult:
        try:
            # Build search parameters with hardcoded defaults
            params: Dict[str, Any] = {
                "use_autoprompt": True,
                "include_domains": None,
                "start_published_date": None,
                "end_published_date": None
            }

            # Perform search with contents and highlights
            search_response = self.exa.search_and_contents(
                query,
                highlights=True,
                **params
            )

            # Format response
            formatted_results = []
            for result in search_response.results:
                formatted_result = {
                    "title": result.title if hasattr(result, 'title') else "",
                    "url": result.url if hasattr(result, 'url') else "",
                    "published_date": result.published_date if hasattr(result, 'published_date') else "",
                    "text": result.text if hasattr(result, 'text') else "",
                    "highlights": result.highlights if hasattr(result, 'highlights') else []
                }
                formatted_results.append(formatted_result)

            print("************* ")
            print(formatted_results)
            print("************* ")
            return self.success_response({
                "results": formatted_results,
                "total": len(formatted_results)
            })

        except Exception as e:
            return self.fail_response(f"Error performing web search: {str(e)}")

async def main():
    """Main execution function with proper async handling."""
    search_tool = SearchTool()
    try:
        print("\nTesting search functionality...")
        result = await search_tool.info_search_web(
            "Latest developments in AI", 
            use_autoprompt=True,
            include_domains=["www.techcrunch.com", "www.wired.com"],
            start_date="2023-01-01"
        )
        print(result.output if result.success else result)
        print("\nAll operations complete!")
    except Exception as e:
        print(f"\nError during execution: {str(e)}")
        raise

if __name__ == "__main__":
    # Run the async main function with a proper event loop
    asyncio.run(main())