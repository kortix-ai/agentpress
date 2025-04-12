from exa_py import Exa
from typing import List, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from agentpress.tool import Tool, ToolResult, openapi_schema, xml_schema

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
                    "start_published_date": {
                        "type": "string",
                        "description": "Optional start date to filter results by publication date (ISO format YYYY-MM-DDTHH:MM:SS.sssZ). Use this to find content published after a specific date, useful for recent news or updated information."
                    },
                    "end_published_date": {
                        "type": "string",
                        "description": "Optional end date to filter results by publication date (ISO format YYYY-MM-DDTHH:MM:SS.sssZ). Use this to limit results to content published before a specific date, helpful for historical information."
                    },
                    "start_crawl_date": {
                        "type": "string",
                        "description": "Optional start date to filter results by when they were crawled (ISO format YYYY-MM-DDTHH:MM:SS.sssZ). This can be useful for finding content that was recently indexed by search engines."
                    },
                    "end_crawl_date": {
                        "type": "string",
                        "description": "Optional end date to filter results by when they were crawled (ISO format YYYY-MM-DDTHH:MM:SS.sssZ). This can help filter out potentially outdated content."
                    },
                    "include_text": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "A list of terms that must be included in the search results. Use this to ensure results contain specific keywords, making them more relevant to the query."
                    },
                    "exclude_text": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "description": "A list of terms that must be excluded from the search results. Use this to filter out irrelevant content or focus the search away from certain topics."
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
            {"param_name": "start_published_date", "node_type": "attribute", "path": "."},
            {"param_name": "end_published_date", "node_type": "attribute", "path": "."},
            {"param_name": "start_crawl_date", "node_type": "attribute", "path": "."},
            {"param_name": "end_crawl_date", "node_type": "attribute", "path": "."},
            {"param_name": "include_text", "node_type": "attribute", "path": "."},
            {"param_name": "exclude_text", "node_type": "attribute", "path": "."},
            {"param_name": "num_results", "node_type": "attribute", "path": "."}
        ],
        example='''
        <!-- 
        The web-search tool allows you to search the internet for real-time information.
        It's ideal for:
        - Finding current information not in your training data
        - Researching specific topics, events, or entities
        - Validating facts and claims
        - Discovering recent developments and news
        
        You can refine searches using:
        - Date filters (start_published_date, end_published_date) for time-specific content
        - Text inclusion/exclusion to narrow results to relevant content
        - Number of results to control search breadth
        
        The tool returns organized information including titles, URLs, summaries, and publication dates.
        -->
        
        <!-- Basic search example -->
        <web-search 
            query="latest developments in artificial intelligence" 
            summary="true"
            num_results="10">
        </web-search>
        
        <!-- Advanced search with filters -->
        <web-search 
            query="renewable energy technology" 
            summary="true"
            start_published_date="2023-01-01T00:00:00.000Z"
            include_text="solar,wind"
            exclude_text="fossil"
            num_results="15">
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
        
        Use this function to discover relevant web pages before potentially 
        using crawl_webpage to extract their complete content.
        
        Parameters:
        - query: The search query to find relevant web pages
        - summary: Whether to include a summary of the results (default: True)
        - start_published_date: Optional start date for published results (ISO format)
        - end_published_date: Optional end date for published results (ISO format)
        - start_crawl_date: Optional start date for crawled results (ISO format)
        - end_crawl_date: Optional end date for crawled results (ISO format)
        - include_text: List of terms that must be included in the results
        - exclude_text: List of terms that must be excluded from the results
        - num_results: The number of results to return (default: 20)
        """
        try:
            # Handle string to boolean conversion for the summary parameter
            if isinstance(summary, str):
                summary = summary.lower() == "true"
                
            # Handle string to integer conversion for the num_results parameter
            if isinstance(num_results, str):
                num_results = int(num_results)
                
            # Prepare parameters, only including non-None values
            params = {"query": query, "summary": summary, "num_results": num_results, "type": "auto"}
            
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
            
            # Execute the search
            search_response = self.exa.search_and_contents(**params)

            # print(search_response)
            
            # Format the results to include only specified fields
            formatted_results = []
            for result in search_response.results:
                formatted_result = {
                    "Title": result.title,
                    "URL": result.url,
                    "Summary": result.summary if hasattr(result, 'summary') else None,
                    "Published Date": result.published_date,
                    "Score": result.score
                }
                formatted_results.append(formatted_result)

            # print(formatted_results)
            
            return self.success_response(formatted_results)
        
        except Exception as e:
            return self.fail_response(f"Error performing web search: {str(e)}")

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
        Use this tool when you need:
        
        - Detailed information from specific articles or pages
        - The full text content rather than just summaries
        - To analyze or process the contents of a webpage
        - To extract information for further processing
        
        This tool returns:
        - The webpage title
        - The original URL
        - Publication date (when available)
        - The complete text content of the page
        
        Common use cases:
        - Reading articles, blog posts, or news stories
        - Extracting documentation or technical guides
        - Gathering detailed product information
        - Researching academic or scientific content
        
        Note: Some content may be inaccessible due to paywalls, access restrictions,
        or dynamic content loading mechanisms.
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
            # Execute the content extraction
            result = self.exa.get_contents(
                [url],
                text=True
            )
            
            # print(result)

            # Format the results to include only specified fields
            formatted_results = []
            for content in result.results:
                formatted_result = {
                    "Title": content.title,
                    "URL": content.url,
                    "Published Date": content.published_date,
                    "Text": content.text
                }
                formatted_results.append(formatted_result)
            
            return self.success_response(formatted_results)
        
        except Exception as e:
            return self.fail_response(f"Error crawling webpage: {str(e)}")


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
