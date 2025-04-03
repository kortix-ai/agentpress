document.addEventListener('DOMContentLoaded', function() {
    // Initialize highlight.js for syntax highlighting
    hljs.highlightAll();
    
    // Custom cursor implementation
    const customCursor = document.createElement('div');
    customCursor.className = 'custom-cursor';
    document.body.appendChild(customCursor);
    
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.appendChild(cursorDot);
    
    // Update cursor position
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
        
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });
    
    // Cursor effects on interactive elements
    const interactiveElements = document.querySelectorAll('button, .sidebar-icon, .tab, .file, .folder-header, .panel-actions i, .close-feature');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            customCursor.style.width = '40px';
            customCursor.style.height = '40px';
            customCursor.style.backgroundColor = 'rgba(0, 122, 204, 0.2)';
        });
        
        element.addEventListener('mouseleave', () => {
            customCursor.style.width = '20px';
            customCursor.style.height = '20px';
            customCursor.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
    });
    
    // Hide default cursor
    document.body.style.cursor = 'none';
    
    // Make all elements use custom cursor
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        element.style.cursor = 'none';
    });
    
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
    <title>Cursor Clone</title>
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
    console.log('Cursor Clone initialized');
    
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
        'README.md': `# Cursor Clone

A lightweight clone of the Cursor IDE built with HTML, CSS, and JavaScript.

## Features

- Modern UI similar to Cursor IDE
- Syntax highlighting
- File explorer
- AI assistant panel
- Tab management
- Custom cursor effects

## Getting Started

1. Clone this repository
2. Open cursor-clone.html in your browser
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
        updateLineNumbers();
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
                let aiResponse = '';
                
                // Generate different responses based on user input
                if (message.toLowerCase().includes('help') || message.toLowerCase().includes('how')) {
                    aiResponse = `<p>I'd be happy to help! Here are some things I can do:</p>
                    <p>1. Generate code based on your requirements</p>
                    <p>2. Explain code and concepts</p>
                    <p>3. Debug issues in your code</p>
                    <p>4. Suggest optimizations</p>
                    <p>Just let me know what you need!</p>`;
                } else if (message.toLowerCase().includes('generate') || message.toLowerCase().includes('create')) {
                    aiResponse = `<p>I can help generate code for you. Could you provide more details about what you'd like me to create?</p>
                    <p>For example:</p>
                    <p>- A specific function or component</p>
                    <p>- A particular feature</p>
                    <p>- A complete page layout</p>`;
                } else if (message.toLowerCase().includes('bug') || message.toLowerCase().includes('fix') || message.toLowerCase().includes('issue')) {
                    aiResponse = `<p>I'll help you fix that issue. To better assist you, could you:</p>
                    <p>1. Share the specific code that's causing problems</p>
                    <p>2. Describe the expected behavior</p>
                    <p>3. Explain what's currently happening</p>
                    <p>With this information, I can suggest a solution.</p>`;
                } else {
                    aiResponse = `<p>I've analyzed your message and I'm ready to assist. Would you like me to:</p>
                    <p>1. Generate some code based on your requirements?</p>
                    <p>2. Explain a concept or piece of code?</p>
                    <p>3. Help debug an issue?</p>
                    <p>4. Suggest optimizations?</p>
                    <p>Just let me know how I can best help you!</p>`;
                }
                
                const aiMessageHTML = `
                    <div class="ai-message">
                        <div class="ai-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            ${aiResponse}
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
    
    // AI Features Showcase
    const featureCards = document.querySelectorAll('.feature-card');
    const closeFeatureButtons = document.querySelectorAll('.close-feature');
    
    closeFeatureButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            featureCards[index].style.display = 'none';
        });
    });
    
    // Simulate typing effect for code completion
    setTimeout(() => {
        const codeCompletionCard = document.querySelector('.code-completion');
        const suggestionItem = codeCompletionCard.querySelector('.suggestion-item');
        
        suggestionItem.style.animation = 'pulse 2s infinite';
    }, 3000);
    
    // Initialize with the first file
    updateEditor('index.html');
    updateLineNumbers();
    
    // Add click effect
    document.addEventListener('mousedown', () => {
        customCursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });
    
    document.addEventListener('mouseup', () => {
        customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });
});