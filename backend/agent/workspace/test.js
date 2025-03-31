// This is a test file to verify the functionality of the AGI Explorer application

console.log("Testing AGI Explorer application...");

// Function to test the brain visualization
function testBrainVisualization() {
    console.log("Testing brain visualization...");
    
    // Check if the brain container exists
    const brainContainer = document.getElementById('brainVisualization');
    if (!brainContainer) {
        console.error("Brain visualization container not found!");
        return false;
    }
    
    // Check if neurons were created
    const neurons = brainContainer.querySelectorAll('.neuron');
    if (neurons.length === 0) {
        console.error("No neurons found in the brain visualization!");
        return false;
    }
    
    // Check if connections were created
    const connections = brainContainer.querySelectorAll('.connection');
    if (connections.length === 0) {
        console.error("No connections found in the brain visualization!");
        return false;
    }
    
    console.log(`Brain visualization test passed: ${neurons.length} neurons and ${connections.length} connections created.`);
    return true;
}

// Function to test the simulation functionality
function testSimulation() {
    console.log("Testing simulation functionality...");
    
    // Check if simulation controls exist
    const learningRateInput = document.getElementById('learningRate');
    const networkSizeInput = document.getElementById('networkSize');
    const taskComplexityInput = document.getElementById('taskComplexity');
    const taskDomainSelect = document.getElementById('taskDomain');
    
    if (!learningRateInput || !networkSizeInput || !taskComplexityInput || !taskDomainSelect) {
        console.error("Simulation controls not found!");
        return false;
    }
    
    // Test running a simulation
    try {
        // Set test values
        learningRateInput.value = 0.05;
        networkSizeInput.value = 7;
        taskComplexityInput.value = 3;
        taskDomainSelect.value = 'reasoning';
        
        // Trigger value display updates
        const event = new Event('input');
        learningRateInput.dispatchEvent(event);
        networkSizeInput.dispatchEvent(event);
        taskComplexityInput.dispatchEvent(event);
        
        // Run the simulation
        const runButton = document.getElementById('runSimulation');
        if (!runButton) {
            console.error("Run simulation button not found!");
            return false;
        }
        
        console.log("Running simulation with test parameters...");
        runButton.click();
        
        // Check if visualization was created
        setTimeout(() => {
            const networkLayers = document.querySelectorAll('.network-layer');
            if (networkLayers.length === 0) {
                console.error("Network visualization not created!");
                return false;
            }
            
            console.log(`Simulation test passed: ${networkLayers.length} network layers created.`);
        }, 500);
        
        return true;
    } catch (error) {
        console.error("Error during simulation test:", error);
        return false;
    }
}

// Function to test the popup functionality
function testPopup() {
    console.log("Testing popup functionality...");
    
    // Check if popup elements exist
    const simulateBtn = document.getElementById('simulateBtn');
    const simulationPopup = document.getElementById('simulationPopup');
    const closePopup = document.getElementById('closePopup');
    
    if (!simulateBtn || !simulationPopup || !closePopup) {
        console.error("Popup elements not found!");
        return false;
    }
    
    // Test opening the popup
    try {
        simulateBtn.click();
        
        // Check if popup is displayed
        setTimeout(() => {
            if (simulationPopup.style.display !== 'flex') {
                console.error("Popup not displayed after clicking the button!");
                return false;
            }
            
            // Test closing the popup
            closePopup.click();
            
            setTimeout(() => {
                if (simulationPopup.style.display !== 'none') {
                    console.error("Popup not closed after clicking the close button!");
                    return false;
                }
                
                console.log("Popup test passed: popup opens and closes correctly.");
                return true;
            }, 300);
        }, 300);
    } catch (error) {
        console.error("Error during popup test:", error);
        return false;
    }
}

