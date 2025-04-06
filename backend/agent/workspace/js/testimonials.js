// Testimonials carousel functionality
document.addEventListener('DOMContentLoaded', () => {
    const testimonialsContainer = document.querySelector('.testimonials-container');
    const testimonials = document.querySelectorAll('.testimonial');
    const prevBtn = document.querySelector('.testimonial-prev');
    const nextBtn = document.querySelector('.testimonial-next');
    const dots = document.querySelector('.testimonial-dots');
    
    let currentIndex = 0;
    const autoplayDelay = 5000; // 5 seconds between slides
    let autoplayInterval;
    
    // Create dots for each testimonial
    testimonials.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('testimonial-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetAutoplay();
        });
        dots.appendChild(dot);
    });
    
    // Initialize dots
    const allDots = document.querySelectorAll('.testimonial-dot');
    
    // Show the first testimonial
    updateTestimonials();
    
    // Set up autoplay
    startAutoplay();
    
    // Add event listeners for hover to pause autoplay
    testimonialsContainer.addEventListener('mouseenter', () => {
        clearInterval(autoplayInterval);
    });
    
    testimonialsContainer.addEventListener('mouseleave', () => {
        startAutoplay();
    });
    
    // Add event listeners for buttons
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
        updateTestimonials();
        resetAutoplay();
    });
    
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % testimonials.length;
        updateTestimonials();
        resetAutoplay();
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (isElementInViewport(testimonialsContainer)) {
            if (e.key === 'ArrowLeft') {
                currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
                updateTestimonials();
                resetAutoplay();
            } else if (e.key === 'ArrowRight') {
                currentIndex = (currentIndex + 1) % testimonials.length;
                updateTestimonials();
                resetAutoplay();
            }
        }
    });
    
    // Helper functions
    function updateTestimonials() {
        testimonials.forEach((testimonial, index) => {
            if (index === currentIndex) {
                testimonial.classList.add('active');
                allDots[index].classList.add('active');
            } else {
                testimonial.classList.remove('active');
                allDots[index].classList.remove('active');
            }
        });
    }
    
    function goToSlide(index) {
        currentIndex = index;
        updateTestimonials();
    }
    
    function startAutoplay() {
        autoplayInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonials.length;
            updateTestimonials();
        }, autoplayDelay);
    }
    
    function resetAutoplay() {
        clearInterval(autoplayInterval);
        startAutoplay();
    }
    
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
});