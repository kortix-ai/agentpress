/**
 * AGI Explorer Test API
 * This file provides a programmatic interface for testing the AGI Explorer application
 */

class AGIExplorerTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
        
        this.testFunctions = {
            brainVisualization: this.testBrainVisualization.bind(this),
            glitchEffect: this.testGlitchEffect.bind(this),
            navigationLinks: this.testNavigationLinks.bind(this),
            simulationControls: this.testSimulationControls.bind(this),
            simulationExecution: this.testSimulationExecution.bind(this),
            popupFunctionality: this.testPopupFunctionality.bind(this)
        };
    }
    
    /**
     * Run all tests or a specific set of tests
     * @param {Array} testNames - Optional array of test names to run
     * @returns {Promise} - Promise that resolves with test results
     */
    async runTests(testNames = null) {
        console.log("Starting AGI Explorer tests...");
        
        // Reset results
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };
        
        // Determine which tests to run
        const testsToRun = testNames 
            ? Object.entries(this.testFunctions).filter(([name]) => testNames.includes(name))
            : Object.entries(this.testFunctions);
        
        this.results.total = testsToRun.length;
        
        // Run each test
        for (const [name, testFn] of testsToRun) {
            console.log(`Running test: ${name}`);
            
            try {
                const result = await testFn();
                
                if (result) {
                    this.results.passed++;
                    console.log(`✅ ${name}: PASSED`);
                } else {
                    this.results.failed++;
                    console.log(`❌ ${name}: FAILED`);
                }
                
                this.results.tests.push({
                    name,
                    status: result ? 'PASSED' : 'FAILED',
                    error: null
                });
            } catch (error) {
                this.results.failed++;
                console.error(`❌ ${name}: ERROR - ${error.message}`);
                
                this.results.tests.push({
                    name,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
        
        // Log summary
        console.log("\nTest Summary:");
        console.log(`Total: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
        
        return this.results;
    }
    
    /**
     * Test brain visualization
     */
    testBrainVisualization() {
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
    
    /**
     * Test glitch effect
     */
    testGlitchEffect() {
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
    
    /**
     * Test navigation links
     */
    testNavigationLinks() {
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
    
    /**
     * Test simulation controls
     */
    testSimulationControls() {
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
        learningRateInput.value = 0.05;
        
        // Dispatch input event
        const event = new Event('input');
        learningRateInput.dispatchEvent(event);
        
        // Check if value display was updated
        const valueUpdated = learningRateValue.textContent === '0.05';
        
        // Reset to initial value
        learningRateInput.value = initialValue;
        learningRateInput.dispatchEvent(event);
        
        return valueUpdated;
    }
    
    /**
     * Test simulation execution
     */
    testSimulationExecution() {
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
        learningRateInput.value = 0.05;
        networkSizeInput.value = 7;
        taskComplexityInput.value = 3;
        taskDomainSelect.value = 'reasoning';
        
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
    
    /**
     * Test popup functionality
     */
    testPopupFunctionality() {
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
    
    /**
     * Get test results
     */
    getResults() {
        return this.results;
    }
}

// Export the tester class
window.AGIExplorerTester = AGIExplorerTester;