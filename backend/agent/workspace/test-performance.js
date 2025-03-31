// AGI Explorer Performance Tests
console.log("Starting AGI Explorer performance tests...");

// Configuration
const PERFORMANCE_TESTS = [
  {
    name: "Brain Visualization Rendering",
    run: testBrainVisualizationPerformance
  },
  {
    name: "Simulation Animation",
    run: testSimulationAnimationPerformance
  },
  {
    name: "Scroll Performance",
    run: testScrollPerformance
  }
];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, waiting for scripts to initialize...");
  
  // Wait a bit to ensure all scripts are initialized
  setTimeout(runPerformanceTests, 2000);
});

// Run all performance tests
async function runPerformanceTests() {
  console.log("Running performance tests...");
  
  const results = {
    tests: []
  };
  
  // Run each test
  for (const test of PERFORMANCE_TESTS) {
    console.log(`Running performance test: ${test.name}`);
    
    try {
      const metrics = await test.run();
      results.tests.push({
        name: test.name,
        status: "COMPLETED",
        metrics: metrics
      });
      
      console.log(`✅ ${test.name}: Completed`);
      console.log(`   Metrics:`, metrics);
    } catch (error) {
      results.tests.push({
        name: test.name,
        status: "ERROR",
        error: error.message
      });
      
      console.error(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  // Display results
  displayPerformanceResults(results);
}

// Performance test functions
async function testBrainVisualizationPerformance() {
  const brainContainer = document.getElementById('brainVisualization');
  if (!brainContainer) {
    throw new Error("Brain visualization container not found");
  }
  
  // Measure rendering time
  const startTime = performance.now();
  
  // Force re-render by clearing and re-initializing
  const originalContent = brainContainer.innerHTML;
  brainContainer.innerHTML = '';
  
  // Re-initialize brain visualization
  if (typeof initBrainVisualization === 'function') {
    initBrainVisualization();
  } else {
    // Fallback if the function isn't available
    for (let i = 0; i < 100; i++) {
      const neuron = document.createElement('div');
      neuron.className = 'neuron';
      neuron.style.left = `${Math.random() * 100}%`;
      neuron.style.top = `${Math.random() * 100}%`;
      brainContainer.appendChild(neuron);
    }
  }
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  // Count elements
  const neurons = brainContainer.querySelectorAll('.neuron').length;
  const connections = brainContainer.querySelectorAll('.connection').length;
  
  // Measure FPS
  const fps = await measureFPS(1000); // Measure for 1 second
  
  return {
    renderTime: `${renderTime.toFixed(2)}ms`,
    elementCount: neurons + connections,
    fps: fps
  };
}

async function testSimulationAnimationPerformance() {
  const simulationViz = document.getElementById('simulationVisualization');
  if (!simulationViz) {
    throw new Error("Simulation visualization container not found");
  }
  
  // Open simulation if needed
  const trySimulationBtn = document.getElementById('trySimulationBtn');
  if (trySimulationBtn) {
    trySimulationBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Run simulation
  const runSimulationBtn = document.getElementById('runSimulation');
  if (runSimulationBtn) {
    // Measure start time
    const startTime = performance.now();
    
    runSimulationBtn.click();
    
    // Wait for simulation to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Measure FPS during animation
    const fps = await measureFPS(2000); // Measure for 2 seconds
    
    // Count animation elements
    const layers = simulationViz.querySelectorAll('.network-layer').length;
    const neurons = simulationViz.querySelectorAll('.network-neuron').length;
    const connections = simulationViz.querySelectorAll('.network-connection').length;
    
    return {
      fps: fps,
      elementCount: {
        layers: layers,
        neurons: neurons,
        connections: connections,
        total: layers + neurons + connections
      }
    };
  } else {
    throw new Error("Run simulation button not found");
  }
}

async function testScrollPerformance() {
  // Get page height
  const pageHeight = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;
  
  // Start at top
  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Measure scroll performance
  const startTime = performance.now();
  
  // Perform smooth scroll to bottom
  const scrollSteps = 10;
  const scrollDelay = 50;
  
  for (let i = 1; i <= scrollSteps; i++) {
    const targetY = (pageHeight - viewportHeight) * (i / scrollSteps);
    window.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
    await new Promise(resolve => setTimeout(resolve, scrollDelay));
  }
  
  const endTime = performance.now();
  const scrollTime = endTime - startTime;
  
  // Measure FPS during scroll
  const fps = await measureFPS(1000, true); // Measure for 1 second while scrolling
  
  // Return to top
  window.scrollTo(0, 0);
  
  return {
    scrollTime: `${scrollTime.toFixed(2)}ms`,
    fps: fps,
    pageHeight: `${pageHeight}px`
  };
}

// Helper function to measure FPS
async function measureFPS(duration = 1000, scroll = false) {
  return new Promise(resolve => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    // If scroll is true, scroll while measuring
    if (scroll) {
      const scrollInterval = setInterval(() => {
        window.scrollBy(0, 10);
      }, 16);
      
      setTimeout(() => {
        clearInterval(scrollInterval);
      }, duration);
    }
    
    function countFrame() {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime < duration) {
        requestAnimationFrame(countFrame);
      } else {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        resolve(fps);
      }
    }
    
    requestAnimationFrame(countFrame);
  });
}

// Display performance test results
function displayPerformanceResults(results) {
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.style.position = 'fixed';
  resultsContainer.style.bottom = '10px';
  resultsContainer.style.left = '10px';
  resultsContainer.style.backgroundColor = '#1e293b';
  resultsContainer.style.color = 'white';
  resultsContainer.style.padding = '15px';
  resultsContainer.style.borderRadius = '8px';
  resultsContainer.style.zIndex = '9999';
  resultsContainer.style.maxWidth = '400px';
  resultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  // Create header
  const header = document.createElement('h3');
  header.textContent = 'Performance Test Results';
  header.style.marginTop = '0';
  header.style.marginBottom = '15px';
  header.style.color = '#6366f1';
  resultsContainer.appendChild(header);
  
  // Create results list
  results.tests.forEach(test => {
    const testContainer = document.createElement('div');
    testContainer.style.marginBottom = '15px';
    testContainer.style.padding = '10px';
    testContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    testContainer.style.borderRadius = '4px';
    
    const testName = document.createElement('div');
    testName.textContent = test.name;
    testName.style.fontWeight = 'bold';
    testName.style.marginBottom = '8px';
    testContainer.appendChild(testName);
    
    if (test.status === "COMPLETED" && test.metrics) {
      const metricsList = document.createElement('ul');
      metricsList.style.margin = '0';
      metricsList.style.padding = '0 0 0 20px';
      
      Object.entries(test.metrics).forEach(([key, value]) => {
        const metricItem = document.createElement('li');
        
        if (typeof value === 'object') {
          metricItem.textContent = `${key}: `;
          const subList = document.createElement('ul');
          subList.style.padding = '0 0 0 20px';
          
          Object.entries(value).forEach(([subKey, subValue]) => {
            const subItem = document.createElement('li');
            subItem.textContent = `${subKey}: ${subValue}`;
            subList.appendChild(subItem);
          });
          
          metricItem.appendChild(subList);
        } else {
          metricItem.textContent = `${key}: ${value}`;
          
          // Color code FPS values
          if (key === 'fps') {
            const fpsValue = parseInt(value);
            if (fpsValue >= 50) {
              metricItem.style.color = '#10b981'; // Green for good FPS
            } else if (fpsValue >= 30) {
              metricItem.style.color = '#f59e0b'; // Orange for acceptable FPS
            } else {
              metricItem.style.color = '#ef4444'; // Red for poor FPS
            }
          }
        }
        
        metricsList.appendChild(metricItem);
      });
      
      testContainer.appendChild(metricsList);
    } else if (test.error) {
      const errorText = document.createElement('div');
      errorText.textContent = `Error: ${test.error}`;
      errorText.style.color = '#ef4444';
      testContainer.appendChild(errorText);
    }
    
    resultsContainer.appendChild(testContainer);
  });
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.padding = '8px 15px';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.width = '100%';
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(resultsContainer);
  });
  
  resultsContainer.appendChild(closeButton);
  
  // Add to body
  document.body.appendChild(resultsContainer);
}