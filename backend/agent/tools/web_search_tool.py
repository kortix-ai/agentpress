from exa_py import Exa
from typing import List, Optional
from datetime import datetime
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema

class ExaWebSearchTool(Tool):
    """Tool for performing web searches using the Exa API."""

    def __init__(self, api_key: str = "91ada9c3-6d2f-4cd6-90c2-c7d943c5db25"):
        super().__init__()
        self.exa = Exa(api_key=api_key)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for information on a specific topic using Exa API",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant web pages"
                    },
                    "summary": {
                        "type": "boolean",
                        "description": "Whether to include a summary of the results",
                        "default": True
                    },
                    "start_published_date": {
                        "type": "string",
                        "description": "Optional start date for when results were published (ISO format YYYY-MM-DDTHH:MM:SS.sssZ)"
                    },
                    "end_published_date": {
                        "type": "string",
                        "description": "Optional end date for when results were published (ISO format YYYY-MM-DDTHH:MM:SS.sssZ)"
                    },
                    "start_crawl_date": {
                        "type": "string",
                        "description": "Optional start date for when results were crawled (ISO format YYYY-MM-DDTHH:MM:SS.sssZ)"
                    },
                    "end_crawl_date": {
                        "type": "string",
                        "description": "Optional end date for when results were crawled (ISO format YYYY-MM-DDTHH:MM:SS.sssZ)"
                    },
                    "include_text": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "A list of terms that must be included in the results"
                    },
                    "exclude_text": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "A list of terms that must be excluded from the results"
                    },
                    # "livecrawl": {
                    #     "type": "string",
                    #     "description": "Whether to perform a live crawl - 'always', 'fallback', or 'never'",
                    #     "default": "always"
                    # },
                    "num_results": {
                        "type": "integer",
                        "description": "The number of results to return",
                        "default": 10
                    },
                    "type": {
                        "type": "string",
                        "description": "The type of search to perform - 'auto', 'keyword', or 'neural'",
                        "default": "auto"
                    }
                },
                "required": ["query"]
            }
        }
    })
    @xml_schema(
        tag_name="web-search",
        mappings=[
            {"param_name": "query", "node_type": "attribute", "path": "."},
            {"param_name": "summary", "node_type": "attribute", "path": "."},
            {"param_name": "start_published_date", "node_type": "attribute", "path": "."},
            {"param_name": "end_published_date", "node_type": "attribute", "path": "."},
            {"param_name": "start_crawl_date", "node_type": "attribute", "path": "."},
            {"param_name": "end_crawl_date", "node_type": "attribute", "path": "."},
            {"param_name": "include_text", "node_type": "attribute", "path": "."},
            {"param_name": "exclude_text", "node_type": "attribute", "path": "."},
            # {"param_name": "livecrawl", "node_type": "attribute", "path": "."},
            {"param_name": "num_results", "node_type": "attribute", "path": "."},
            {"param_name": "type", "node_type": "attribute", "path": "."}
        ],
        example='''
        <web-search 
            query="rubber gym mats best prices comparison" 
            summary="true" 
            include_text="important term"
            exclude_text="unwanted term"
            num_results="10" 
            type="auto">
        </web-search>
        '''
    )
    async def web_search(
        self, 
        query: str, 
        summary: bool = True,
        start_published_date: Optional[str] = None,
        end_published_date: Optional[str] = None,
        start_crawl_date: Optional[str] = None,
        end_crawl_date: Optional[str] = None,
        include_text: Optional[List[str]] = None,
        exclude_text: Optional[List[str]] = None,
        # livecrawl: str = "always",
        num_results: int = 10,
        type: str = "auto"
    ) -> ToolResult:
        """
        Search the web using the Exa API.
        
        Parameters:
        - query: The search query to find relevant web pages
        - summary: Whether to include a summary of the results (default: True)
        - start_published_date: Optional start date for published results (ISO format)
        - end_published_date: Optional end date for published results (ISO format)
        - start_crawl_date: Optional start date for crawled results (ISO format)
        - end_crawl_date: Optional end date for crawled results (ISO format)
        - include_text: List of terms that must be included in the results
        - exclude_text: List of terms that must be excluded from the results
        - num_results: The number of results to return (default: 10)
        - type: The type of search to perform - 'auto', 'keyword', or 'neural' (default: 'auto')
        """
        try:
            # Prepare parameters, only including non-None values
            params = {"query": query, "summary": summary, "num_results": num_results}
            
            if start_published_date:
                params["start_published_date"] = start_published_date
            if end_published_date:
                params["end_published_date"] = end_published_date
            if start_crawl_date:
                params["start_crawl_date"] = start_crawl_date
            if end_crawl_date:
                params["end_crawl_date"] = end_crawl_date
            if include_text:
                params["include_text"] = include_text
            if exclude_text:
                params["exclude_text"] = exclude_text
            # if livecrawl:
            #     params["livecrawl"] = livecrawl
            if type:
                params["type"] = type
            
            # Execute the search
            search_response = self.exa.search_and_contents(**params)
            
            # Convert to string representation
            results_data = str(search_response)
            
            return self.success_response(results_data)
        
        except Exception as e:
            return self.fail_response(f"Error performing web search: {str(e)}")


if __name__ == "__main__":
    import asyncio
    
    async def test_web_search():
        """Test function for the web search tool"""
        search_tool = ExaWebSearchTool()
        result = await search_tool.web_search(
            query="rubber gym mats best prices comparison",
            summary=False,
            num_results=10
        )
        print(result)
        
    asyncio.run(test_web_search())
