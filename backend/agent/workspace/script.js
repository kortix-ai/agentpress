// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            
            // Create mobile menu if it doesn't exist
            if (!document.querySelector('.mobile-nav')) {
                const mobileNav = document.createElement('div');
                mobileNav.className = 'mobile-nav';
                
                // Clone the navigation links
                const navLinksClone = navLinks.cloneNode(true);
                mobileNav.appendChild(navLinksClone);
                
                // Add to the DOM
                document.querySelector('.navbar').appendChild(mobileNav);
                
                // Style the mobile menu
                mobileNav.style.position = 'absolute';
                mobileNav.style.top = '100%';
                mobileNav.style.left = '0';
                mobileNav.style.width = '100%';
                mobileNav.style.backgroundColor = 'white';
                mobileNav.style.padding = '20px';
                mobileNav.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                mobileNav.style.display = 'none';
                mobileNav.style.flexDirection = 'column';
                
                // Style the navigation links in mobile menu
                navLinksClone.style.display = 'flex';
                navLinksClone.style.flexDirection = 'column';
                navLinksClone.style.gap = '15px';
            }
            
            // Toggle the mobile menu
            const mobileNav = document.querySelector('.mobile-nav');
            mobileNav.style.display = mobileNav.style.display === 'none' ? 'flex' : 'none';
            
            // Animate the hamburger icon
            const spans = this.querySelectorAll('span');
            if (this.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.padding = '10px 0';
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.padding = '15px 0';
            navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                const mobileNav = document.querySelector('.mobile-nav');
                if (mobileNav && mobileNav.style.display === 'flex') {
                    mobileMenuBtn.click();
                }
                
                // Scroll to the target element
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Form validation
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            
            // Simple validation
            if (name === '') {
                showError('name', 'Please enter your name');
                return;
            }
            
            if (email === '') {
                showError('email', 'Please enter your email');
                return;
            }
            
            if (!isValidEmail(email)) {
                showError('email', 'Please enter a valid email');
                return;
            }
            
            if (message === '') {
                showError('message', 'Please enter your message');
                return;
            }
            
            // If all validations pass, show success message
            contactForm.innerHTML = `
                <div style="text-align: center; padding: 40px 0;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 20px;"></i>
                    <h3>Thank You!</h3>
                    <p>Your message has been sent successfully. We'll get back to you soon.</p>
                </div>
            `;
        });
    }
    
    // Helper function to show error messages
    function showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        
        // Remove any existing error message
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create and add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '5px';
        
        field.parentElement.appendChild(errorDiv);
        
        // Highlight the field
        field.style.borderColor = '#ef4444';
        
        // Focus on the field
        field.focus();
        
        // Remove error when user starts typing
        field.addEventListener('input', function() {
            const error = this.parentElement.querySelector('.error-message');
            if (error) {
                error.remove();
            }
            this.style.borderColor = '';
        });
    }
    
    // Helper function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Add animation on scroll
    const animateElements = document.querySelectorAll('.feature-card, .pricing-card, .about-image, .about-text');
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        animateElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(element);
        });
    }
});