// DOM Elements
const burger = document.querySelector('.burger');
const navLinks = document.querySelector('.nav-links');
const newsletterForm = document.getElementById('newsletter-form');
const formMessage = document.getElementById('form-message');

// Toggle navigation menu
burger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Animate burger menu
    burger.classList.toggle('toggle');
    
    // Animation for burger icon
    const lines = burger.querySelectorAll('div');
    if (burger.classList.contains('toggle')) {
        lines[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
    } else {
        lines[0].style.transform = 'none';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'none';
    }
});

// Close menu when clicking a nav link
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        
        // Reset burger icon
        const lines = burger.querySelectorAll('div');
        lines[0].style.transform = 'none';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'none';
        burger.classList.remove('toggle');
    });
});

// Newsletter form submission
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = newsletterForm.querySelector('input[type="email"]').value;
        
        // Simple email validation
        if (!validateEmail(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }
        
        // Simulate form submission
        showMessage('Submitting...', '');
        
        // Simulate API call with timeout
        setTimeout(() => {
            // Success response simulation
            showMessage('Thank you for subscribing!', 'success');
            newsletterForm.reset();
        }, 1500);
    });
}

// Email validation function
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Show form message
function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = type;
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70, // Adjust for fixed header
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.card, .hero-content, .newsletter').forEach(el => {
    observer.observe(el);
});

// Add animation classes
document.querySelectorAll('.card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    card.style.transitionDelay = `${index * 0.1}s`;
});

// Animation for elements when they come into view
document.addEventListener('DOMContentLoaded', () => {
    const animateOnScroll = () => {
        document.querySelectorAll('.animate').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    };
    
    // Initial check for elements in viewport
    setTimeout(animateOnScroll, 100);
});