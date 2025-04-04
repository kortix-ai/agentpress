import os
import sys
import asyncio
import unittest
import json
import shutil
from pathlib import Path

from agent.tools.search_tool import CodeSearchTool

class TestCodeSearchTool(unittest.TestCase):
    """Test suite for the CodeSearchTool class"""
    
    def setUp(self):
        """Set up test environment before each test"""
        self.search_tool = CodeSearchTool()
        
        # Create test directory structure and files
        self.test_dir = "test_search_directory"
        self.test_subdir = os.path.join(self.test_dir, "subdir")
        
        # Create test directories
        os.makedirs(os.path.join(self.search_tool.workspace, self.test_dir), exist_ok=True)
        os.makedirs(os.path.join(self.search_tool.workspace, self.test_subdir), exist_ok=True)
        
        # Create test files with content
        self.test_files = {
            os.path.join(self.test_dir, "file1.txt"): "This is a test file\nwith multiple lines\nfor testing search functionality.",
            os.path.join(self.test_dir, "file2.js"): "function testFunction() {\n  // This is a JavaScript function\n  const isDarkMode = true;\n  return isDarkMode;\n}",
            os.path.join(self.test_subdir, "component.jsx"): "import React from 'react';\n\nfunction TestComponent() {\n  const isDarkMode = false;\n  return <div>Test Component</div>;\n}\n\nexport default TestComponent;"
        }
        
        for file_path, content in self.test_files.items():
            full_path = os.path.join(self.search_tool.workspace, file_path)
            with open(full_path, 'w') as f:
                f.write(content)
    
    def tearDown(self):
        """Clean up after each test"""
        # Remove test directory and all its contents
        test_dir_path = os.path.join(self.search_tool.workspace, self.test_dir)
        if os.path.exists(test_dir_path):
            shutil.rmtree(test_dir_path)
    
    def _extract_json_data(self, result):
        """Extract JSON data from ToolResult output"""
        return json.loads(result.output)
    
    async def test_list_dir(self):
        """Test listing directory contents"""
        # Test root test directory
        result = await self.search_tool.list_dir(self.test_dir)
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        self.assertEqual(data["path"], self.test_dir)
        
        # Should contain 2 items: file1.txt, file2.js, and subdir directory
        self.assertEqual(len(data["contents"]), 3)
        
        # Verify subdirectory is present
        subdir_items = [item for item in data["contents"] if item["name"] == "subdir"]
        self.assertEqual(len(subdir_items), 1)
        self.assertEqual(subdir_items[0]["type"], "directory")
        
        # Verify files are present
        file1_items = [item for item in data["contents"] if item["name"] == "file1.txt"]
        self.assertEqual(len(file1_items), 1)
        self.assertEqual(file1_items[0]["type"], "file")
        
        file2_items = [item for item in data["contents"] if item["name"] == "file2.js"]
        self.assertEqual(len(file2_items), 1)
        self.assertEqual(file2_items[0]["type"], "file")
    
    async def test_list_subdir(self):
        """Test listing subdirectory contents"""
        result = await self.search_tool.list_dir(self.test_subdir)
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        self.assertEqual(data["path"], self.test_subdir)
        
        # Should contain 1 item: component.jsx
        self.assertEqual(len(data["contents"]), 1)
        self.assertEqual(data["contents"][0]["name"], "component.jsx")
        self.assertEqual(data["contents"][0]["type"], "file")
    
    async def test_grep_search_exact_match(self):
        """Test grep search with exact text match"""
        # Search for "isDarkMode" which appears in file2.js and component.jsx
        result = await self.search_tool.grep_search("isDarkMode")
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        self.assertEqual(data["query"], "isDarkMode")
        
        # Should find at least 2 matches
        self.assertGreaterEqual(data["match_count"], 2)
        
        # Verify matches contain expected content
        js_matches = [match for match in data["matches"] if "file2.js" in match["file"]]
        jsx_matches = [match for match in data["matches"] if "component.jsx" in match["file"]]
        
        self.assertGreaterEqual(len(js_matches), 1)
        self.assertGreaterEqual(len(jsx_matches), 1)
    
    async def test_grep_search_with_include_pattern(self):
        """Test grep search with file pattern inclusion"""
        # Search for "isDarkMode" but only in .js files
        result = await self.search_tool.grep_search("isDarkMode", include_pattern="*.js")
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        
        # Should find 1 match in file2.js only
        js_matches = [match for match in data["matches"] if "file2.js" in match["file"]]
        jsx_matches = [match for match in data["matches"] if "component.jsx" in match["file"]]
        
        self.assertGreaterEqual(len(js_matches), 1)
        self.assertEqual(len(jsx_matches), 0)
    
    async def test_grep_search_case_insensitive(self):
        """Test grep search with case insensitivity"""
        # Search for "function" with case insensitivity
        result = await self.search_tool.grep_search("FUNCTION", case_sensitive=False)
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        
        # Should find matches for "function" (lowercase)
        self.assertGreaterEqual(data["match_count"], 2)
    
    async def test_file_search(self):
        """Test file search functionality"""
        # Search for files containing "component"
        result = await self.search_tool.file_search("component")
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        
        # Should find component.jsx
        self.assertGreaterEqual(data["count"], 1)
        
        # Verify component.jsx file is in results
        component_files = [file for file in data["files"] if "component.jsx" in file["file"]]
        self.assertGreaterEqual(len(component_files), 1)
    
    async def test_file_search_partial(self):
        """Test file search with partial filename"""
        # Search for files containing "file"
        result = await self.search_tool.file_search("file")
        self.assertTrue(result.success)
        
        data = self._extract_json_data(result)
        
        # Should find file1.txt and file2.js
        self.assertGreaterEqual(data["count"], 2)
        
        # Verify both files are in results
        file1_results = [file for file in data["files"] if "file1.txt" in file["file"]]
        file2_results = [file for file in data["files"] if "file2.js" in file["file"]]
        
        self.assertGreaterEqual(len(file1_results), 1)
        self.assertGreaterEqual(len(file2_results), 1)

# Function to run tests from command line
async def run_tests():
    """Run all tests asynchronously"""
    test_cases = [
        TestCodeSearchTool('test_list_dir'),
        TestCodeSearchTool('test_list_subdir'),
        TestCodeSearchTool('test_grep_search_exact_match'),
        TestCodeSearchTool('test_grep_search_with_include_pattern'),
        TestCodeSearchTool('test_grep_search_case_insensitive'),
        TestCodeSearchTool('test_file_search'),
        TestCodeSearchTool('test_file_search_partial')
    ]
    
    for test_case in test_cases:
        print(f"\n----- Running: {test_case._testMethodName} -----")
        test_case.setUp()  # Explicitly call setUp
        try:
            await getattr(test_case, test_case._testMethodName)()
            print(f"✓ {test_case._testMethodName} PASSED")
        except Exception as e:
            print(f"✗ {test_case._testMethodName} FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            test_case.tearDown()

if __name__ == "__main__":
    print("Running CodeSearchTool tests...")
    asyncio.run(run_tests())
    print("\nAll tests completed!") 