// AGI Explorer Test Runner
console.log("Starting AGI Explorer Test Runner...");

// Configuration
const TEST_TIMEOUT = 5000; // 5 seconds timeout for each test
const SHOW_RESULTS_UI = true; // Whether to show test results in the UI

// Test suite
const tests = [
  {
    name: "Brain Visualization",
    description: "Tests if the brain visualization is properly rendered",
    run: testBrainVisualization
  },
  {
    name: "Glitch Effect",
    description: "Tests if the glitch effect is applied to the title",
    run: testGlitchEffect
  },
  {
    name: "Navigation Links",
    description: "Tests if navigation links work correctly",
    run: testNavigationLinks
  },
  {
    name: "Simulation Controls",
    description: "Tests if simulation controls are properly initialized",
    run: testSimulationControls
  },
  {
    name: "Simulation Execution",
    description: "Tests if the simulation can be run successfully",
    run: testSimulationExecution
  },
  {
    name: "Popup Functionality",
    description: "Tests if the simulation popup works correctly",
    run: testPopupFunctionality
  }
];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, waiting for scripts to initialize...");
  
  // Wait a bit to ensure all scripts are initialized
  setTimeout(runAllTests, 1000);
});

// Run all tests
async function runAllTests() {
  console.log("Running all tests...");
  
  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    testResults: []
  };
  
  // Run each test
  for (const test of tests) {
    console.log(`Running test: ${test.name}`);
    
    try {
      // Run the test with timeout
      const result = await runWithTimeout(test.run, TEST_TIMEOUT);
      
      const testResult = {
        name: test.name,
        description: test.description,
        status: result ? "PASSED" : "FAILED",
        error: null
      };
      
      if (result) {
        results.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
      
      results.testResults.push(testResult);
    } catch (error) {
      results.failed++;
      
      const testResult = {
        name: test.name,
        description: test.description,
        status: "ERROR",
        error: error.message
      };
      
      results.testResults.push(testResult);
      console.error(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  // Log summary
  console.log("\nTest Summary:");
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  // Show results in UI if enabled
  if (SHOW_RESULTS_UI) {
    displayTestResults(results);
  }
}

// Run a function with timeout
function runWithTimeout(fn, timeout) {
  return new Promise((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      reject(new Error("Test timed out"));
    }, timeout);
    
    // Run the function
    try {
      const result = fn();
      
      // Handle if the function returns a promise
      if (result instanceof Promise) {
        result
          .then(value => {
            clearTimeout(timeoutId);
            resolve(value);
          })
          .catch(error => {
            clearTimeout(timeoutId);
            reject(error);
          });
      } else {
        clearTimeout(timeoutId);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Test functions
function testBrainVisualization() {
  console.log("Testing brain visualization...");
  
  const brainContainer = document.getElementById('brainVisualization');
  if (!brainContainer) {
    console.error("Brain visualization container not found");
    return false;
  }
  
  const neurons = brainContainer.querySelectorAll('.neuron');
  const connections = brainContainer.querySelectorAll('.connection');
  
  if (neurons.length === 0) {
    console.error("No neurons found in brain visualization");
    return false;
  }
  
  if (connections.length === 0) {
    console.error("No connections found in brain visualization");
    return false;
  }
  
  console.log(`Brain visualization test passed: ${neurons.length} neurons and ${connections.length} connections found`);
  return true;
}

function testGlitchEffect() {
  console.log("Testing glitch effect...");
  
  const glitchText = document.querySelector('.glitch-text');
  if (!glitchText) {
    console.error("Glitch text element not found");
    return false;
  }
  
  // Check if the glitch text has the correct data attribute
  if (glitchText.getAttribute('data-text') !== glitchText.textContent) {
    console.error("Glitch text data-text attribute doesn't match content");
    return false;
  }
  
  // Trigger glitch effect manually
  glitchText.classList.add('glitching');
  
  // Check if the glitch effect is applied
  const hasGlitchEffect = window.getComputedStyle(glitchText).getPropertyValue('position') === 'relative';
  
  // Clean up
  setTimeout(() => {
    glitchText.classList.remove('glitching');
  }, 200);
  
  return hasGlitchEffect;
}

function testNavigationLinks() {
  console.log("Testing navigation links...");
  
  const navLinks = document.querySelectorAll('.nav-links a');
  if (navLinks.length === 0) {
    console.error("No navigation links found");
    return false;
  }
  
  // Check if all links have href attributes that point to sections
  let allValid = true;
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || !document.querySelector(href)) {
      console.error(`Invalid navigation link: ${href}`);
      allValid = false;
    }
  });
  
  return allValid;
}

function testSimulationControls() {
  console.log("Testing simulation controls...");
  
  // Check if all simulation controls exist
  const controls = [
    'learningRate',
    'networkSize',
    'taskComplexity',
    'taskDomain',
    'runSimulation',
    'resetSimulation'
  ];
  
  let allControlsExist = true;
  controls.forEach(controlId => {
    const control = document.getElementById(controlId);
    if (!control) {
      console.error(`Simulation control not found: ${controlId}`);
      allControlsExist = false;
    }
  });
  
  if (!allControlsExist) return false;
  
  // Test range input value display
  const learningRateInput = document.getElementById('learningRate');
  const learningRateValue = document.getElementById('learningRateValue');
  
  if (!learningRateValue) {
    console.error("Learning rate value display not found");
    return false;
  }
  
  const initialValue = learningRateInput.value;
  const testValue = "0.05";
  learningRateInput.value = testValue;
  
  // Dispatch input event
  const event = new Event('input');
  learningRateInput.dispatchEvent(event);
  
  // Check if value display was updated
  const valueUpdated = learningRateValue.textContent === testValue;
  
  // Reset to initial value
  learningRateInput.value = initialValue;
  learningRateInput.dispatchEvent(event);
  
  return valueUpdated;
}

function testSimulationExecution() {
  console.log("Testing simulation execution...");
  
  // Get simulation controls
  const learningRateInput = document.getElementById('learningRate');
  const networkSizeInput = document.getElementById('networkSize');
  const taskComplexityInput = document.getElementById('taskComplexity');
  const taskDomainSelect = document.getElementById('taskDomain');
  const runButton = document.getElementById('runSimulation');
  
  if (!learningRateInput || !networkSizeInput || !taskComplexityInput || 
      !taskDomainSelect || !runButton) {
    console.error("Simulation controls not found");
    return false;
  }
  
  // Set test values
  learningRateInput.value = "0.05";
  networkSizeInput.value = "7";
  taskComplexityInput.value = "3";
  taskDomainSelect.value = "reasoning";
  
  // Trigger input events
  const event = new Event('input');
  learningRateInput.dispatchEvent(event);
  networkSizeInput.dispatchEvent(event);
  taskComplexityInput.dispatchEvent(event);
  
  // Clear previous visualization
  const simulationViz = document.getElementById('simulationVisualization');
  simulationViz.innerHTML = '';
  
  // Run the simulation
  runButton.click();
  
  // Check if visualization was created (after a short delay)
  return new Promise(resolve => {
    setTimeout(() => {
      const networkLayers = simulationViz.querySelectorAll('.network-layer');
      const networkNeurons = simulationViz.querySelectorAll('.network-neuron');
      const networkConnections = simulationViz.querySelectorAll('.network-connection');
      
      if (networkLayers.length === 0 || networkNeurons.length === 0 || networkConnections.length === 0) {
        console.error("Network visualization not created properly");
        resolve(false);
      } else {
        console.log(`Simulation test passed: ${networkLayers.length} layers, ${networkNeurons.length} neurons, ${networkConnections.length} connections`);
        resolve(true);
      }
    }, 1000);
  });
}

function testPopupFunctionality() {
  console.log("Testing popup functionality...");
  
  const simulateBtn = document.getElementById('simulateBtn');
  const simulationPopup = document.getElementById('simulationPopup');
  const closePopup = document.getElementById('closePopup');
  
  if (!simulateBtn || !simulationPopup || !closePopup) {
    console.error("Simulation popup elements not found");
    return false;
  }
  
  // Test opening popup
  simulateBtn.click();
  
  // Check if popup is displayed
  const isDisplayed = window.getComputedStyle(simulationPopup).display === 'flex';
  
  // Test closing popup
  closePopup.click();
  
  // Check if popup is hidden after a short delay
  return new Promise(resolve => {
    setTimeout(() => {
      const isHidden = window.getComputedStyle(simulationPopup).display === 'none';
      if (!isHidden) {
        console.error("Popup did not close properly");
        resolve(false);
      } else {
        resolve(isDisplayed); // Return true only if it was displayed and then hidden
      }
    }, 300);
  });
}

// Display test results in UI
function displayTestResults(results) {
  // Create test results container
  const resultsContainer = document.createElement('div');
  resultsContainer.style.position = 'fixed';
  resultsContainer.style.top = '20px';
  resultsContainer.style.right = '20px';
  resultsContainer.style.backgroundColor = results.failed === 0 ? '#10b981' : '#ef4444';
  resultsContainer.style.color = 'white';
  resultsContainer.style.padding = '20px';
  resultsContainer.style.borderRadius = '8px';
  resultsContainer.style.zIndex = '9999';
  resultsContainer.style.maxWidth = '400px';
  resultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  resultsContainer.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  // Create header
  const header = document.createElement('h2');
  header.textContent = `Test Results: ${results.failed === 0 ? 'PASSED' : 'FAILED'}`;
  header.style.marginTop = '0';
  header.style.marginBottom = '15px';
  header.style.fontSize = '1.5rem';
  resultsContainer.appendChild(header);
  
  // Create summary
  const summary = document.createElement('div');
  summary.style.display = 'flex';
  summary.style.justifyContent = 'space-between';
  summary.style.marginBottom = '15px';
  summary.style.padding = '10px';
  summary.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
  summary.style.borderRadius = '4px';
  
  const totalTests = document.createElement('div');
  totalTests.innerHTML = `<strong>Total:</strong> ${results.total}`;
  
  const passedTests = document.createElement('div');
  passedTests.innerHTML = `<strong>Passed:</strong> ${results.passed}`;
  
  const failedTests = document.createElement('div');
  failedTests.innerHTML = `<strong>Failed:</strong> ${results.failed}`;
  
  summary.appendChild(totalTests);
  summary.appendChild(passedTests);
  summary.appendChild(failedTests);
  
  resultsContainer.appendChild(summary);
  
  // Create results list
  const resultsList = document.createElement('div');
  resultsList.style.maxHeight = '300px';
  resultsList.style.overflowY = 'auto';
  resultsList.style.marginBottom = '15px';
  
  results.testResults.forEach(test => {
    const testItem = document.createElement('div');
    testItem.style.padding = '10px';
    testItem.style.marginBottom = '8px';
    testItem.style.borderRadius = '4px';
    testItem.style.backgroundColor = 
      test.status === 'PASSED' ? 'rgba(16, 185, 129, 0.2)' : 
      test.status === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' : 
      'rgba(245, 158, 11, 0.2)';
    
    const testName = document.createElement('div');
    testName.innerHTML = `<strong>${test.name}</strong>`;
    testName.style.marginBottom = '5px';
    
    const testStatus = document.createElement('div');
    testStatus.style.display = 'flex';
    testStatus.style.justifyContent = 'space-between';
    
    const statusLabel = document.createElement('span');
    statusLabel.textContent = test.status;
    statusLabel.style.fontWeight = 'bold';
    
    testStatus.appendChild(statusLabel);
    
    testItem.appendChild(testName);
    testItem.appendChild(document.createElement('small')).textContent = test.description;
    testItem.appendChild(testStatus);
    
    if (test.error) {
      const errorMessage = document.createElement('div');
      errorMessage.textContent = test.error;
      errorMessage.style.marginTop = '5px';
      errorMessage.style.fontSize = '0.8rem';
      errorMessage.style.color = '#f87171';
      testItem.appendChild(errorMessage);
    }
    
    resultsList.appendChild(testItem);
  });
  
  resultsContainer.appendChild(resultsList);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.padding = '8px 15px';
  closeButton.style.borderRadius = '4px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.width = '100%';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.transition = 'background-color 0.2s';
  
  closeButton.addEventListener('mouseover', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
  });
  
  closeButton.addEventListener('mouseout', () => {
    closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  });
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(resultsContainer);
  });
  
  resultsContainer.appendChild(closeButton);
  
  // Add to body
  document.body.appendChild(resultsContainer);
}