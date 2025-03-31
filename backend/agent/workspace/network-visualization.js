// Network visualization for the simulation
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the network visualization if the container exists
    const simulationViz = document.getElementById('simulationVisualization');
    if (simulationViz) {
        // Create a simple placeholder visualization
        createPlaceholderVisualization(simulationViz);
    }
});

function createPlaceholderVisualization(container) {
    // Create a simple neural network visualization
    const layers = [4, 6, 8, 4]; // Number of neurons in each layer
    
    // Create layer containers
    layers.forEach((neurons, layerIndex) => {
        const layer = document.createElement('div');
        layer.className = 'network-layer';
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
        const connectionsPerNeuron = Math.min(3, toNeurons.length);
        
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
                
                container.appendChild(connection);
            }
        });
    }
    
    // Animate the network
    animateNetwork(container);
}

function animateNetwork(container) {
    const neurons = container.querySelectorAll('.network-neuron');
    const connections = container.querySelectorAll('.network-connection');
    
    // Randomly activate neurons and connections
    setInterval(() => {
        // Reset all
        neurons.forEach(neuron => neuron.classList.remove('active'));
        connections.forEach(connection => connection.classList.remove('active'));
        
        // Activate random neurons
        const activeNeurons = Math.floor(neurons.length * 0.2); // 20% active
        for (let i = 0; i < activeNeurons; i++) {
            const randomIndex = Math.floor(Math.random() * neurons.length);
            neurons[randomIndex].classList.add('active');
        }
        
        // Activate random connections
        const activeConnections = Math.floor(connections.length * 0.1); // 10% active
        for (let i = 0; i < activeConnections; i++) {
            const randomIndex = Math.floor(Math.random() * connections.length);
            connections[randomIndex].classList.add('active');
        }
    }, 800);
}