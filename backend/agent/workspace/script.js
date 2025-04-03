document.addEventListener('DOMContentLoaded', function() {
    // Initialize highlight.js for syntax highlighting
    hljs.highlightAll();
    
    // Toggle AI Panel
    const aiIcon = document.querySelector('.ai-icon');
    const aiPanel = document.querySelector('.ai-panel');
    const closeAiPanel = document.querySelector('.close-ai-panel');
    
    aiIcon.addEventListener('click', function() {
        aiPanel.classList.toggle('active');
    });
    
    closeAiPanel.addEventListener('click', function() {
        aiPanel.classList.remove('active');
    });
    
    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab');
    const files = document.querySelectorAll('.file');
    
    // Sample code snippets for different file types
    const codeSnippets = {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cursor IDE Clone</title>
    <link rel="stylesheet" href="styles.css">
    <script src="script.js" defer></script>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <!-- Sidebar content -->
        </div>
        
        <!-- Main content -->
        <div class="main-content">
            <!-- Editor area -->
        </div>
    </div>
</body>
</html>`,
        'styles.css': `/* Global Styles */
:root {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252526;
    --text-primary: #d4d4d4;
    --accent-blue: #007acc;
}

body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', sans-serif;
}

.app-container {
    display: flex;
    height: 100vh;
}

/* Sidebar styles */
.sidebar {
    width: 50px;
    background-color: var(--bg-secondary);
}`,
        'script.js': `// Main application script
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
    
    // Set up event listeners
    setupEventListeners();
});

function initApp() {
    console.log('Cursor IDE Clone initialized');
    
    // Load user preferences
    loadUserPreferences();
    
    // Set up the editor
    setupEditor();
}

function setupEventListeners() {
    // Add event listeners for UI interactions
    document.querySelector('.sidebar').addEventListener('click', handleSidebarClick);
}

function loadUserPreferences() {
    // Load saved user preferences from localStorage
    const theme = localStorage.getItem('theme') || 'dark';
    applyTheme(theme);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
}`,
        'README.md': `# Cursor IDE Clone

A lightweight clone of the Cursor IDE built with HTML, CSS, and JavaScript.

## Features

- Modern UI similar to Cursor IDE
- Syntax highlighting
- File explorer
- AI assistant panel
- Tab management

## Getting Started

1. Clone this repository
2. Open index.html in your browser
3. Start coding!

## Technologies Used

- HTML5
- CSS3
- JavaScript
- highlight.js for syntax highlighting`
    };
    
    // Function to update the editor content
    function updateEditor(fileName) {
        const codeArea = document.querySelector('.code-area code');
        const statusLanguage = document.querySelector('.status-right .status-item:first-child span');
        
        let language = 'html';
        if (fileName.endsWith('.css')) language = 'css';
        if (fileName.endsWith('.js')) language = 'javascript';
        if (fileName.endsWith('.md')) language = 'markdown';
        
        codeArea.className = `language-${language}`;
        codeArea.textContent = codeSnippets[fileName] || '';
        statusLanguage.textContent = language.toUpperCase();
        
        hljs.highlightElement(codeArea);
    }
    
    // Handle tab clicks
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Update editor content based on selected tab
            const fileName = this.querySelector('span').textContent;
            updateEditor(fileName);
            
            // Update active file in explorer
            files.forEach(file => {
                file.classList.remove('active');
                if (file.querySelector('span').textContent === fileName) {
                    file.classList.add('active');
                }
            });
        });
    });
    
    // Handle file clicks in explorer
    files.forEach(file => {
        file.addEventListener('click', function() {
            // Remove active class from all files
            files.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked file
            this.classList.add('active');
            
            const fileName = this.querySelector('span').textContent;
            
            // Find and activate corresponding tab
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.querySelector('span').textContent === fileName) {
                    tab.classList.add('active');
                }
            });
            
            // Update editor content
            updateEditor(fileName);
        });
    });
    
    // Handle AI chat input
    const aiInput = document.querySelector('.ai-input textarea');
    const sendButton = document.querySelector('.send-button');
    const aiChat = document.querySelector('.ai-chat');
    
    function sendMessage() {
        const message = aiInput.value.trim();
        if (message) {
            // Add user message to chat
            const userMessageHTML = `
                <div class="user-message">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="message-content">
                        <p>${message}</p>
                    </div>
                </div>
            `;
            aiChat.insertAdjacentHTML('beforeend', userMessageHTML);
            
            // Clear input
            aiInput.value = '';
            
            // Simulate AI response after a short delay
            setTimeout(() => {
                const aiResponses = [
                    "I've analyzed your code and it looks good! Here are some minor optimizations you could consider...",
                    "Let me help you with that. Based on best practices, I suggest restructuring this part of your code.",
                    "I can help implement that feature. Would you like me to generate the code for you?",
                    "That's a common issue. Try checking your function parameters - I think there might be a type mismatch.",
                    "Great question! The most efficient approach would be to use a map function here instead of a for loop."
                ];
                
                const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
                
                const aiMessageHTML = `
                    <div class="ai-message">
                        <div class="ai-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <p>${randomResponse}</p>
                        </div>
                    </div>
                `;
                aiChat.insertAdjacentHTML('beforeend', aiMessageHTML);
                
                // Scroll to bottom of chat
                aiChat.scrollTop = aiChat.scrollHeight;
            }, 1000);
            
            // Scroll to bottom of chat
            aiChat.scrollTop = aiChat.scrollHeight;
        }
    }
    
    sendButton.addEventListener('click', sendMessage);
    
    aiInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Generate line numbers dynamically
    function updateLineNumbers() {
        const codeLines = document.querySelector('.code-area code').textContent.split('\n').length;
        const lineNumbersContainer = document.querySelector('.line-numbers');
        
        // Clear existing line numbers
        lineNumbersContainer.innerHTML = '';
        
        // Add new line numbers
        for (let i = 1; i <= codeLines; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.textContent = i;
            lineNumbersContainer.appendChild(lineNumber);
        }
    }
    
    // Update line numbers when changing files
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            setTimeout(updateLineNumbers, 10);
        });
    });
    
    files.forEach(file => {
        file.addEventListener('click', function() {
            setTimeout(updateLineNumbers, 10);
        });
    });
    
    // Initialize with the first file
    updateEditor('index.html');
    updateLineNumbers();
});