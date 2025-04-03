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
    const interactiveElements = document.querySelectorAll('button, .sidebar-icon, .tab, .file, .folder-header, .panel-actions i, .close-feature, .tool-button');
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            customCursor.style.width = '40px';
            customCursor.style.height = '40px';
            customCursor.style.backgroundColor = 'rgba(114, 9, 183, 0.2)';
        });
        
        element.addEventListener('mouseleave', () => {
            customCursor.style.width = '20px';
            customCursor.style.height = '20px';
            customCursor.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
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
    <title>WindBird Project</title>
    <link rel="stylesheet" href="styles.css">
    <script src="script.js" defer></script>
</head>
<body>
    <div class="app-container">
        <!-- Main content -->
        <header>
            <h1>Welcome to WindBird</h1>
            <p>The AI-powered development environment</p>
        </header>
        
        <main>
            <section class="features">
                <div class="feature">
                    <h2>Smart Completions</h2>
                    <p>Get intelligent code suggestions as you type</p>
                </div>
                
                <div class="feature">
                    <h2>AI Assistant</h2>
                    <p>Ask questions and get help with your code</p>
                </div>
                
                <div class="feature">
                    <h2>Code Generation</h2>
                    <p>Generate entire components from descriptions</p>
                </div>
            </section>
        </main>
    </div>
</body>
</html>`,
        'styles.css': `/* Global Styles */
:root {
    --primary-color: #7209b7;
    --secondary-color: #4361ee;
    --dark-color: #1a1a2e;
    --light-color: #f8f9fa;
    --accent-color: #4cc9f0;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', sans-serif;
}

body {
    background-color: var(--light-color);
    color: var(--dark-color);
    line-height: 1.6;
}

.app-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

header {
    text-align: center;
    margin-bottom: 3rem;
}

header h1 {
    color: var(--primary-color);
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

header p {
    color: var(--secondary-color);
    font-size: 1.2rem;
}

.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.feature {
    background-color: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.feature h2 {
    color: var(--primary-color);
    margin-bottom: 1rem;
}

.feature p {
    color: #555;
}

@media (max-width: 768px) {
    .features {
        grid-template-columns: 1fr;
    }
}`,
        'script.js': `// WindBird Project JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize the application
 */
function initApp() {
    console.log('WindBird Project initialized');
    
    // Add animation to features
    animateFeatures();
}

/**
 * Set up event listeners
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
 * Add animation to features
 */
function animateFeatures() {
    const features = document.querySelectorAll('.feature');
    
    // Add staggered animation
    features.forEach((feature, index) => {
        setTimeout(() => {
            feature.style.opacity = '1';
            feature.style.transform = 'translateY(0)';
        }, 300 * index);
    });
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
    
    // Log the selected feature
    const featureTitle = feature.querySelector('h2').textContent;
    console.log(`Feature selected: ${featureTitle}`);
}`,
        'README.md': `# WindBird Project

A modern web application built with the WindBird AI IDE.

## Features

- Responsive design
- Interactive UI elements
- Modern JavaScript practices
- Clean and maintainable code

## Getting Started

1. Clone this repository
2. Open index.html in your browser
3. Explore the features

## Development

This project was developed using WindBird, an AI-powered IDE that helps developers write better code faster.

### WindBird Features Used

- AI code completion
- Code generation
- Debugging assistance
- Performance optimization suggestions

## Technologies

- HTML5
- CSS3
- JavaScript (ES6+)
- WindBird AI

## License

MIT`
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
                    aiResponse = `<p>I can help optimize your code. Here are some areas I can look at:</p>
                    <p>1. Performance improvements</p>
                    <p>2. Code readability and maintainability</p>
                    <p>3. Modern syntax and best practices</p>
                    <p>4. Accessibility enhancements</p>
                    <p>Which area would you like to focus on?</p>`;
                } else if (message.toLowerCase().includes('windbird')) {
                    aiResponse = `<p>WindBird is an AI-powered IDE designed to help developers write better code faster.</p>
                    <p>Key features include:</p>
                    <p>• Intelligent code completion</p>
                    <p>• Natural language code generation</p>
                    <p>• Real-time error detection and fixing</p>
                    <p>• Code optimization suggestions</p>
                    <p>• Contextual documentation and explanations</p>`;
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
                            <i class="fas fa-brain"></i>
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
    
    // AI Tools functionality
    const toolButtons = document.querySelectorAll('.tool-button');
    
    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            const toolType = button.getAttribute('title');
            let promptPrefix = '';
            
            switch (toolType) {
                case 'Generate Code':
                    promptPrefix = 'Generate code for ';
                    break;
                case 'Explain Code':
                    promptPrefix = 'Explain this code: ';
                    break;
                case 'Debug':
                    promptPrefix = 'Debug this code: ';
                    break;
                case 'Optimize':
                    promptPrefix = 'Optimize this code: ';
                    break;
            }
            
            aiInput.value = promptPrefix;
            aiInput.focus();
        });
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
    
    // Show AI panel on first load after a delay
    setTimeout(() => {
        aiPanel.classList.add('active');
    }, 1500);
});