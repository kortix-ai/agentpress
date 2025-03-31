/**
 * AGI Core - The central module for AGI Explorer
 * This file implements the core AGI simulation and intelligence modeling
 */

class AGICore {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            learningRate: 0.01,
            networkSize: 5,
            taskComplexity: 2,
            taskDomain: 'language',
            maxIterations: 50,
            ...config
        };
        
        // Core state
        this.state = {
            iteration: 0,
            performance: 0,
            generalization: 0,
            learningSpeed: 0,
            agiProximity: 0,
            isRunning: false,
            logs: [],
            neurons: [],
            connections: [],
            emergentProperties: []
        };
        
        // Event callbacks
        this.callbacks = {
            onIterationComplete: null,
            onSimulationComplete: null,
            onLog: null,
            onEmergentPropertyDiscovered: null
        };
        
        // Initialize the neural architecture
        this.initializeArchitecture();
    }
    
    // Initialize the neural architecture based on configuration
    initializeArchitecture() {
        const { networkSize } = this.config;
        
        // Clear existing architecture
        this.state.neurons = [];
        this.state.connections = [];
        
        // Create layers (input, hidden layers, output)
        const layers = [
            Math.floor(networkSize / 2),  // Input layer
            networkSize,                  // Hidden layer 1
            Math.floor(networkSize * 1.5),// Hidden layer 2
            Math.floor(networkSize / 2)   // Output layer
        ];
        
        // Create neurons for each layer
        let neuronId = 0;
        layers.forEach((neuronCount, layerIndex) => {
            for (let i = 0; i < neuronCount; i++) {
                this.state.neurons.push({
                    id: neuronId++,
                    layer: layerIndex,
                    position: i / neuronCount,
                    activation: 0,
                    bias: Math.random() * 0.2 - 0.1,
                    learningRate: this.config.learningRate * (Math.random() * 0.5 + 0.75)
                });
            }
        });
        
        // Create connections between layers
        let connectionId = 0;
        for (let l = 0; l < layers.length - 1; l++) {
            // Get neurons in current and next layer
            const currentLayerNeurons = this.state.neurons.filter(n => n.layer === l);
            const nextLayerNeurons = this.state.neurons.filter(n => n.layer === l + 1);
            
            // Connect each neuron to some neurons in the next layer
            currentLayerNeurons.forEach(sourceNeuron => {
                // Determine how many connections to create
                const connectionCount = Math.min(
                    Math.ceil(nextLayerNeurons.length * 0.6), 
                    Math.floor(2 + Math.random() * 3)
                );
                
                // Create random connections
                const targetIndices = this.getRandomIndices(nextLayerNeurons.length, connectionCount);
                targetIndices.forEach(targetIndex => {
                    const targetNeuron = nextLayerNeurons[targetIndex];
                    
                    this.state.connections.push({
                        id: connectionId++,
                        sourceId: sourceNeuron.id,
                        targetId: targetNeuron.id,
                        weight: Math.random() * 0.4 - 0.2,
                        active: false
                    });
                });
            });
        }
        
        this.log(`Neural architecture initialized with ${this.state.neurons.length} neurons and ${this.state.connections.length} connections`);
    }
    
    // Helper to get random unique indices
    getRandomIndices(max, count) {
        const indices = [];
        while (indices.length < count && indices.length < max) {
            const index = Math.floor(Math.random() * max);
            if (!indices.includes(index)) {
                indices.push(index);
            }
        }
        return indices;
    }
    
    // Set configuration
    setConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
        
        // Reinitialize architecture if network size changes
        if (config.networkSize !== undefined) {
            this.initializeArchitecture();
        }
        
        return this;
    }
    
    // Set callbacks
    setCallbacks(callbacks) {
        this.callbacks = {
            ...this.callbacks,
            ...callbacks
        };
        return this;
    }
    
    // Start simulation
    start() {
        if (this.state.isRunning) return;
        
        this.state.isRunning = true;
        this.state.iteration = 0;
        this.state.performance = 0;
        this.state.generalization = 0;
        this.state.learningSpeed = 0;
        this.state.agiProximity = 0;
        this.state.emergentProperties = [];
        
        this.log(`Starting AGI simulation with parameters: learning rate=${this.config.learningRate}, network size=${this.config.networkSize}, task complexity=${this.config.taskComplexity}, domain=${this.config.taskDomain}`);
        
        this.runIteration();
    }
    
    // Run a single iteration
    runIteration() {
        if (!this.state.isRunning) return;
        
        this.state.iteration++;
        
        // Simulate neural activity
        this.simulateNeuralActivity();
        
        // Calculate new metrics based on simulation parameters
        this.state.performance = Math.min(100, this.state.performance + (this.config.learningRate * 2) * (1 / this.config.taskComplexity));
        this.state.generalization = Math.min(100, this.state.generalization + (this.config.learningRate * 1.5) * (this.config.networkSize / 10));
        this.state.learningSpeed = (this.state.iteration / this.config.maxIterations) * 100;
        
        // AGI proximity is a function of all other metrics
        this.state.agiProximity = Math.min(100, (this.state.performance * 0.4 + this.state.generalization * 0.4 + this.state.learningSpeed * 0.2) / 2);
        
        // Check for emergent properties
        this.checkForEmergentProperties();
        
        // Log progress
        this.log(`Iteration ${this.state.iteration}: Performance: ${this.state.performance.toFixed(1)}%, Generalization: ${this.state.generalization.toFixed(1)}%`);
        
        // Call iteration callback
        if (this.callbacks.onIterationComplete) {
            this.callbacks.onIterationComplete(this.state);
        }
        
        // Check if simulation is complete
        if (this.state.iteration >= this.config.maxIterations) {
            this.complete();
        } else {
            // Schedule next iteration
            setTimeout(() => this.runIteration(), 100);
        }
    }
    
    // Simulate neural activity for visualization
    simulateNeuralActivity() {
        // Reset all activations
        this.state.neurons.forEach(neuron => {
            neuron.activation = 0;
        });
        
        // Reset all connection activities
        this.state.connections.forEach(connection => {
            connection.active = false;
        });
        
        // Activate input layer with random patterns based on task domain
        const inputNeurons = this.state.neurons.filter(n => n.layer === 0);
        inputNeurons.forEach(neuron => {
            neuron.activation = Math.random();
        });
        
        // Propagate activations through the network
        for (let layer = 0; layer < 3; layer++) {
            // Get neurons in current layer
            const currentNeurons = this.state.neurons.filter(n => n.layer === layer);
            
            // For each neuron, propagate its activation to connected neurons
            currentNeurons.forEach(neuron => {
                // Find outgoing connections
                const outConnections = this.state.connections.filter(c => c.sourceId === neuron.id);
                
                // Activate connections with probability based on source neuron activation
                outConnections.forEach(connection => {
                    if (Math.random() < neuron.activation) {
                        connection.active = true;
                        
                        // Find target neuron and increase its activation
                        const targetNeuron = this.state.neurons.find(n => n.id === connection.targetId);
                        if (targetNeuron) {
                            targetNeuron.activation += neuron.activation * connection.weight;
                            
                            // Apply activation function (ReLU)
                            targetNeuron.activation = Math.max(0, targetNeuron.activation);
                        }
                    }
                });
            });
        }
    }
    
    // Check for emergent properties based on network activity
    checkForEmergentProperties() {
        // Only check occasionally
        if (this.state.iteration % 5 !== 0) return;
        
        const { performance, generalization } = this.state;
        
        // Different emergent properties based on performance and generalization
        const possibleProperties = [
            { name: "Pattern Recognition", threshold: 20, discovered: false },
            { name: "Basic Reasoning", threshold: 35, discovered: false },
            { name: "Transfer Learning", threshold: 50, discovered: false },
            { name: "Abstract Thinking", threshold: 65, discovered: false },
            { name: "Creative Problem Solving", threshold: 80, discovered: false },
            { name: "Self-Improvement", threshold: 90, discovered: false }
        ];
        
        // Check each property
        possibleProperties.forEach(property => {
            // Check if this property is already discovered
            const alreadyDiscovered = this.state.emergentProperties.some(p => p.name === property.name);
            
            if (!alreadyDiscovered && (performance + generalization) / 2 >= property.threshold) {
                // Discover new property
                const newProperty = {
                    name: property.name,
                    discoveredAt: this.state.iteration,
                    strength: Math.min(100, ((performance + generalization) / 2) - property.threshold + 10)
                };
                
                this.state.emergentProperties.push(newProperty);
                
                this.log(`Emergent property discovered: ${newProperty.name} (strength: ${newProperty.strength.toFixed(1)}%)`);
                
                // Call callback if defined
                if (this.callbacks.onEmergentPropertyDiscovered) {
                    this.callbacks.onEmergentPropertyDiscovered(newProperty);
                }
            }
        });
    }
    
    // Complete simulation
    complete() {
        this.state.isRunning = false;
        this.log(`Simulation complete. Final AGI proximity: ${this.state.agiProximity.toFixed(1)}%`);
        
        // Call completion callback
        if (this.callbacks.onSimulationComplete) {
            this.callbacks.onSimulationComplete(this.state);
        }
    }
    
    // Stop simulation
    stop() {
        this.state.isRunning = false;
        this.log('Simulation stopped by user.');
    }
    
    // Reset simulation
    reset() {
        this.state = {
            iteration: 0,
            performance: 0,
            generalization: 0,
            learningSpeed: 0,
            agiProximity: 0,
            isRunning: false,
            logs: [],
            neurons: this.state.neurons,
            connections: this.state.connections,
            emergentProperties: []
        };
        this.log('Simulation reset.');
    }
    
    // Log a message
    log(message) {
        this.state.logs.push({
            time: new Date(),
            message
        });
        
        // Call log callback
        if (this.callbacks.onLog) {
            this.callbacks.onLog(message);
        }
    }
    
    // Get current state
    getState() {
        return { ...this.state };
    }
    
    // Get domain-specific analysis
    getDomainAnalysis() {
        const { taskDomain } = this.config;
        const { performance, generalization, agiProximity } = this.state;
        
        switch(taskDomain) {
            case 'language':
                return `The language processing capabilities show ${performance < 30 ? 'minimal' : performance < 60 ? 'moderate' : performance < 80 ? 'strong' : 'exceptional'} results in text understanding and generation, but ${generalization < 50 ? 'struggles with' : 'handles'} nuanced context and cultural references.`;
            
            case 'vision':
                return `The visual recognition system demonstrates ${performance < 30 ? 'weak' : performance < 60 ? 'adequate' : performance < 80 ? 'strong' : 'exceptional'} pattern recognition but has ${generalization < 50 ? 'significant difficulty' : 'some challenges'} with novel objects and unusual lighting conditions.`;
            
            case 'reasoning':
                return `The logical reasoning module can solve ${performance < 30 ? 'only basic' : performance < 60 ? 'moderately complex' : performance < 80 ? 'complex' : 'highly complex'} structured problems but ${generalization < 50 ? 'lacks' : 'demonstrates limited'} flexibility for creative problem-solving approaches.`;
            
            case 'creativity':
                return `The creative generation system produces ${performance < 30 ? 'derivative' : performance < 60 ? 'interesting' : performance < 80 ? 'novel' : 'remarkably original'} outputs but they ${generalization < 50 ? 'still exhibit patterns from training data rather than true novelty' : 'show signs of emergent creativity beyond training patterns'}.`;
            
            default:
                return `The system demonstrates ${agiProximity < 30 ? 'very limited' : agiProximity < 60 ? 'moderate' : agiProximity < 80 ? 'significant' : 'remarkable'} progress toward AGI capabilities.`;
        }
    }
    
    // Get active neurons for visualization
    getActiveNeurons() {
        return this.state.neurons.filter(n => n.activation > 0.1);
    }
    
    // Get active connections for visualization
    getActiveConnections() {
        return this.state.connections.filter(c => c.active);
    }
}

// Export the AGI core class
window.AGICore = AGICore;