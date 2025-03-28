document.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    document.body.appendChild(progressBar);

    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-progress-indicator';
    scrollProgress.appendChild(scrollIndicator);
    document.body.appendChild(scrollProgress);

    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = `${scrolled}%`;
        scrollIndicator.style.height = `${scrolled}%`;
    });
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    document.body.appendChild(progressBar);

    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    const scrollIndicator = document.createElement('div');
    scrollIndicator.className = 'scroll-progress-indicator';
    scrollProgress.appendChild(scrollIndicator);
    document.body.appendChild(scrollProgress);

    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = `${scrolled}%`;
        scrollIndicator.style.height = `${scrolled}%`;
    });
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const button = newsletterForm.querySelector('button');
            
            if (emailInput.checkValidity()) {
                button.textContent = 'Subscribing...';
                button.disabled = true;
                
                setTimeout(() => {
                    button.textContent = 'Subscribed!';
                    emailInput.value = '';
                    
                    setTimeout(() => {
                        button.textContent = 'Subscribe';
                        button.disabled = false;
                    }, 2000);
                }, 1500);
            }
        });
    }
    const cookieBanner = document.querySelector('.cookie-banner');
    const acceptCookies = document.querySelector('.accept-cookies');
    const declineCookies = document.querySelector('.decline-cookies');

    if (!localStorage.getItem('cookieConsent')) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 2000);
    }

    acceptCookies.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'accepted');
        cookieBanner.classList.remove('show');
    });

    declineCookies.addEventListener('click', () => {
        localStorage.setItem('cookieConsent', 'declined');
        cookieBanner.classList.remove('show');
    });
    const heroShapes = document.querySelectorAll('.shape');
    
    document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        heroShapes.forEach(shape => {
            const shapeOffset = shape.getAttribute('data-offset') || 50;
            const x = mouseX * shapeOffset;
            const y = mouseY * shapeOffset;
            shape.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
    const animateStats = () => {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCount = () => {
                if (current < target) {
                    current += increment;
                    stat.textContent = Math.round(current);
                    requestAnimationFrame(updateCount);
                } else {
                    stat.textContent = target;
                }
            };
            
            updateCount();
        });
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        statsObserver.observe(statsSection);
    }
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-spinner';
    document.body.appendChild(loadingSpinner);

    window.addEventListener('load', () => {
        loadingSpinner.remove();
        document.body.classList.add('loaded');
    });
    const initTestimonialScroll = () => {
    const testimonialContainer = document.querySelector('.testimonials-grid');
    if (testimonialContainer) {
        setInterval(() => {
            testimonialContainer.scrollBy({
                left: 320,
                behavior: 'smooth'
            });
            
            if (testimonialContainer.scrollLeft + testimonialContainer.clientWidth >= testimonialContainer.scrollWidth) {
                setTimeout(() => {
                    testimonialContainer.scrollTo({
                        left: 0,
                        behavior: 'smooth'
                    });
                }, 1000);
            }
        }, 5000);
    }
};

const animateElements = () => {
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            card.style.setProperty('--animation-order', index + 1);
        });
        
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            card.style.setProperty('--animation-order', index + 1);
        });
    };
    
    animateElements();
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.className = 'scroll-top';
    scrollTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    document.body.appendChild(scrollTopBtn);

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    const contactForm = document.querySelector('.contact-form');
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        const feedback = document.createElement('div');
        feedback.className = 'form-feedback';
        
        if (validateForm(formData)) {
            feedback.textContent = 'Message sent successfully!';
            feedback.classList.add('success');
            contactForm.reset();
        } else {
            feedback.textContent = 'Please fill all fields correctly.';
            feedback.classList.add('error');
        }
        
        contactForm.appendChild(feedback);
        setTimeout(() => feedback.remove(), 3000);
    });

    function validateForm(formData) {
        const email = formData.get('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return formData.get('name').length > 0 && 
               emailRegex.test(email) && 
               formData.get('message').length > 0;
    }
    const inputs = contactForm.querySelectorAll('input, textarea');

    const validateInput = (input) => {
        const formGroup = input.parentElement;
        const errorMessage = formGroup.querySelector('.error-message');
        let isValid = input.checkValidity();

        if (!isValid) {
            formGroup.classList.add('error');
            formGroup.classList.remove('success');
            if (input.validity.valueMissing) {
                errorMessage.textContent = 'This field is required';
            } else if (input.validity.typeMismatch && input.type === 'email') {
                errorMessage.textContent = 'Please enter a valid email address';
            } else if (input.validity.tooShort) {
                errorMessage.textContent = `Minimum ${input.minLength} characters required`;
            }
        } else {
            formGroup.classList.remove('error');
            formGroup.classList.add('success');
            errorMessage.textContent = '';
        }
        return isValid;
    };

    inputs.forEach(input => {
        input.addEventListener('blur', () => validateInput(input));
        input.addEventListener('input', () => validateInput(input));
    });

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let isFormValid = true;

        inputs.forEach(input => {
            if (!validateInput(input)) {
                isFormValid = false;
            }
        });

        if (isFormValid) {
            const submitButton = contactForm.querySelector('.submit-button');
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            setTimeout(() => {
                submitButton.textContent = 'Message Sent!';
                submitButton.classList.add('success');
                contactForm.reset();
                inputs.forEach(input => {
                    input.parentElement.classList.remove('success');
                });
                
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Send Message';
                    submitButton.classList.remove('success');
                }, 3000);
            }, 1500);
        }
    });
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '50px'
    };
    
    const fadeUpObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                fadeUpObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeUpObserver.observe(element);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card').forEach(card => {
        observer.observe(card);
    });
    const header = document.querySelector('.header');
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        } else {
            header.style.backgroundColor = 'var(--background-color)';
        }
    });

    mobileMenu.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    const ctaButton = document.querySelector('.cta-button');
    ctaButton.addEventListener('click', () => {
        const featuresSection = document.querySelector('#features');
        featuresSection.scrollIntoView({ behavior: 'smooth' });
    });

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            const target = document.querySelector(targetId);
            const headerHeight = document.querySelector('.header').offsetHeight;
            
            if (target) {
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                if (navLinks.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    navLinks.classList.remove('active');
                }
            }
        });
    });
});