class AGIInterface {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.initializeNeuralNetwork();
        this.updateMetrics();
    }

    initializeElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-btn');
        this.canvas = document.getElementById('neural-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.processingPower = document.getElementById('processing-power');
        this.learningRate = document.getElementById('learning-rate');
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    handleUserInput() {
        const message = this.userInput.value.trim();
        if (message) {
            this.addMessage('user', message);
            this.generateResponse(message);
            this.userInput.value = '';
        }
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${content}</span>
                <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    generateResponse(userMessage) {
        // Simulate AI processing
        setTimeout(() => {
            const responses = [
                "I understand your query about " + userMessage,
                "Processing your request regarding " + userMessage,
                "Analyzing the context of " + userMessage,
                "Interesting perspective on " + userMessage
            ];
            const response = responses[Math.floor(Math.random() * responses.length)];
            this.addMessage('ai', response);
            this.updateMetrics();
        }, 1000);
    }

    initializeNeuralNetwork() {
        this.resizeCanvas();
        this.nodes = [];
        this.connections = [];
        
        // Create nodes
        for (let layer = 0; layer < 3; layer++) {
            const nodesInLayer = layer === 1 ? 4 : 3;
            for (let i = 0; i < nodesInLayer; i++) {
                this.nodes.push({
                    x: (layer + 1) * this.canvas.width / 4,
                    y: (i + 1) * this.canvas.height / (nodesInLayer + 1),
                    layer: layer
                });
            }
        }

        // Create connections
        this.nodes.forEach(node => {
            if (node.layer < 2) {
                this.nodes.filter(n => n.layer === node.layer + 1).forEach(nextNode => {
                    this.connections.push({
                        start: node,
                        end: nextNode,
                        activity: Math.random()
                    });
                });
            }
        });

        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.connections.forEach(conn => {
            this.ctx.beginPath();
            this.ctx.moveTo(conn.start.x, conn.start.y);
            this.ctx.lineTo(conn.end.x, conn.end.y);
            this.ctx.strokeStyle = `rgba(52, 152, 219, ${conn.activity})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            conn.activity = Math.max(0.1, Math.min(1, conn.activity + (Math.random() - 0.5) * 0.1));
        });

        // Draw nodes
        this.nodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
            this.ctx.fillStyle = '#3498db';
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }

    updateMetrics() {
        const processingPowerValue = Math.random() * 100;
        const learningRateValue = Math.random() * 100;

        this.processingPower.style.width = `${processingPowerValue}%`;
        this.learningRate.style.width = `${learningRateValue}%`;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const agi = new AGIInterface();
});