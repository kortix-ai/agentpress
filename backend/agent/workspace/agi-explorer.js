/**
 * AGI Explorer - Main application controller
 * This file coordinates the AGI simulation, visualization, and UI
 */

class AGIExplorer {
    constructor() {
        // Initialize components
        this.core = new AGICore();
        this.brainViz = null;
        this.networkViz = null;
        
        // UI elements
        this.elements = {
            // Control elements
            learningRate: document.getElementById('learningRate'),
            networkSize: document.getElementById('networkSize'),
            taskComplexity: document.getElementById('taskComplexity'),
            taskDomain: document.getElementById('taskDomain'),
            runSimulation: document.getElementById('runSimulation'),
            resetSimulation: document.getElementById('resetSimulation'),
            
            // Value displays
            learningRateValue: document.getElementById('learningRateValue'),
            networkSizeValue: document.getElementById('networkSizeValue'),
            taskComplexityValue: document.getElementById('taskComplexityValue'),
            
            // Metrics displays
            performanceScore: document.getElementById('performanceScore'),
            generalizationScore: document.getElementById('generalizationScore'),
            learningSpeed: document.getElementById('learningSpeed'),
            agiProximity: document.getElementById('agiProximity'),
            
            // Visualization containers
            brainVisualization: document.getElementById('brainVisualization'),
            simulationVisualization: document.getElementById('simulationVisualization'),
            
            // Console output
            outputConsole: document.getElementById('outputConsole'),
            
            // Popup elements
            simulateBtn: document.getElementById('simulateBtn'),
            simulationPopup: document.getElementById('simulationPopup'),
            simulationResults: document.getElementById('simulationResults'),
            closePopup: document.getElementById('closePopup'),
            
            // Navigation buttons
            learnMoreBtn: document.getElementById('learnMoreBtn'),
            trySimulationBtn: document.getElementById('trySimulationBtn')
        };
        
        // Initialize the application
        this.initialize();
    }
    
    // Initialize the application
    initialize() {
        // Initialize brain visualization
        if (this.elements.brainVisualization) {
            this.brainViz = new AGIVisualization(this.elements.brainVisualization);
            this.brainViz.createBrainVisualization();
        }
        
        // Initialize simulation controls
        this.initializeControls();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up core callbacks
        this.setupCoreCallbacks();
        
        // Add glitch effect to title
        this.initializeGlitchEffect();
        
        console.log('AGI Explorer initialized successfully');
    }
    
    // Initialize simulation controls
    initializeControls() {
        // Update value displays for range inputs
        if (this.elements.learningRate && this.elements.learningRateValue) {
            this.elements.learningRateValue.textContent = this.elements.learningRate.value;
            this.elements.learningRate.addEventListener('input', () => {
                this.elements.learningRateValue.textContent = this.elements.learningRate.value;
            });
        }
        
        if (this.elements.networkSize && this.elements.networkSizeValue) {
            this.elements.networkSizeValue.textContent = this.elements.networkSize.value;
            this.elements.networkSize.addEventListener('input', () => {
                this.elements.networkSizeValue.textContent = this.elements.networkSize.value;
            });
        }
        
        if (this.elements.taskComplexity && this.elements.taskComplexityValue) {
            this.elements.taskComplexityValue.textContent = this.elements.taskComplexity.value;
            this.elements.taskComplexity.addEventListener('input', () => {
                this.elements.taskComplexityValue.textContent = this.elements.taskComplexity.value;
            });
        }
    }
    
