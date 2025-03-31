// AGI Explorer Integration Tests
console.log("Starting AGI Explorer integration tests...");

// Configuration
const TEST_TIMEOUT = 5000; // 5 seconds timeout for each test

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, waiting for scripts to initialize...");
  
  // Wait a bit to ensure all scripts are initialized
  setTimeout(runIntegrationTests, 1000);
});

// Run all integration tests
async function runIntegrationTests() {
  console.log("Running integration tests...");
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    testResults: []
  };
  
  // Test 1: End-to-end simulation test
  try {
    const simulationResult = await testEndToEndSimulation();
    addTestResult(results, "End-to-end Simulation", simulationResult);
  } catch (error) {
    addTestResult(results, "End-to-end Simulation", false, error.message);
  }
  
  // Test 2: Navigation flow test
  try {
    const navigationResult = await testNavigationFlow();
    addTestResult(results, "Navigation Flow", navigationResult);
  } catch (error) {
    addTestResult(results, "Navigation Flow", false, error.message);
  }
  
  // Test 3: Responsive layout test
  try {
    const responsiveResult = await testResponsiveLayout();
    addTestResult(results, "Responsive Layout", responsiveResult);
  } catch (error) {
    addTestResult(results, "Responsive Layout", false, error.message);
  }
  
  // Log summary
  console.log("\nIntegration Test Summary:");
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  // Display results
  displayIntegrationTestResults(results);
}

// Helper function to add test result
function addTestResult(results, testName, passed, errorMessage = null) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    results.failed++;
    console.log(`❌ ${testName}: FAILED${errorMessage ? ' - ' + errorMessage : ''}`);
  }
  
  results.testResults.push({
    name: testName,
    status: passed ? "PASSED" : "FAILED",
    error: errorMessage
  });
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
async function testEndToEndSimulation() {
  console.log("Testing end-to-end simulation...");
  
  // Get simulation controls
  const simulateBtn = document.getElementById('simulateBtn');
  const simulationPopup = document.getElementById('simulationPopup');
  const closePopup = document.getElementById('closePopup');
  
  if (!simulateBtn || !simulationPopup || !closePopup) {
    throw new Error("Simulation elements not found");
  }
  
  // Open simulation popup
  simulateBtn.click();
  
  // Check if popup is displayed
  await new Promise(resolve => setTimeout(resolve, 300));
  const isDisplayed = window.getComputedStyle(simulationPopup).display === 'flex';
  
  if (!isDisplayed) {
    throw new Error("Simulation popup did not open");
  }
  
  // Check if results are displayed
  const resultsContainer = document.getElementById('simulationResults');
  if (!resultsContainer || resultsContainer.children.length === 0) {
    throw new Error("Simulation results not displayed");
  }
  
  // Close popup
  closePopup.click();
  
  // Check if popup is closed
  await new Promise(resolve => setTimeout(resolve, 300));
  const isClosed = window.getComputedStyle(simulationPopup).display === 'none';
  
  if (!isClosed) {
    throw new Error("Simulation popup did not close");
  }
  
  return true;
}

async function testNavigationFlow() {
  console.log("Testing navigation flow...");
  
  // Get navigation buttons
  const learnMoreBtn = document.getElementById('learnMoreBtn');
  const trySimulationBtn = document.getElementById('trySimulationBtn');
  
  if (!learnMoreBtn || !trySimulationBtn) {
    throw new Error("Navigation buttons not found");
  }
  
  // Get initial scroll position
  const initialScrollY = window.scrollY;
  
  // Click learn more button
  learnMoreBtn.click();
  
  // Wait for scroll
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if page scrolled
  const scrolledAfterLearnMore = window.scrollY > initialScrollY;
  
  if (!scrolledAfterLearnMore) {
    throw new Error("Page did not scroll after clicking Learn More");
  }
  
  // Click try simulation button
  trySimulationBtn.click();
  
  // Wait for scroll
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Check if page scrolled further
  const scrolledAfterTrySimulation = window.scrollY > initialScrollY + 100;
  
  if (!scrolledAfterTrySimulation) {
    throw new Error("Page did not scroll after clicking Try Simulation");
  }
  
  return true;
}

async function testResponsiveLayout() {
  console.log("Testing responsive layout...");
  
  // Save original window width
  const originalWidth = window.innerWidth;
  
  try {
    // Test mobile layout
    window.innerWidth = 480;
    window.dispatchEvent(new Event('resize'));
    
    // Wait for resize to take effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if mobile layout is applied
    const heroSection = document.querySelector('.hero');
    const heroComputedStyle = window.getComputedStyle(heroSection);
    
    const isMobileLayout = heroComputedStyle.gridTemplateColumns.includes('1fr') && 
                          !heroComputedStyle.gridTemplateColumns.includes('1fr 1fr');
    
    if (!isMobileLayout) {
      throw new Error("Mobile layout not applied correctly");
    }
    
    return true;
  } finally {
    // Restore original width
    window.innerWidth = originalWidth;
    window.dispatchEvent(new Event('resize'));
  }
}

// Display integration test results
function displayIntegrationTestResults(results) {
  // Create results container
  const resultsContainer = document.createElement('div');
  resultsContainer.style.position = 'fixed';
  resultsContainer.style.bottom = '10px';
  resultsContainer.style.right = '10px';
  resultsContainer.style.backgroundColor = results.failed === 0 ? '#10b981' : '#ef4444';
  resultsContainer.style.color = 'white';
  resultsContainer.style.padding = '15px';
  resultsContainer.style.borderRadius = '8px';
  resultsContainer.style.zIndex = '9999';
  resultsContainer.style.maxWidth = '300px';
  resultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  // Create header
  const header = document.createElement('h3');
  header.textContent = `Integration Tests: ${results.failed === 0 ? 'PASSED' : 'FAILED'}`;
  header.style.marginTop = '0';
  header.style.marginBottom = '10px';
  resultsContainer.appendChild(header);
  
  // Create results list
  const resultsList = document.createElement('ul');
  resultsList.style.margin = '0';
  resultsList.style.padding = '0 0 0 20px';
  
  results.testResults.forEach(test => {
    const item = document.createElement('li');
    item.textContent = `${test.name}: ${test.status}`;
    if (test.error) {
      const errorText = document.createElement('div');
      errorText.textContent = test.error;
      errorText.style.fontSize = '0.8em';
      errorText.style.opacity = '0.8';
      item.appendChild(errorText);
    }
    item.style.marginBottom = '5px';
    resultsList.appendChild(item);
  });
  
  resultsContainer.appendChild(resultsList);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  closeButton.style.border = 'none';
  closeButton.style.color = 'white';
  closeButton.style.padding = '5px 10px';
  closeButton.style.marginTop = '10px';
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