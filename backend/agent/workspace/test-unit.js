/**
 * AGI Explorer Unit Tests
 * This file contains unit tests for the AGI Explorer application
 */

// Test suite for AGI Explorer
describe('AGI Explorer', function() {
    
    // Brain visualization tests
    describe('Brain Visualization', function() {
        it('should create neurons in the brain visualization', function() {
            const brainContainer = document.getElementById('brainVisualization');
            const neurons = brainContainer.querySelectorAll('.neuron');
            
            expect(neurons.length).to.be.greaterThan(0);
        });
        
        it('should create connections in the brain visualization', function() {
            const brainContainer = document.getElementById('brainVisualization');
            const connections = brainContainer.querySelectorAll('.connection');
            
            expect(connections.length).to.be.greaterThan(0);
        });
    });
    
    // Glitch effect tests
    describe('Glitch Effect', function() {
        it('should have the correct data-text attribute', function() {
            const glitchText = document.querySelector('.glitch-text');
            
            expect(glitchText.getAttribute('data-text')).to.equal(glitchText.textContent);
        });
        
        it('should apply glitch effect when class is added', function() {
            const glitchText = document.querySelector('.glitch-text');
            
            // Add glitching class
            glitchText.classList.add('glitching');
            
            // Check computed style
            const style = window.getComputedStyle(glitchText);
            expect(style.position).to.equal('relative');
            
            // Clean up
            glitchText.classList.remove('glitching');
        });
    });
    
    // Navigation tests
    describe('Navigation Links', function() {
        it('should have navigation links', function() {
            const navLinks = document.querySelectorAll('.nav-links a');
            
            expect(navLinks.length).to.be.greaterThan(0);
        });
        
        it('should have valid href attributes pointing to sections', function() {
            const navLinks = document.querySelectorAll('.nav-links a');
            
            let allValid = true;
            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#') || !document.querySelector(href)) {
                    allValid = false;
                }
            });
            
            expect(allValid).to.be.true;
        });
    });
    
    // Simulation controls tests
    describe('Simulation Controls', function() {
        it('should have all required simulation controls', function() {
            const controls = [
                'learningRate',
                'networkSize',
                'taskComplexity',
                'taskDomain',
                'runSimulation',
                'resetSimulation'
            ];
            
            controls.forEach(controlId => {
                const control = document.getElementById(controlId);
                expect(control).to.exist;
            });
        });
        
        it('should update value display when range input changes', function() {
            const learningRateInput = document.getElementById('learningRate');
            const learningRateValue = document.getElementById('learningRateValue');
            
            const initialValue = learningRateInput.value;
            const testValue = '0.05';
            
            // Change value
            learningRateInput.value = testValue;
            
            // Dispatch input event
            const event = new Event('input');
            learningRateInput.dispatchEvent(event);
            
            // Check if value display was updated
            expect(learningRateValue.textContent).to.equal(testValue);
            
            // Reset to initial value
            learningRateInput.value = initialValue;
            learningRateInput.dispatchEvent(event);
        });
    });
    
    // Simulation execution tests
    describe('Simulation Execution', function() {
        // This is more of an integration test and might be slow
        it('should create network visualization when simulation is run', function(done) {
            this.timeout(5000); // Increase timeout for this test
            
            // Get simulation controls
            const learningRateInput = document.getElementById('learningRate');
            const networkSizeInput = document.getElementById('networkSize');
            const taskComplexityInput = document.getElementById('taskComplexity');
            const taskDomainSelect = document.getElementById('taskDomain');
            const runButton = document.getElementById('runSimulation');
            
            // Set test values
            learningRateInput.value = '0.05';
            networkSizeInput.value = '7';
            taskComplexityInput.value = '3';
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
            
            // Check if visualization was created after a delay
            setTimeout(() => {
                const networkLayers = simulationViz.querySelectorAll('.network-layer');
                const networkNeurons = simulationViz.querySelectorAll('.network-neuron');
                const networkConnections = simulationViz.querySelectorAll('.network-connection');
                
                expect(networkLayers.length).to.be.greaterThan(0);
                expect(networkNeurons.length).to.be.greaterThan(0);
                expect(networkConnections.length).to.be.greaterThan(0);
                
                done();
            }, 2000);
        });
    });
    
    // Popup functionality tests
    describe('Popup Functionality', function() {
        it('should open popup when simulate button is clicked', function() {
            const simulateBtn = document.getElementById('simulateBtn');
            const simulationPopup = document.getElementById('simulationPopup');
            
            // Click the button
            simulateBtn.click();
            
            // Check if popup is displayed
            const isDisplayed = window.getComputedStyle(simulationPopup).display === 'flex';
            expect(isDisplayed).to.be.true;
        });
        
        it('should close popup when close button is clicked', function(done) {
            const closePopup = document.getElementById('closePopup');
            const simulationPopup = document.getElementById('simulationPopup');
            
            // Click the close button
            closePopup.click();
            
            // Check if popup is hidden after a short delay
            setTimeout(() => {
                const isHidden = window.getComputedStyle(simulationPopup).display === 'none';
                expect(isHidden).to.be.true;
                done();
            }, 300);
        });
    });
});