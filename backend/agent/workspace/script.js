// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize brain visualization
    initBrainVisualization();
    
    // Initialize simulation controls
    initSimulationControls();
    
    // Handle button clicks
    document.getElementById('learnMoreBtn').addEventListener('click', function() {
        document.querySelector('#about').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('trySimulationBtn').addEventListener('click', function() {
        document.querySelector('#simulation').scrollIntoView({ behavior: 'smooth' });
    });
    
    document.getElementById('simulateBtn').addEventListener('click', function() {
        showSimulationPopup();
    });
    
    document.getElementById('closePopup').addEventListener('click', function() {
        document.getElementById('simulationPopup').style.display = 'none';
    });
    
    // Smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add glitch effect to text
    const glitchText = document.querySelector('.glitch-text');
    if (glitchText) {
        setInterval(() => {
            glitchText.classList.add('glitching');
            setTimeout(() => {
                glitchText.classList.remove('glitching');
            }, 200);
        }, 3000);
    }
});

// Brain visualization in the hero section
function initBrainVisualization() {
    const brainContainer = document.getElementById('brainVisualization');
    if (!brainContainer) return;
    
    // Create neural network visualization
    const networkSize = 150; // Number of neurons
    const connections = 200; // Number of connections
    
    // Create neurons
    for (let i = 0; i < networkSize; i++) {
        const neuron = document.createElement('div');
        neuron.className = 'neuron';
        
        // Random position within the container
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        neuron.style.left = `${x}%`;
        neuron.style.top = `${y}%`;
        
        // Random size for variety
        const size = 2 + Math.random() * 4;
        neuron.style.width = `${size}px`;
        neuron.style.height = `${size}px`;
        
        // Random animation delay
        neuron.style.animationDelay = `${Math.random() * 2}s`;
        
        brainContainer.appendChild(neuron);
    }
    
    // Create connections between neurons
    for (let i = 0; i < connections; i++) {
        const connection = document.createElement('div');
        connection.className = 'connection';
        
        // Random position and dimensions
        const x1 = Math.random() * 100;
        const y1 = Math.random() * 100;
        const x2 = Math.random() * 100;
        const y2 = Math.random() * 100;
        
        // Calculate length and angle
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        
        connection.style.width = `${length}%`;
        connection.style.left = `${x1}%`;
        connection.style.top = `${y1}%`;
        connection.style.transform = `rotate(${angle}deg)`;
        
        // Random animation delay
        connection.style.animationDelay = `${Math.random() * 3}s`;
        
        brainContainer.appendChild(connection);
    }
}

// Initialize simulation controls
function initSimulationControls() {
    // Get all range inputs and update their displayed values
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        const valueDisplay = document.getElementById(`${input.id}Value`);
        if (valueDisplay) {
            valueDisplay.textContent = input.value;
            
            input.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
        }
    });
    
    // Run simulation button
    const runSimulationBtn = document.getElementById('runSimulation');
    if (runSimulationBtn) {
        runSimulationBtn.addEventListener('click', function() {
            runSimulation();
        });
    }
    
    // Reset simulation button
    const resetSimulationBtn = document.getElementById('resetSimulation');
    if (resetSimulationBtn) {
        resetSimulationBtn.addEventListener('click', function() {
            resetSimulation();
        });
    }
}

// Run the AGI simulation
function runSimulation() {
    // Get simulation parameters
    const learningRate = parseFloat(document.getElementById('learningRate').value);
    const networkSize = parseInt(document.getElementById('networkSize').value);
    const taskComplexity = parseInt(document.getElementById('taskComplexity').value);
    const taskDomain = document.getElementById('taskDomain').value;
    
    // Clear previous visualization
    const simulationViz = document.getElementById('simulationVisualization');
    simulationViz.innerHTML = '';
    
    // Create new network visualization
    createNetworkVisualization(simulationViz, networkSize);
    
    // Update console with initialization message
    updateConsole(`Initializing simulation with learning rate: ${learningRate}, network size: ${networkSize}, task complexity: ${taskComplexity}, domain: ${taskDomain}`);
    
    // Simulate learning process
    simulateLearning(learningRate, networkSize, taskComplexity, taskDomain);
}

