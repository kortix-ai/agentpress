// Enhanced Test Suite for CulinaryHub Website

// Function to run all tests
function runTests() {
    console.log('%cStarting CulinaryHub Tests...', 'color: blue; font-weight: bold');
    
    testNavigationLinks();
    testRecipeCardAnimation();
    testViewRecipeButton();
    testResponsiveElements();
    testStylingProperties();
    
    console.log('%cTests completed!', 'color: blue; font-weight: bold');
}

// Test Navigation Links
function testNavigationLinks() {
    console.group('Navigation Tests');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Test quantity
    console.assert(navLinks.length === 3, 'Expected 3 navigation links, found: ' + navLinks.length);
    console.log(navLinks.length === 3 ? '✓ Correct number of navigation links' : '✗ Wrong number of links');
    
    // Test active state
    navLinks[1].click();
    setTimeout(() => {
        console.assert(navLinks[1].classList.contains('active'), 'Active state not working');
        console.log(navLinks[1].classList.contains('active') ? '✓ Active state working' : '✗ Active state failed');
    }, 100);

    // Test link text content
    const expectedLinks = ['Recipes', 'Techniques', 'Kitchen Tips'];
    navLinks.forEach((link, index) => {
        console.assert(link.textContent === expectedLinks[index], 
            `Link text mismatch: Expected ${expectedLinks[index]}, got ${link.textContent}`);
    });
    console.groupEnd();
}

// Test Recipe Card Animation
function testRecipeCardAnimation() {
    console.group('Recipe Card Tests');
    const miniCards = document.querySelectorAll('.mini-card');
    const mainCard = document.querySelector('.recipe-card');
    
    // Test mini cards
    console.assert(miniCards.length === 3, 'Expected 3 mini cards, found: ' + miniCards.length);
    console.log(miniCards.length === 3 ? '✓ Correct number of mini cards' : '✗ Wrong number of cards');

    // Test main recipe card content
    console.assert(mainCard !== null, 'Main recipe card exists');
    console.assert(mainCard.querySelector('h2').textContent === 'Classic Pasta Carbonara', 
        'Main recipe card title correct');
    console.groupEnd();
}

// Test View Recipe Button
function testViewRecipeButton() {
    console.group('Button Tests');
    const viewButton = document.querySelector('.btn');
    
    console.assert(viewButton !== null, 'View Recipe button exists');
    console.log(viewButton ? '✓ View Recipe button found' : '✗ Button not found');

    // Test button styling
    const styles = window.getComputedStyle(viewButton);
    console.assert(styles.backgroundColor.includes('231, 76, 60') || styles.backgroundColor.includes('#e74c3c'), 
        'Button has correct background color');
    console.groupEnd();
}

// Test Responsive Elements
function testResponsiveElements() {
    console.group('Responsive Design Tests');
    const container = document.querySelector('.container');
    const recipeGrid = document.querySelector('.recipe-grid');
    
    console.assert(container !== null, 'Container exists');
    console.assert(recipeGrid !== null, 'Recipe grid exists');
    
    // Test responsive styles
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    console.log(`Current viewport width: ${window.innerWidth}px`);
    console.log(`Responsive mode: ${mediaQuery.matches ? 'Mobile' : 'Desktop'}`);
    console.groupEnd();
}

// Test Styling Properties
function testStylingProperties() {
    console.group('Styling Tests');
    const body = document.body;
    const styles = window.getComputedStyle(body);
    
    console.assert(styles.fontFamily.includes('Segoe UI'), 'Correct font family applied');
    console.assert(styles.backgroundColor === 'rgb(247, 243, 237)', 'Correct background color');
    
    // Test layout
    console.assert(styles.display === 'flex', 'Body uses flex layout');
    console.assert(styles.flexDirection === 'column', 'Body uses column direction');
    console.groupEnd();
}

// Run tests when DOM is loaded
document.addEventListener('DOMContentLoaded', runTests);

// Add error handling
window.addEventListener('error', function(e) {
    console.error('Test Error:', e.message);
});