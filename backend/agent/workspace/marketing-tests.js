// Marketing Landing Page Test Suite

// Main test runner
function runMarketingTests() {
    console.log('%cRunning Marketing Landing Page Tests...', 'color: blue; font-weight: bold');
    
    testNavigation();
    testHeroSection();
    testServices();
    testStats();
    testContactForm();
    testResponsiveness();
    testAnimations();
    
    console.log('%cAll tests completed!', 'color: green; font-weight: bold');
}

// Test Navigation
function testNavigation() {
    console.group('Navigation Tests');
    
    // Test navigation elements
    const navbar = document.querySelector('.navbar');
    const logo = document.querySelector('.logo');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    console.assert(navbar !== null, 'Navbar exists');
    console.assert(logo !== null, 'Logo exists');
    console.assert(navLinks.length === 3, `Expected 3 nav links, found ${navLinks.length}`);
    
    // Test navigation functionality
    navLinks.forEach(link => {
        console.assert(link.getAttribute('href').startsWith('#'), 
            'Navigation links have proper anchor format');
    });
    
    console.groupEnd();
}

// Test Hero Section
function testHeroSection() {
    console.group('Hero Section Tests');
    
    const hero = document.querySelector('.hero');
    const ctaButton = document.querySelector('.cta-button');
    
    console.assert(hero !== null, 'Hero section exists');
    console.assert(ctaButton !== null, 'CTA button exists');
    
    // Test hero content
    const heroTitle = hero.querySelector('h1');
    console.assert(heroTitle.textContent.length > 0, 'Hero title has content');
    
    console.groupEnd();
}

// Test Services Section
function testServices() {
    console.group('Services Tests');
    
    const services = document.querySelectorAll('.service-card');
    console.assert(services.length === 3, `Expected 3 service cards, found ${services.length}`);
    
    services.forEach(service => {
        console.assert(service.querySelector('i') !== null, 'Service has icon');
        console.assert(service.querySelector('h3') !== null, 'Service has title');
        console.assert(service.querySelector('p') !== null, 'Service has description');
    });
    
    console.groupEnd();
}

// Test Statistics Section
function testStats() {
    console.group('Statistics Tests');
    
    const stats = document.querySelectorAll('.stat-item');
    console.assert(stats.length === 3, `Expected 3 stat items, found ${stats.length}`);
    
    stats.forEach(stat => {
        const number = stat.querySelector('.stat-number');
        const label = stat.querySelector('.stat-label');
        console.assert(number !== null && label !== null, 'Stat item has number and label');
    });
    
    console.groupEnd();
}

// Test Contact Form
function testContactForm() {
    console.group('Contact Form Tests');
    
    const form = document.querySelector('.contact-form');
    const inputs = form.querySelectorAll('input');
    const textarea = form.querySelector('textarea');
    const submitBtn = form.querySelector('.submit-btn');
    
    console.assert(form !== null, 'Contact form exists');
    console.assert(inputs.length === 2, 'Form has correct number of inputs');
    console.assert(textarea !== null, 'Form has textarea');
    console.assert(submitBtn !== null, 'Form has submit button');
    
    // Test form validation
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');
    
    console.assert(nameInput.hasAttribute('required'), 'Name input is required');
    console.assert(emailInput.hasAttribute('required'), 'Email input is required');
    
    console.groupEnd();
}

// Test Responsive Design
function testResponsiveness() {
    console.group('Responsive Design Tests');
    
    const container = document.querySelector('.container');
    const computedStyle = window.getComputedStyle(container);
    
    console.assert(computedStyle.maxWidth === '1200px', 'Container has correct max-width');
    
    // Test mobile menu
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    console.assert(mobileMenuButton !== null, 'Mobile menu button exists');
    
    console.groupEnd();
}

// Test Animations
function testAnimations() {
    console.group('Animation Tests');
    
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
        const styles = window.getComputedStyle(card);
        console.assert(styles.transition.includes('transform'), 
            'Service cards have hover animation');
    });
    
    console.groupEnd();
}

// Test UI Components Styling
function testStyling() {
    console.group('Styling Tests');
    
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    // Test color scheme
    console.assert(styles.getPropertyValue('--primary-color') !== '', 
        'Primary color is defined');
    console.assert(styles.getPropertyValue('--secondary-color') !== '', 
        'Secondary color is defined');
    
    console.groupEnd();
}

// Run tests when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    runMarketingTests();
});

// Error handling
window.addEventListener('error', (error) => {
    console.error('Test Error:', error.message);
});

// Helper function to simulate user interactions
function simulateUserInteraction() {
    // Simulate scroll
    window.scrollTo(0, 500);
    
    // Simulate form input
    const form = document.querySelector('.contact-form');
    const nameInput = form.querySelector('input[type="text"]');
    const emailInput = form.querySelector('input[type="email"]');
    
    nameInput.value = 'Test User';
    emailInput.value = 'test@example.com';
    
    // Simulate form submission
    form.dispatchEvent(new Event('submit'));
}

// Run interaction tests
setTimeout(simulateUserInteraction, 1000);