    // Set up event listeners
    setupEventListeners() {
        // Run simulation button
        if (this.elements.runSimulation) {
            this.elements.runSimulation.addEventListener('click', () => this.runSimulation());
        }
        
        // Reset simulation button
        if (this.elements.resetSimulation) {
            this.elements.resetSimulation.addEventListener('click', () => this.resetSimulation());
        }
        
        // Simulate AGI button (popup)
        if (this.elements.simulateBtn) {
            this.elements.simulateBtn.addEventListener('click', () => this.showSimulationPopup());
        }
        
        // Close popup button
        if (this.elements.closePopup) {
            this.elements.closePopup.addEventListener('click', () => {
                if (this.elements.simulationPopup) {
                    this.elements.simulationPopup.style.display = 'none';
                }
            });
        }
        
        // Learn more button (scroll to about section)
        if (this.elements.learnMoreBtn) {
            this.elements.learnMoreBtn.addEventListener('click', () => {
                const aboutSection = document.getElementById('about');
                if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Try simulation button (scroll to simulation section)
        if (this.elements.trySimulationBtn) {
            this.elements.trySimulationBtn.addEventListener('click', () => {
                const simulationSection = document.getElementById('simulation');
                if (simulationSection) {
                    simulationSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
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
    }
    
    // Set up core callbacks
    setupCoreCallbacks() {
        this.core.setCallbacks({
            onIterationComplete: (state) => {
                this.updateMetrics(state);
                this.animateNetwork(state);
            },
            onSimulationComplete: (state) => {
                this.updateMetrics(state);
                this.showSimulationResults(state);
                this.log('Simulation complete.');
            },
            onLog: (message) => {
                this.log(message);
            },
            onEmergentPropertyDiscovered: (property) => {
                this.log(`Emergent property discovered: ${property.name} (strength: ${property.strength.toFixed(1)}%)`);
            }
        });
    }
    
    // Initialize glitch effect
    initializeGlitchEffect() {
        const glitchText = document.querySelector('.glitch-text');
        if (glitchText) {
            setInterval(() => {
                glitchText.classList.add('glitching');
                setTimeout(() => {
                    glitchText.classList.remove('glitching');
                }, 200);
            }, 3000);
        }
    }
    
    // Run the AGI simulation
    runSimulation() {
        // Get simulation parameters from UI
        const config = {
            learningRate: parseFloat(this.elements.learningRate.value),
            networkSize: parseInt(this.elements.networkSize.value),
            taskComplexity: parseInt(this.elements.taskComplexity.value),
            taskDomain: this.elements.taskDomain.value
        };
        
        // Update core configuration
        this.core.setConfig(config);
        
        // Clear previous visualization
        if (this.elements.simulationVisualization) {
            this.elements.simulationVisualization.innerHTML = '';
            
            // Create network visualization
            this.networkViz = new AGIVisualization(this.elements.simulationVisualization);
            
            // Create layers based on network size
            const layers = [
                Math.floor(config.networkSize / 2),  // Input layer
                config.networkSize,                  // Hidden layer 1
                Math.floor(config.networkSize * 1.5),// Hidden layer 2
                Math.floor(config.networkSize / 2)   // Output layer
            ];
            
            this.networkViz.createNetworkVisualization(layers);
        }
        
        // Start the simulation
        this.core.start();
        
        // Log initialization
        this.log(`Initializing simulation with learning rate: ${config.learningRate}, network size: ${config.networkSize}, task complexity: ${config.taskComplexity}, domain: ${config.taskDomain}`);
    }
    
    // Reset the simulation
    resetSimulation() {
        // Reset core
        this.core.reset();
        
        // Clear visualization
        if (this.elements.simulationVisualization) {
            this.elements.simulationVisualization.innerHTML = '';
        }
        
        // Reset metrics
        this.updateMetrics({
            performance: 0,
            generalization: 0,
            learningSpeed: 0,
            agiProximity: 0
        });
        
        // Clear console
        if (this.elements.outputConsole) {
            this.elements.outputConsole.innerHTML = '<div class="console-line">System initialized. Ready to run simulation.</div>';
        }
    }
    
    // Update metrics display
    updateMetrics(state) {
        if (this.elements.performanceScore) {
            this.elements.performanceScore.textContent = `${state.performance.toFixed(1)}%`;
            this.elements.performanceScore.style.color = this.getMetricColor(state.performance);
        }
        
        if (this.elements.generalizationScore) {
            this.elements.generalizationScore.textContent = `${state.generalization.toFixed(1)}%`;
            this.elements.generalizationScore.style.color = this.getMetricColor(state.generalization);
        }
        
        if (this.elements.learningSpeed) {
            this.elements.learningSpeed.textContent = `${state.learningSpeed.toFixed(1)}%`;
            this.elements.learningSpeed.style.color = this.getMetricColor(state.learningSpeed);
        }
        
        if (this.elements.agiProximity) {
            this.elements.agiProximity.textContent = `${state.agiProximity.toFixed(1)}%`;
            this.elements.agiProximity.style.color = this.getMetricColor(state.agiProximity);
        }
    }
    
    // Get color based on metric value
    getMetricColor(value) {
        if (value < 30) return '#ef4444'; // Red
        if (value < 60) return '#f59e0b'; // Orange
        if (value < 80) return '#10b981'; // Green
        return '#6366f1'; // Purple/Blue
    }
    
    // Animate the network visualization
    animateNetwork(state) {
        if (this.networkViz) {
            // Get active neurons and connections from state
            const activeNeurons = state.neurons
                .filter(n => n.activation > 0.1)
                .map(n => n.id);
                
            const activeConnections = state.connections
                .filter(c => c.active)
                .map(c => c.id);
            
            // Animate the network
            this.networkViz.animateNetwork(activeNeurons, activeConnections);
        }
    }
    
    // Log a message to the console
    log(message) {
        if (this.elements.outputConsole) {
            const line = document.createElement('div');
            line.className = 'console-line';
            line.textContent = message;
            this.elements.outputConsole.appendChild(line);
            
            // Auto-scroll to bottom
            this.elements.outputConsole.scrollTop = this.elements.outputConsole.scrollHeight;
        }
    }
    
    // Show simulation popup with random results
    showSimulationPopup() {
        // Generate random metrics
        const performance = Math.random() * 100;
        const generalization = Math.random() * 100;
        const learningSpeed = Math.random() * 100;
        const agiProximity = (performance * 0.4 + generalization * 0.4 + learningSpeed * 0.2) / 2;
        
        // Get random domain
        const domains = ['language', 'vision', 'reasoning', 'creativity'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        
        // Create a temporary state object
        const state = {
            performance,
            generalization,
            learningSpeed,
            agiProximity,
            taskDomain: randomDomain
        };
        
        // Show results
        this.showSimulationResults(state);
    }
    
    // Show simulation results in popup
    showSimulationResults(state) {
        if (!this.elements.simulationResults || !this.elements.simulationPopup) return;
        
        // Get domain-specific analysis
        const domainAnalysis = this.core.getDomainAnalysis();
        
        // Create results HTML
        this.elements.simulationResults.innerHTML = `
            <div class="results-summary">
                <div class="result-metric">
                    <h3>Performance</h3>
                    <div class="result-value" style="color: ${this.getMetricColor(state.performance)}">${state.performance.toFixed(1)}%</div>
                </div>
                <div class="result-metric">
                    <h3>Generalization</h3>
                    <div class="result-value" style="color: ${this.getMetricColor(state.generalization)}">${state.generalization.toFixed(1)}%</div>
                </div>
                <div class="result-metric">
                    <h3>Learning Efficiency</h3>
                    <div class="result-value" style="color: ${this.getMetricColor(state.learningSpeed)}">${state.learningSpeed.toFixed(1)}%</div>
                </div>
                <div class="result-metric">
                    <h3>AGI Proximity</h3>
                    <div class="result-value" style="color: ${this.getMetricColor(state.agiProximity)}">${state.agiProximity.toFixed(1)}%</div>
                </div>
            </div>
            <div class="results-analysis">
                <h3>Analysis</h3>
                <p>${domainAnalysis}</p>
                <p>The system demonstrates ${state.agiProximity < 30 ? 'very limited' : state.agiProximity < 60 ? 'moderate' : state.agiProximity < 80 ? 'significant' : 'remarkable'} progress toward AGI capabilities, but ${state.agiProximity < 80 ? 'still falls short of' : 'is approaching'} human-level general intelligence.</p>
            </div>
        `;
        
        // Show emergent properties if any
        if (state.emergentProperties && state.emergentProperties.length > 0) {
            let propertiesHTML = `
                <div class="emergent-properties">
                    <h3>Emergent Properties</h3>
                    <ul>
            `;
            
            state.emergentProperties.forEach(property => {
                propertiesHTML += `
                    <li>
                        <strong>${property.name}</strong>: 
                        <span style="color: ${this.getMetricColor(property.strength)}">${property.strength.toFixed(1)}%</span>
                    </li>
                `;
            });
            
            propertiesHTML += `
                    </ul>
                </div>
            `;
            
            this.elements.simulationResults.innerHTML += propertiesHTML;
        }
        
        // Show popup
        this.elements.simulationPopup.style.display = 'flex';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.agiExplorer = new AGIExplorer();
});