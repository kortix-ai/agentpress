import os
import sys
import asyncio
import unittest
import json
from pathlib import Path

from agent.tools.files_tool import FilesTool

class TestFilesTool(unittest.TestCase):
    """Test suite for the FilesTool class"""
    
    def setUp(self):
        """Set up test environment before each test"""
        self.files_tool = FilesTool()
        self.test_file_path = "test_file.txt"
        self.test_content = (
            "Line 1: This is a test file.\n"
            "Line 2: With multiple lines.\n"
            "Line 3: For testing line reading.\n"
            "Line 4: And other features.\n"
            "Line 5: End of test file."
        )
        
        # Clean up any existing test file before each test
        self._clean_test_file()
        
    def tearDown(self):
        """Clean up after each test"""
        self._clean_test_file()
    
    def _clean_test_file(self):
        """Helper to remove test file if it exists"""
        full_path = os.path.join(self.files_tool.workspace, self.test_file_path)
        if os.path.exists(full_path):
            os.remove(full_path)
    
    def _extract_json_data(self, result):
        """Extract JSON data from ToolResult output"""
        return json.loads(result.output)
    
    async def test_write_file_create(self):
        """Test writing to a new file"""
        result = await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        self.assertTrue(result.success)
        
        # Verify file exists and has correct content
        full_path = os.path.join(self.files_tool.workspace, self.test_file_path)
        self.assertTrue(os.path.exists(full_path))
        with open(full_path, 'r') as f:
            content = f.read()
        self.assertEqual(content, self.test_content)
    
    async def test_read_file_entire(self):
        """Test reading an entire file"""
        # First create the file
        await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        
        # Then read it
        result = await self.files_tool.read_file(self.test_file_path, read_entire=True)
        self.assertTrue(result.success)
        
        # Parse the output as JSON
        data = self._extract_json_data(result)
        self.assertEqual(data['content'], self.test_content)
        self.assertEqual(data['total_lines'], 5)
    
    async def test_read_file_lines(self):
        """Test reading specific lines from a file"""
        # First create the file
        await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        
        # Read lines 2-4
        result = await self.files_tool.read_file(self.test_file_path, start_line=2, end_line=4)
        self.assertTrue(result.success)
        
        # Expected content for lines 2-4
        expected_content = (
            "Line 2: With multiple lines.\n"
            "Line 3: For testing line reading.\n"
            "Line 4: And other features.\n"
        )
        
        # Parse the output as JSON
        data = self._extract_json_data(result)
        self.assertEqual(data['content'], expected_content)
        self.assertEqual(data['start_line'], 2)
        self.assertEqual(data['end_line'], 4)
        
        # Verify summary shows proper line ranges not shown
        self.assertIn("Lines 1-1 not shown", data['summary'])
        self.assertIn("Lines 5-5 not shown", data['summary'])
    
    async def test_write_file_update(self):
        """Test updating an existing file"""
        # First create the file
        await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        
        # Update file with new content
        updated_content = self.test_content + "\nLine 6: This line was added in an update."
        result = await self.files_tool.write_to_file(self.test_file_path, updated_content)
        self.assertTrue(result.success)
        
        # Verify file has updated content
        full_path = os.path.join(self.files_tool.workspace, self.test_file_path)
        with open(full_path, 'r') as f:
            content = f.read()
        self.assertEqual(content, updated_content)
    
    async def test_replace_in_file(self):
        """Test replacing content in a file using SEARCH/REPLACE blocks"""
        # First create the file
        await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        
        # Replace content
        diff = """<<<<<<< SEARCH
Line 3: For testing line reading.
=======
Line 3: This line was changed using replace_in_file.
>>>>>>> REPLACE"""
        
        result = await self.files_tool.replace_in_file(self.test_file_path, diff)
        self.assertTrue(result.success)
        
        # Verify file has replaced content
        expected_content = (
            "Line 1: This is a test file.\n"
            "Line 2: With multiple lines.\n"
            "Line 3: This line was changed using replace_in_file.\n"
            "Line 4: And other features.\n"
            "Line 5: End of test file."
        )
        
        # Read the file after replacement and verify content
        read_result = await self.files_tool.read_file(self.test_file_path, read_entire=True)
        data = self._extract_json_data(read_result)
        self.assertEqual(data['content'], expected_content)
    
    async def test_delete_file(self):
        """Test deleting a file"""
        # First create the file
        await self.files_tool.write_to_file(self.test_file_path, self.test_content)
        
        # Verify file exists
        full_path = os.path.join(self.files_tool.workspace, self.test_file_path)
        self.assertTrue(os.path.exists(full_path))
        
        # Delete the file
        result = await self.files_tool.delete_file(path=self.test_file_path)
        self.assertTrue(result.success)
        
        # Verify file no longer exists
        self.assertFalse(os.path.exists(full_path))
    
    async def test_read_nonexistent_file(self):
        """Test reading a file that doesn't exist"""
        result = await self.files_tool.read_file("nonexistent_file.txt")
        self.assertFalse(result.success)
        self.assertIn("does not exist", result.output)

# Function to run tests from command line
async def run_tests():
    """Run all tests asynchronously"""
    test_cases = [
        TestFilesTool('test_write_file_create'),
        TestFilesTool('test_read_file_entire'),
        TestFilesTool('test_read_file_lines'),
        TestFilesTool('test_write_file_update'),
        TestFilesTool('test_replace_in_file'),
        TestFilesTool('test_delete_file'),
        TestFilesTool('test_read_nonexistent_file')
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
    print("Running FilesTool tests...")
    asyncio.run(run_tests())
    print("\nAll tests completed!")