// Function to test smooth scrolling
function testSmoothScrolling() {
    console.log("Testing smooth scrolling...");
    
    // Check if scroll buttons exist
    const learnMoreBtn = document.getElementById('learnMoreBtn');
    const trySimulationBtn = document.getElementById('trySimulationBtn');
    
    if (!learnMoreBtn || !trySimulationBtn) {
        console.error("Scroll buttons not found!");
        return false;
    }
    
    // Test scrolling to about section
    try {
        const aboutSection = document.getElementById('about');
        if (!aboutSection) {
            console.error("About section not found!");
            return false;
        }
        
        // Get initial scroll position
        const initialScrollY = window.scrollY;
        
        // Click the learn more button
        learnMoreBtn.click();
        
        // Check if scrolling occurred
        setTimeout(() => {
            if (window.scrollY === initialScrollY) {
                console.error("Page did not scroll after clicking the learn more button!");
                return false;
            }
            
            console.log("Smooth scrolling test passed: page scrolls to target section.");
            return true;
        }, 1000);
    } catch (error) {
        console.error("Error during smooth scrolling test:", error);
        return false;
    }
}

// Function to test the glitch effect
function testGlitchEffect() {
    console.log("Testing glitch effect...");
    
    // Check if glitch text element exists
    const glitchText = document.querySelector('.glitch-text');
    if (!glitchText) {
        console.error("Glitch text element not found!");
        return false;
    }
    
    try {
        // Add glitching class manually
        glitchText.classList.add('glitching');
        
        // Check if the class was added
        if (!glitchText.classList.contains('glitching')) {
            console.error("Failed to add glitching class!");
            return false;
        }
        
        // Remove the class after a short delay
        setTimeout(() => {
            glitchText.classList.remove('glitching');
            
            // Check if the class was removed
            if (glitchText.classList.contains('glitching')) {
                console.error("Failed to remove glitching class!");
                return false;
            }
            
            console.log("Glitch effect test passed: class can be added and removed.");
        }, 200);
        
        return true;
    } catch (error) {
        console.error("Error during glitch effect test:", error);
        return false;
    }
}

// Run all tests when the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Running all tests...");
    
    // Wait a bit to ensure all scripts have initialized
    setTimeout(() => {
        const brainVisualizationResult = testBrainVisualization();
        const simulationResult = testSimulation();
        const popupResult = testPopup();
        const smoothScrollingResult = testSmoothScrolling();
        const glitchEffectResult = testGlitchEffect();
        
        console.log("Test results:");
        console.log("- Brain Visualization:", brainVisualizationResult ? "PASSED" : "FAILED");
        console.log("- Simulation:", simulationResult ? "PASSED" : "FAILED");
        console.log("- Popup:", popupResult ? "PASSED" : "FAILED");
        console.log("- Smooth Scrolling:", smoothScrollingResult ? "PASSED" : "FAILED");
        console.log("- Glitch Effect:", glitchEffectResult ? "PASSED" : "FAILED");
        
        const overallResult = brainVisualizationResult && simulationResult && popupResult && smoothScrollingResult && glitchEffectResult;
        console.log("Overall test result:", overallResult ? "PASSED" : "FAILED");
        
        // Display test results on the page
        displayTestResults({
            "Brain Visualization": brainVisualizationResult,
            "Simulation": simulationResult,
            "Popup": popupResult,
            "Smooth Scrolling": smoothScrollingResult,
            "Glitch Effect": glitchEffectResult
        }, overallResult);
    }, 1000);
});

// Function to display test results on the page
function displayTestResults(results, overallResult) {
    // Create test results container
    const resultsContainer = document.createElement('div');
    resultsContainer.style.position = 'fixed';
    resultsContainer.style.top = '10px';
    resultsContainer.style.right = '10px';
    resultsContainer.style.backgroundColor = overallResult ? '#10b981' : '#ef4444';
    resultsContainer.style.color = 'white';
    resultsContainer.style.padding = '15px';
    resultsContainer.style.borderRadius = '8px';
    resultsContainer.style.zIndex = '9999';
    resultsContainer.style.maxWidth = '300px';
    resultsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = `Test Results: ${overallResult ? 'PASSED' : 'FAILED'}`;
    header.style.marginTop = '0';
    header.style.marginBottom = '10px';
    resultsContainer.appendChild(header);
    
    // Create results list
    const resultsList = document.createElement('ul');
    resultsList.style.margin = '0';
    resultsList.style.padding = '0 0 0 20px';
    
    Object.entries(results).forEach(([test, result]) => {
        const item = document.createElement('li');
        item.textContent = `${test}: ${result ? 'PASSED' : 'FAILED'}`;
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