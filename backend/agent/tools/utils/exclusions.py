"""
Exclusion patterns for file operations.

This module contains constants and utility functions for
excluding certain files and directories from operations.
"""

import os

# Files to exclude from operations
EXCLUDED_FILES = {
    ".DS_Store",
    ".gitignore",
    "package-lock.json",
    "postcss.config.js",
    "postcss.config.mjs",
    "jsconfig.json",
    "components.json",
    "tsconfig.tsbuildinfo",
    "tsconfig.json",
}

# Directories to exclude from operations
EXCLUDED_DIRS = {
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git"
}

# File extensions to exclude from operations
EXCLUDED_EXT = {
    ".ico",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".webp",
    ".db",
    ".sql"
}

def should_exclude_file(rel_path: str) -> bool:
    """Check if a file should be excluded based on path, name, or extension
    
    Args:
        rel_path: Relative path of the file to check
        
    Returns:
        True if the file should be excluded, False otherwise
    """
    # Check filename
    filename = os.path.basename(rel_path)
    if filename in EXCLUDED_FILES:
        return True

    # Check directory
    dir_path = os.path.dirname(rel_path)
    if any(excluded in dir_path for excluded in EXCLUDED_DIRS):
        return True

    # Check extension
    _, ext = os.path.splitext(filename)
    if ext.lower() in EXCLUDED_EXT:
        return True

    return False 