// Create network visualization
function createNetworkVisualization(container, size) {
    // Create layers
    const layers = [
        Math.floor(size / 2),  // Input layer
        size,                  // Hidden layer 1
        Math.floor(size * 1.5),// Hidden layer 2
        Math.floor(size / 2)   // Output layer
    ];
    
    // Create layer containers
    layers.forEach((neurons, layerIndex) => {
        const layer = document.createElement('div');
        layer.className = 'network-layer';
        layer.style.zIndex = layerIndex + 1;
        layer.style.left = `${(layerIndex / (layers.length - 1)) * 100}%`;
        
        // Create neurons in this layer
        for (let i = 0; i < neurons; i++) {
            const neuron = document.createElement('div');
            neuron.className = 'network-neuron';
            neuron.style.top = `${(i / (neurons - 1)) * 100}%`;
            
            // Add animation delay
            neuron.style.animationDelay = `${Math.random() * 2}s`;
            
            layer.appendChild(neuron);
        }
        
        container.appendChild(layer);
    });
    
    // Create connections between layers
    for (let l = 0; l < layers.length - 1; l++) {
        const fromLayer = container.querySelectorAll('.network-layer')[l];
        const toLayer = container.querySelectorAll('.network-layer')[l + 1];
        
        const fromNeurons = fromLayer.querySelectorAll('.network-neuron');
        const toNeurons = toLayer.querySelectorAll('.network-neuron');
        
        // Create connections (not all-to-all to avoid visual clutter)
        const connectionsPerNeuron = Math.min(5, toNeurons.length);
        
        fromNeurons.forEach(fromNeuron => {
            // Connect to a subset of neurons in the next layer
            for (let i = 0; i < connectionsPerNeuron; i++) {
                const toNeuron = toNeurons[Math.floor(Math.random() * toNeurons.length)];
                
                const connection = document.createElement('div');
                connection.className = 'network-connection';
                
                // Position and size the connection
                const fromRect = fromNeuron.getBoundingClientRect();
                const toRect = toNeuron.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                const fromX = (fromRect.left + fromRect.width / 2 - containerRect.left) / containerRect.width * 100;
                const fromY = (fromRect.top + fromRect.height / 2 - containerRect.top) / containerRect.height * 100;
                const toX = (toRect.left + toRect.width / 2 - containerRect.left) / containerRect.width * 100;
                const toY = (toRect.top + toRect.height / 2 - containerRect.top) / containerRect.height * 100;
                
                const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
                const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
                
                connection.style.width = `${length}%`;
                connection.style.left = `${fromX}%`;
                connection.style.top = `${fromY}%`;
                connection.style.transform = `rotate(${angle}deg)`;
                
                // Add animation delay
                connection.style.animationDelay = `${Math.random() * 1}s`;
                
                container.appendChild(connection);
            }
        });
    }
}

// Simulate the learning process
function simulateLearning(learningRate, networkSize, taskComplexity, taskDomain) {
    let iteration = 0;
    const maxIterations = 50;
    const iterationTime = 100; // ms per iteration
    
    // Initial metrics
    let performance = 0;
    let generalization = 0;
    let learningSpeed = 0;
    let agiProximity = 0;
    
    // Update metrics display
    updateMetrics(performance, generalization, learningSpeed, agiProximity);
    
    // Simulation interval
    const simulationInterval = setInterval(() => {
        iteration++;
        
        // Calculate new metrics based on simulation parameters
        performance = Math.min(100, performance + (learningRate * 2) * (1 / taskComplexity));
        generalization = Math.min(100, generalization + (learningRate * 1.5) * (networkSize / 10));
        learningSpeed = (iteration / maxIterations) * 100;
        
        // AGI proximity is a function of all other metrics
        agiProximity = Math.min(100, (performance * 0.4 + generalization * 0.4 + learningSpeed * 0.2) / 2);
        
        // Update metrics display
        updateMetrics(performance, generalization, learningSpeed, agiProximity);
        
        // Update console with progress
        updateConsole(`Iteration ${iteration}: Performance: ${performance.toFixed(1)}%, Generalization: ${generalization.toFixed(1)}%`);
        
        // Highlight random neurons to simulate activity
        highlightRandomNeurons();
        
        // End simulation when max iterations reached
        if (iteration >= maxIterations) {
            clearInterval(simulationInterval);
            updateConsole(`Simulation complete. Final AGI proximity: ${agiProximity.toFixed(1)}%`);
            
            // Show results in popup
            showSimulationResults(performance, generalization, learningSpeed, agiProximity, taskDomain);
        }
    }, iterationTime);
}

// Update metrics display
function updateMetrics(performance, generalization, learningSpeed, agiProximity) {
    document.getElementById('performanceScore').textContent = `${performance.toFixed(1)}%`;
    document.getElementById('generalizationScore').textContent = `${generalization.toFixed(1)}%`;
    document.getElementById('learningSpeed').textContent = `${learningSpeed.toFixed(1)}%`;
    document.getElementById('agiProximity').textContent = `${agiProximity.toFixed(1)}%`;
    
    // Update colors based on values
    document.getElementById('performanceScore').style.color = getMetricColor(performance);
    document.getElementById('generalizationScore').style.color = getMetricColor(generalization);
    document.getElementById('learningSpeed').style.color = getMetricColor(learningSpeed);
    document.getElementById('agiProximity').style.color = getMetricColor(agiProximity);
}

