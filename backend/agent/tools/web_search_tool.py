from exa_py import Exa
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema

# TODO: add subpages, etc... in filters as sometimes its necessary 

class WebSearchTool(Tool):
    """Tool for performing web searches using the Exa API."""

    def __init__(self, api_key: str = None):
        super().__init__()
        # Load environment variables
        load_dotenv()
        # Use the provided API key or get it from environment variables
        self.api_key = api_key or os.getenv("EXA_API_KEY")
        if not self.api_key:
            raise ValueError("EXA_API_KEY not found in environment variables")
        self.exa = Exa(api_key=self.api_key)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web for up-to-date information on a specific topic using the Exa API. This tool allows you to gather real-time information from the internet to answer user queries, research topics, validate facts, and find recent developments. Results include titles, URLs, summaries, and publication dates. Use this tool for discovering relevant web pages before potentially crawling them for complete content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant web pages. Be specific and include key terms to improve search accuracy. For best results, use natural language questions or keyword combinations that precisely describe what you're looking for."
                    },
                    "summary": {
                        "type": "boolean",
                        "description": "Whether to include a summary of each search result. Summaries provide key context about each page without requiring full content extraction. Set to true to get concise descriptions of each result.",
                        "default": True
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "The number of search results to return. Increase for more comprehensive research or decrease for focused, high-relevance results.",
                        "default": 20
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
            {"param_name": "num_results", "node_type": "attribute", "path": "."}
        ],
        example='''
        <!-- 
        The web-search tool allows you to search the internet for real-time information.
        Use this tool when you need to find current information, research topics, or verify facts.
        
        The tool returns information including:
        - Titles of relevant web pages
        - URLs for accessing the pages
        - Summaries of page content (if summary=true)
        - Published dates (when available)
        -->
        
        <!-- Simple search example -->
        <web-search 
            query="current weather in New York City" 
            summary="true"
            num_results="20">
        </web-search>
        
        <!-- Another search example -->
        <web-search 
            query="healthy breakfast recipes" 
            summary="true"
            num_results="20">
        </web-search>
        '''
    )
    async def web_search(
        self, 
        query: str, 
        summary: bool = True,
        num_results: int = 20
    ) -> ToolResult:
        """
        Search the web using the Exa API to find relevant and up-to-date information.
        
        This function performs a web search based on the provided query and returns a list
        of relevant search results. Each result includes metadata about the webpage, such as
        title, URL, summary (if requested), publication date, and relevance score.
        
        The returned data for each result includes:
        - Title: The title of the webpage
        - URL: The URL of the webpage 
        - Summary: A brief summary of the webpage content (if summary=True)
        - Published Date: When the content was published (if available)
        - Score: The relevance score of the result
        
        Parameters:
        - query: The search query to find relevant web pages
        - summary: Whether to include a summary of the results (default: True)
        - num_results: The number of results to return (default: 20)
        """
        try:
            # Ensure we have a valid query
            if not query or not isinstance(query, str):
                return self.fail_response("A valid search query is required.")
            
            # Basic parameters - use only the minimum required to avoid API errors
            params = {
                "query": query,
                "type": "auto",
                "livecrawl": "auto"
            }
            
            # Handle summary parameter (boolean conversion)
            if summary is None:
                params["summary"] = True
            elif isinstance(summary, bool):
                params["summary"] = summary
            elif isinstance(summary, str):
                params["summary"] = summary.lower() == "true"
            else:
                params["summary"] = True
                
            # Handle num_results parameter (integer conversion)
            if num_results is None:
                params["num_results"] = 20
            elif isinstance(num_results, int):
                params["num_results"] = max(1, min(num_results, 50))
            elif isinstance(num_results, str):
                try:
                    params["num_results"] = max(1, min(int(num_results), 50))
                except ValueError:
                    params["num_results"] = 20
            else:
                params["num_results"] = 20
                
            # Execute the search with minimal parameters
            search_response = self.exa.search_and_contents(**params)
            
            # Format the results
            formatted_results = []
            for result in search_response.results:
                formatted_result = {
                    "Title": result.title,
                    "URL": result.url
                }
                
                # Add optional fields if they exist
                if hasattr(result, 'summary') and result.summary:
                    formatted_result["Summary"] = result.summary
                    
                if hasattr(result, 'published_date') and result.published_date:
                    formatted_result["Published Date"] = result.published_date
                    
                if hasattr(result, 'score'):
                    formatted_result["Score"] = result.score
                    
                formatted_results.append(formatted_result)
            
            return self.success_response(formatted_results)
        
        except Exception as e:
            error_message = str(e)
            simplified_message = f"Error performing web search: {error_message[:200]}"
            if len(error_message) > 200:
                simplified_message += "..."
            return self.fail_response(simplified_message)

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "crawl_webpage",
            "description": "Retrieve the complete text content of a specific webpage. This tool extracts the full text content from any accessible web page and returns it for analysis, processing, or reference. The extracted text includes the main content of the page without HTML markup. Note that some pages may have limitations on access due to paywalls, access restrictions, or dynamic content loading.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The complete URL of the webpage to crawl. This should be a valid, accessible web address including the protocol (http:// or https://). The tool will attempt to extract all text content from this URL."
                    }
                },
                "required": ["url"]
            }
        }
    })
    @xml_schema(
        tag_name="crawl-webpage",
        mappings=[
            {"param_name": "url", "node_type": "attribute", "path": "."}
        ],
        example='''
        <!-- 
        The crawl-webpage tool extracts the complete text content from web pages.
        Use this tool when you need detailed information from specific web pages.
        -->
        
        <!-- Basic webpage crawl example -->
        <crawl-webpage 
            url="https://example.com/article/technology-trends">
        </crawl-webpage>
        '''
    )
    async def crawl_webpage(
        self,
        url: str
    ) -> ToolResult:
        """
        Retrieve the complete text content of a webpage using the Exa API.
        
        This function crawls the specified URL and extracts the full text content from the page.
        The extracted text is returned in the response, making it available for further analysis,
        processing, or reference.
        
        The returned data includes:
        - Title: The title of the webpage
        - URL: The URL of the crawled page
        - Published Date: When the content was published (if available)
        - Text: The complete text content of the webpage
        
        Note that some pages may have limitations on access due to paywalls, 
        access restrictions, or dynamic content loading.
        
        Parameters:
        - url: The URL of the webpage to crawl
        """
        try:
            # Parse the URL parameter exactly as it would appear in XML
            if not url:
                return self.fail_response("A valid URL is required.")
                
            # Handle url parameter (as it would appear in XML)
            if isinstance(url, str):
                # Add protocol if missing
                if not (url.startswith('http://') or url.startswith('https://')):
                    url = 'https://' + url
            else:
                return self.fail_response("URL must be a string.")
                
            # Execute the crawl with the parsed URL
            result = self.exa.get_contents(
                [url],
                text=True,
                livecrawl="auto"
            )
            
            # Format the results to include all available fields
            formatted_results = []
            for content in result.results:
                formatted_result = {
                    "Title": content.title,
                    "URL": content.url,
                    "Text": content.text
                }
                
                # Add optional fields if they exist
                if hasattr(content, 'published_date') and content.published_date:
                    formatted_result["Published Date"] = content.published_date
                    
                formatted_results.append(formatted_result)
            
            return self.success_response(formatted_results)
        
        except Exception as e:
            error_message = str(e)
            # Truncate very long error messages
            simplified_message = f"Error crawling webpage: {error_message[:200]}"
            if len(error_message) > 200:
                simplified_message += "..."
            return self.fail_response(simplified_message)


if __name__ == "__main__":
    import asyncio
    
    # async def test_web_search():
    #     """Test function for the web search tool"""
    #     search_tool = WebSearchTool()
    #     result = await search_tool.web_search(
    #         query="rubber gym mats best prices comparison",
    #         summary=True,
    #         num_results=20
    #     )
        # print(result)
    
    async def test_crawl_webpage():
        """Test function for the webpage crawl tool"""
        search_tool = WebSearchTool()
        result = await search_tool.crawl_webpage(
            url="https://example.com"
        )
        print(result)
    
    async def run_tests():
        """Run all test functions"""
        # await test_web_search()
        await test_crawl_webpage()
        
    asyncio.run(run_tests())
