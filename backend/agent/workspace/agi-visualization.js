/**
 * AGI Visualization - Handles the visual representation of AGI simulations
 * This file provides visualization tools for neural networks and AGI processes
 */

class AGIVisualization {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.getElementById(container) 
            : container;
            
        if (!this.container) {
            throw new Error('Visualization container not found');
        }
        
        // Default options
        this.options = {
            neuronSize: 8,
            neuronColor: 'rgba(99, 102, 241, 0.5)',
            activeNeuronColor: 'rgba(99, 102, 241, 1)',
            connectionColor: 'rgba(99, 102, 241, 0.2)',
            activeConnectionColor: 'rgba(99, 102, 241, 0.8)',
            animationDuration: 800,
            ...options
        };
        
        // State
        this.state = {
            neurons: [],
            connections: [],
            layers: [],
            isInitialized: false
        };
        
        // Initialize the visualization
        this.initialize();
    }
    
    // Initialize the visualization container
    initialize() {
        // Clear the container
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        this.state.isInitialized = true;
    }
    
    // Create a neural network visualization
    createNetworkVisualization(layers) {
        if (!this.state.isInitialized) this.initialize();
        
        // Clear existing visualization
        this.container.innerHTML = '';
        this.state.neurons = [];
        this.state.connections = [];
        this.state.layers = [];
        
        // Create layer containers
        layers.forEach((neuronCount, layerIndex) => {
            const layer = document.createElement('div');
            layer.className = 'network-layer';
            layer.style.position = 'absolute';
            layer.style.height = '100%';
            layer.style.left = `${(layerIndex / (layers.length - 1)) * 100}%`;
            layer.style.zIndex = layerIndex + 1;
            
            this.state.layers.push(layer);
            this.container.appendChild(layer);
            
            // Create neurons in this layer
            for (let i = 0; i < neuronCount; i++) {
                const neuron = document.createElement('div');
                neuron.className = 'network-neuron';
                neuron.style.position = 'absolute';
                neuron.style.width = `${this.options.neuronSize}px`;
                neuron.style.height = `${this.options.neuronSize}px`;
                neuron.style.backgroundColor = this.options.neuronColor;
                neuron.style.borderRadius = '50%';
                neuron.style.top = `${(i / (neuronCount - 1)) * 100}%`;
                neuron.style.transform = 'translate(-50%, -50%)';
                neuron.style.transition = `background-color ${this.options.animationDuration}ms ease`;
                
                // Store reference to DOM element
                this.state.neurons.push({
                    element: neuron,
                    layer: layerIndex,
                    position: i / (neuronCount - 1)
                });
                
                layer.appendChild(neuron);
            }
        });
        
        // Create connections between layers after all neurons are positioned
        setTimeout(() => {
            this.createConnections();
        }, 100);
    }
    
    // Create connections between layers
    createConnections() {
        // Get container dimensions
        const containerRect = this.container.getBoundingClientRect();
        
        // For each layer except the last
        for (let l = 0; l < this.state.layers.length - 1; l++) {
            // Get neurons in current and next layer
            const currentLayerNeurons = this.state.neurons.filter(n => n.layer === l);
            const nextLayerNeurons = this.state.neurons.filter(n => n.layer === l + 1);
            
            // Create connections (not all-to-all to avoid visual clutter)
            currentLayerNeurons.forEach(sourceNeuron => {
                // Connect to a subset of neurons in the next layer
                const connectionsPerNeuron = Math.min(3, nextLayerNeurons.length);
                
                for (let i = 0; i < connectionsPerNeuron; i++) {
                    const targetNeuron = nextLayerNeurons[Math.floor(Math.random() * nextLayerNeurons.length)];
                    
                    const connection = document.createElement('div');
                    connection.className = 'network-connection';
                    connection.style.position = 'absolute';
                    connection.style.height = '1px';
                    connection.style.backgroundColor = this.options.connectionColor;
                    connection.style.transformOrigin = 'left center';
                    connection.style.transition = `background-color ${this.options.animationDuration}ms ease`;
                    
                    // Position and size the connection
                    const sourceRect = sourceNeuron.element.getBoundingClientRect();
                    const targetRect = targetNeuron.element.getBoundingClientRect();
                    
                    const fromX = (sourceRect.left + sourceRect.width / 2 - containerRect.left) / containerRect.width * 100;
                    const fromY = (sourceRect.top + sourceRect.height / 2 - containerRect.top) / containerRect.height * 100;
                    const toX = (targetRect.left + targetRect.width / 2 - containerRect.left) / containerRect.width * 100;
                    const toY = (targetRect.top + targetRect.height / 2 - containerRect.top) / containerRect.height * 100;
                    
                    const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
                    const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
                    
                    connection.style.width = `${length}%`;
                    connection.style.left = `${fromX}%`;
                    connection.style.top = `${fromY}%`;
                    connection.style.transform = `rotate(${angle}deg)`;
                    
                    // Store reference to DOM element
                    this.state.connections.push({
                        element: connection,
                        sourceNeuron,
                        targetNeuron
                    });
                    
                    this.container.appendChild(connection);
                }
            });
        }
    }
    
    // Animate the network based on AGI core state
    animateNetwork(activeNeuronIds, activeConnectionIds) {
        // Reset all neurons and connections
        this.state.neurons.forEach(neuron => {
            neuron.element.style.backgroundColor = this.options.neuronColor;
            neuron.element.classList.remove('active');
        });
        
        this.state.connections.forEach(connection => {
            connection.element.style.backgroundColor = this.options.connectionColor;
            connection.element.classList.remove('active');
        });
        
        // Activate specified neurons
        if (Array.isArray(activeNeuronIds)) {
            activeNeuronIds.forEach(id => {
                const index = id % this.state.neurons.length; // Ensure index is in range
                const neuron = this.state.neurons[index];
                if (neuron) {
                    neuron.element.style.backgroundColor = this.options.activeNeuronColor;
                    neuron.element.classList.add('active');
                }
            });
        } else {
            // If no specific neurons provided, activate random ones
            const activeCount = Math.floor(this.state.neurons.length * 0.2); // 20% active
            for (let i = 0; i < activeCount; i++) {
                const randomIndex = Math.floor(Math.random() * this.state.neurons.length);
                const neuron = this.state.neurons[randomIndex];
                neuron.element.style.backgroundColor = this.options.activeNeuronColor;
                neuron.element.classList.add('active');
            }
        }
        
        // Activate specified connections
        if (Array.isArray(activeConnectionIds)) {
            activeConnectionIds.forEach(id => {
                const index = id % this.state.connections.length; // Ensure index is in range
                const connection = this.state.connections[index];
                if (connection) {
                    connection.element.style.backgroundColor = this.options.activeConnectionColor;
                    connection.element.classList.add('active');
                }
            });
        } else {
            // If no specific connections provided, activate random ones
            const activeCount = Math.floor(this.state.connections.length * 0.1); // 10% active
            for (let i = 0; i < activeCount; i++) {
                const randomIndex = Math.floor(Math.random() * this.state.connections.length);
                const connection = this.state.connections[randomIndex];
                connection.element.style.backgroundColor = this.options.activeConnectionColor;
                connection.element.classList.add('active');
            }
        }
    }
    
    // Create a brain visualization (more organic and 3D-like)
    createBrainVisualization(neuronCount = 150, connectionCount = 200) {
        if (!this.state.isInitialized) this.initialize();
        
        // Clear existing visualization
        this.container.innerHTML = '';
        
        // Create neurons
        for (let i = 0; i < neuronCount; i++) {
            const neuron = document.createElement('div');
            neuron.className = 'neuron';
            
            // Random position within the container
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            
            neuron.style.position = 'absolute';
            neuron.style.left = `${x}%`;
            neuron.style.top = `${y}%`;
            
            // Random size for variety
            const size = 2 + Math.random() * 4;
            neuron.style.width = `${size}px`;
            neuron.style.height = `${size}px`;
            neuron.style.backgroundColor = this.options.neuronColor;
            neuron.style.borderRadius = '50%';
            
            // Random animation delay
            neuron.style.animation = `pulse 3s infinite ${Math.random() * 2}s`;
            
            this.container.appendChild(neuron);
        }
        
        // Create connections between neurons
        for (let i = 0; i < connectionCount; i++) {
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
            
            connection.style.position = 'absolute';
            connection.style.width = `${length}%`;
            connection.style.height = '1px';
            connection.style.left = `${x1}%`;
            connection.style.top = `${y1}%`;
            connection.style.backgroundColor = this.options.connectionColor;
            connection.style.transform = `rotate(${angle}deg)`;
            connection.style.transformOrigin = 'left center';
            
            // Random animation delay
            connection.style.animation = `fade-in-out 4s infinite ${Math.random() * 3}s`;
            
            this.container.appendChild(connection);
        }
    }
}

// Export the AGI visualization class
window.AGIVisualization = AGIVisualization;