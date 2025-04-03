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
    <title>AI-Powered Web App</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Welcome to AI-Powered Development</h1>
            <p>This code was enhanced with AI assistance</p>
        </header>
        
        <main>
            <section class="features">
                <div class="feature">
                    <h2>Code Completion</h2>
                    <p>Intelligent code suggestions as you type</p>
                </div>
                
                <div class="feature">
                    <h2>Code Generation</h2>
                    <p>Generate entire functions from comments</p>
                </div>
                
                <div class="feature">
                    <h2>Bug Detection</h2>
                    <p>Identify and fix issues before they cause problems</p>
                </div>
            </section>
        </main>
        
        <footer>
            <p>Built with AI assistance - 2023</p>
        </footer>
    </div>
    
    <script src="script.js"></script>
</body>
</html>`,
        'styles.css': `/* Global styles */
:root {
    --primary-color: #007acc;
    --secondary-color: #4caf50;
    --dark-color: #333;
    --light-color: #f4f4f4;
    --danger-color: #dc3545;
    --success-color: #28a745;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: var(--dark-color);
    background-color: var(--light-color);
}

.container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 2rem;
}

header {
    text-align: center;
    padding: 2rem 0;
    background-color: var(--primary-color);
    color: white;
    margin-bottom: 2rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
}

.feature {
    background-color: white;
    padding: 2rem;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
}

.feature:hover {
    transform: translateY(-5px);
}

footer {
    text-align: center;
    padding: 1rem;
    background-color: var(--dark-color);
    color: white;
}

@media (max-width: 768px) {
    .features {
        grid-template-columns: 1fr;
    }
}`,
        'script.js': `// Main application script
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI-Powered Web App initialized');
    
    // Initialize the application
    initApp();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the application
 * Sets up the initial state and loads any required data
 */
function initApp() {
    // Display a welcome message
    showWelcomeMessage();
    
    // Check if user has visited before
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (!hasVisited) {
        // First time visitor
        showFirstTimeVisitorMessage();
        localStorage.setItem('hasVisited', 'true');
    }
    
    // Simulate loading data
    simulateLoading();
}

/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Get all feature elements
    const features = document.querySelectorAll('.feature');
    
    // Add click event to each feature
    features.forEach(feature => {
        feature.addEventListener('click', () => {
            highlightFeature(feature);
        });
    });
}

/**
 * Display a welcome message to the user
 */
function showWelcomeMessage() {
    console.log('Welcome to the AI-Powered Web App!');
}

/**
 * Show a special message for first-time visitors
 */
function showFirstTimeVisitorMessage() {
    console.log('Welcome, first-time visitor!');
}

/**
 * Highlight a feature when clicked
 * @param {HTMLElement} feature - The feature element to highlight
 */
function highlightFeature(feature) {
    // Remove highlight from all features
    document.querySelectorAll('.feature').forEach(f => {
        f.style.border = 'none';
    });
    
    // Add highlight to selected feature
    feature.style.border = '2px solid var(--primary-color)';
}

/**
 * Simulate loading data from an API
 */
function simulateLoading() {
    console.log('Loading data...');
    
    // Simulate API delay
    setTimeout(() => {
        console.log('Data loaded successfully!');
    }, 1500);
}`,
        'README.md': `# AI-Powered Web Application

A demonstration of web development enhanced by AI assistance.

## Features

- **Code Completion**: Intelligent code suggestions as you type
- **Code Generation**: Generate entire functions from comments
- **Bug Detection**: Identify and fix issues before they cause problems

## Getting Started

1. Clone this repository
2. Open index.html in your browser
3. Explore the features

## How AI Enhances Development

This project demonstrates how AI can assist in the development process by:

- Providing intelligent code suggestions
- Generating boilerplate code
- Detecting potential bugs and issues
- Offering optimization suggestions
- Explaining complex code

## Technologies Used

- HTML5
- CSS3
- JavaScript
- AI-powered development tools`
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
                } else if (message.toLowerCase().includes('optimize') || message.toLowerCase().includes('improve')) {
                    aiResponse = `<p>I can help optimize your code. Here are some general improvements I often suggest:</p>
                    <p>1. Use modern JavaScript features (async/await, destructuring, etc.)</p>
                    <p>2. Implement proper error handling</p>
                    <p>3. Optimize DOM manipulations</p>
                    <p>4. Use CSS efficiently</p>
                    <p>If you share the specific code, I can provide tailored suggestions.</p>`;
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
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { background-color: rgba(0, 122, 204, 0.1); }
            50% { background-color: rgba(0, 122, 204, 0.3); }
            100% { background-color: rgba(0, 122, 204, 0.1); }
        }
    `;
    document.head.appendChild(style);
});