// Get color based on metric value
function getMetricColor(value) {
    if (value < 30) return '#ef4444'; // Red
    if (value < 60) return '#f59e0b'; // Orange
    if (value < 80) return '#10b981'; // Green
    return '#6366f1'; // Purple/Blue
}

// Update console with new message
function updateConsole(message) {
    const console = document.getElementById('outputConsole');
    const line = document.createElement('div');
    line.className = 'console-line';
    line.textContent = message;
    console.appendChild(line);
    
    // Auto-scroll to bottom
    console.scrollTop = console.scrollHeight;
}

// Highlight random neurons to simulate activity
function highlightRandomNeurons() {
    const neurons = document.querySelectorAll('.network-neuron');
    const connectionsToHighlight = document.querySelectorAll('.network-connection');
    
    // Reset all neurons and connections
    neurons.forEach(neuron => {
        neuron.classList.remove('active');
    });
    
    connectionsToHighlight.forEach(connection => {
        connection.classList.remove('active');
    });
    
    // Highlight random neurons
    const numToHighlight = Math.floor(neurons.length * 0.2); // Highlight 20% of neurons
    
    for (let i = 0; i < numToHighlight; i++) {
        const randomIndex = Math.floor(Math.random() * neurons.length);
        neurons[randomIndex].classList.add('active');
    }
    
    // Highlight random connections
    const numConnectionsToHighlight = Math.floor(connectionsToHighlight.length * 0.1); // Highlight 10% of connections
    
    for (let i = 0; i < numConnectionsToHighlight; i++) {
        const randomIndex = Math.floor(Math.random() * connectionsToHighlight.length);
        connectionsToHighlight[randomIndex].classList.add('active');
    }
}

// Reset simulation
function resetSimulation() {
    // Clear visualization
    document.getElementById('simulationVisualization').innerHTML = '';
    
    // Reset metrics
    updateMetrics(0, 0, 0, 0);
    
    // Clear console
    document.getElementById('outputConsole').innerHTML = '<div class="console-line">System initialized. Ready to run simulation.</div>';
}

// Show simulation results in popup
function showSimulationResults(performance, generalization, learningSpeed, agiProximity, taskDomain) {
    const resultsContainer = document.getElementById('simulationResults');
    const popup = document.getElementById('simulationPopup');
    
    // Generate results content
    let domainSpecificResult = '';
    switch(taskDomain) {
        case 'language':
            domainSpecificResult = 'The language processing capabilities show promising results in text understanding and generation, but struggles with nuanced context and cultural references.';
            break;
        case 'vision':
            domainSpecificResult = 'The visual recognition system demonstrates strong pattern recognition but has difficulty with novel objects and unusual lighting conditions.';
            break;
        case 'reasoning':
            domainSpecificResult = 'The logical reasoning module can solve structured problems but lacks the flexibility for creative problem-solving approaches.';
            break;
        case 'creativity':
            domainSpecificResult = 'The creative generation system produces interesting outputs but they still exhibit patterns from training data rather than true novelty.';
            break;
    }
    
    // Create results HTML
    resultsContainer.innerHTML = `
        <div class="results-summary">
            <div class="result-metric">
                <h3>Performance</h3>
                <div class="result-value" style="color: ${getMetricColor(performance)}">${performance.toFixed(1)}%</div>
            </div>
            <div class="result-metric">
                <h3>Generalization</h3>
                <div class="result-value" style="color: ${getMetricColor(generalization)}">${generalization.toFixed(1)}%</div>
            </div>
            <div class="result-metric">
                <h3>Learning Efficiency</h3>
                <div class="result-value" style="color: ${getMetricColor(learningSpeed)}">${learningSpeed.toFixed(1)}%</div>
            </div>
            <div class="result-metric">
                <h3>AGI Proximity</h3>
                <div class="result-value" style="color: ${getMetricColor(agiProximity)}">${agiProximity.toFixed(1)}%</div>
            </div>
        </div>
        <div class="results-analysis">
            <h3>Analysis</h3>
            <p>${domainSpecificResult}</p>
            <p>The system demonstrates ${agiProximity < 30 ? 'very limited' : agiProximity < 60 ? 'moderate' : agiProximity < 80 ? 'significant' : 'remarkable'} progress toward AGI capabilities, but ${agiProximity < 80 ? 'still falls short of' : 'is approaching'} human-level general intelligence.</p>
        </div>
    `;
    
    // Show popup
    popup.style.display = 'flex';
}

// Show simulation popup with random results
function showSimulationPopup() {
    // Generate random metrics
    const performance = Math.random() * 100;
    const generalization = Math.random() * 100;
    const learningSpeed = Math.random() * 100;
    const agiProximity = (performance * 0.4 + generalization * 0.4 + learningSpeed * 0.2) / 2;
    
    // Get random domain
    const domains = ['language', 'vision', 'reasoning', 'creativity'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    
    // Show results
    showSimulationResults(performance, generalization, learningSpeed, agiProximity, randomDomain);
}