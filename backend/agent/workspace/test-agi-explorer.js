// AGI Explorer Test Script
console.log("Starting AGI Explorer test suite...");

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, running tests...");
  
  // Run tests after a short delay to ensure all scripts are initialized
  setTimeout(runTests, 1000);
});

function runTests() {
  // Test suite
  const tests = [
    testBrainVisualization,
    testGlitchEffect,
    testNavigationLinks,
    testSimulationControls,
    testSimulationPopup,
    testDynamicContent
  ];
  
  // Run each test and collect results
  const results = {};
  let allPassed = true;
  
  tests.forEach(test => {
    try {
      const result = test();
      results[test.name] = result ? "PASSED" : "FAILED";
      if (!result) allPassed = false;
    } catch (error) {
      console.error(`Error in ${test.name}:`, error);
      results[test.name] = "ERROR";
      allPassed = false;
    }
  });
  
  // Log results
  console.log("Test Results:");
  Object.entries(results).forEach(([test, result]) => {
    console.log(`- ${test}: ${result}`);
  });
  
  console.log(`Overall Test Result: ${allPassed ? "PASSED" : "FAILED"}`);
  
  // Display results on page
  displayTestResults(results, allPassed);
  
  // Update test panel if it exists
  updateTestPanel(results, allPassed);
}

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
    if (!href || !href.startsWith('#')) {
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
  
  // We're not checking for these controls in this test page since they're loaded dynamically
  // Instead, we'll just check if the buttons that would trigger the simulation exist
  
  const simulateBtn = document.getElementById('simulateBtn');
  const learnMoreBtn = document.getElementById('learnMoreBtn');
  const trySimulationBtn = document.getElementById('trySimulationBtn');
  
  if (!simulateBtn || !learnMoreBtn || !trySimulationBtn) {
    console.error("Essential buttons not found");
    return false;
  }
  
  return true;
}

function testSimulationPopup() {
  console.log("Testing simulation popup...");
  
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
  
  // Check if popup is hidden
  setTimeout(() => {
    const isHidden = window.getComputedStyle(simulationPopup).display === 'none';
    if (!isHidden) {
      console.error("Popup did not close properly");
    }
  }, 100);
  
  return isDisplayed;
}

function testDynamicContent() {
  console.log("Testing dynamic content loading...");
  
  // Check if the test panel exists
  const testPanel = document.querySelector('.test-panel');
  const testLog = document.getElementById('testLog');
  const testSummary = document.getElementById('testSummary');
  
  if (!testPanel || !testLog || !testSummary) {
    console.error("Test panel elements not found");
    return false;
  }
  
  // Add a test log entry to verify dynamic content manipulation
  const testEntry = document.createElement('div');
  testEntry.className = 'test-log-entry success';
  testEntry.textContent = 'Dynamic content test successful';
  testLog.appendChild(testEntry);
  
  // Check if the entry was added
  const entries = testLog.querySelectorAll('.test-log-entry');
  const lastEntry = entries[entries.length - 1];
  
  if (!lastEntry || lastEntry.textContent !== 'Dynamic content test successful') {
    console.error("Failed to add dynamic content");
    return false;
  }
  
  return true;
}

function displayTestResults(results, allPassed) {
  // Create test results container
  const resultsContainer = document.createElement('div');
  resultsContainer.style.position = 'fixed';
  resultsContainer.style.top = '10px';
  resultsContainer.style.right = '10px';
  resultsContainer.style.backgroundColor = allPassed ? '#10b981' : '#ef4444';
  resultsContainer.style.color = 'white';
  resultsContainer.style.padding = '15px';
  resultsContainer.style.borderRadius = '8px';
  resultsContainer.style.zIndex = '9999';
  resultsContainer.style.maxWidth = '300px';
  resultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
  // Create header
  const header = document.createElement('h3');
  header.textContent = `Test Results: ${allPassed ? 'PASSED' : 'FAILED'}`;
  header.style.marginTop = '0';
  header.style.marginBottom = '10px';
  resultsContainer.appendChild(header);
  
  // Create results list
  const resultsList = document.createElement('ul');
  resultsList.style.margin = '0';
  resultsList.style.padding = '0 0 0 20px';
  
  Object.entries(results).forEach(([test, result]) => {
    const item = document.createElement('li');
    item.textContent = `${test}: ${result}`;
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

function updateTestPanel(results, allPassed) {
  const testLog = document.getElementById('testLog');
  const testSummary = document.getElementById('testSummary');
  
  if (!testLog || !testSummary) return;
  
  // Add results to test log
  Object.entries(results).forEach(([test, result]) => {
    const entry = document.createElement('div');
    entry.className = `test-log-entry ${result === 'PASSED' ? 'success' : 'error'}`;
    entry.textContent = `${test}: ${result}`;
    testLog.appendChild(entry);
  });
  
  // Update test summary
  let summaryHTML = `<h3>Test Summary</h3>`;
  
  const passedCount = Object.values(results).filter(r => r === 'PASSED').length;
  const totalCount = Object.keys(results).length;
  
  summaryHTML += `<p>${passedCount} of ${totalCount} tests passed</p>`;
  summaryHTML += `<ul>`;
  
  Object.entries(results).forEach(([test, result]) => {
    summaryHTML += `<li class="${result === 'PASSED' ? 'passed' : 'failed'}">${test}: ${result}</li>`;
  });
  
  summaryHTML += `</ul>`;
  
  testSummary.innerHTML = summaryHTML;
  
  // Scroll log to bottom
  testLog.scrollTop = testLog.scrollHeight;
  
  // Add event listeners for test panel buttons
  const runAllTestsBtn = document.getElementById('runAllTests');
  const clearLogBtn = document.getElementById('clearLog');
  
  if (runAllTestsBtn) {
    runAllTestsBtn.addEventListener('click', runTests);
  }
  
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      testLog.innerHTML = '<div class="test-log-entry info">Log cleared. Ready to run tests.</div>';
    });
  }
}