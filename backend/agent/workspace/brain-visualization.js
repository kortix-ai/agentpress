// Brain visualization script
document.addEventListener('DOMContentLoaded', function() {
    const brainVisualization = document.getElementById('brainVisualization');
    
    if (brainVisualization) {
        // Create a 3D brain-like structure with nodes and connections
        createBrainVisualization(brainVisualization);
    }
});

function createBrainVisualization(container) {
    // Number of nodes to create
    const nodeCount = 50;
    
    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
        const node = document.createElement('div');
        node.className = 'brain-node';
        
        // Random position within the container
        const x = Math.random() * 200 - 100; // -100 to 100
        const y = Math.random() * 200 - 100; // -100 to 100
        const z = Math.random() * 200 - 100; // -100 to 100
        
        // Set size based on position (nodes closer to center are larger)
        const distance = Math.sqrt(x*x + y*y + z*z);
        const size = Math.max(3, 10 - distance/20);
        
        // Apply styles
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        node.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
        node.style.backgroundColor = `hsl(${240 + z}, 80%, 60%)`;
        node.style.opacity = Math.max(0.3, 1 - distance/150);
        
        // Add to container
        container.appendChild(node);
        
        // Animate the node
        animateNode(node);
    }
    
    // Create connections between some nodes
    const nodes = container.querySelectorAll('.brain-node');
    const connectionCount = 30;
    
    for (let i = 0; i < connectionCount; i++) {
        const connection = document.createElement('div');
        connection.className = 'brain-connection';
        
        // Random start and end nodes
        const startIndex = Math.floor(Math.random() * nodes.length);
        let endIndex;
        do {
            endIndex = Math.floor(Math.random() * nodes.length);
        } while (endIndex === startIndex);
        
        // Position and style the connection
        // This is simplified - in a real implementation you would calculate
        // the actual position and rotation based on the nodes' positions
        connection.style.left = `${Math.random() * 150 - 75}px`;
        connection.style.top = `${Math.random() * 150 - 75}px`;
        connection.style.width = `${30 + Math.random() * 70}px`;
        connection.style.transform = `rotateZ(${Math.random() * 360}deg) rotateY(${Math.random() * 180 - 90}deg)`;
        connection.style.opacity = 0.2 + Math.random() * 0.3;
        
        // Add to container
        container.appendChild(connection);
        
        // Animate the connection
        animateConnection(connection);
    }
}

function animateNode(node) {
    // Pulse animation
    setInterval(() => {
        if (Math.random() < 0.1) {
            node.classList.add('pulse');
            setTimeout(() => {
                node.classList.remove('pulse');
            }, 1000);
        }
    }, 2000);
}

function animateConnection(connection) {
    // Data flow animation
    setInterval(() => {
        if (Math.random() < 0.2) {
            connection.classList.add('active');
            setTimeout(() => {
                connection.classList.remove('active');
            }, 800);
        }
    }, 3000);
}