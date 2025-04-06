// Add touch swipe functionality for mobile devices
document.addEventListener('DOMContentLoaded', () => {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-description');
    const portfolioLinks = document.querySelectorAll('.portfolio-item a');
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Set up touch event listeners for the lightbox
    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    // Handle the swipe gesture
    function handleSwipe() {
        // Minimum distance required for a swipe
        const minSwipeDistance = 50;
        const swipeDistance = touchEndX - touchStartX;
        
        if (Math.abs(swipeDistance) < minSwipeDistance) return;
        
        // Find current item
        const currentSrc = lightboxImg.src;
        const items = Array.from(portfolioLinks);
        const currentIndex = items.findIndex(link => link.getAttribute('href') === currentSrc);
        
        let nextIndex;
        if (swipeDistance > 0) {
            // Swipe right - go to previous
            nextIndex = (currentIndex - 1 + items.length) % items.length;
        } else {
            // Swipe left - go to next
            nextIndex = (currentIndex + 1) % items.length;
        }
        
        const nextLink = items[nextIndex];
        
        // Add a transition effect
        lightboxImg.style.opacity = '0';
        setTimeout(() => {
            lightboxImg.src = nextLink.getAttribute('href');
            lightboxTitle.textContent = nextLink.getAttribute('data-title');
            lightboxDesc.textContent = nextLink.getAttribute('data-description');
            
            // Fade back in
            setTimeout(() => {
                lightboxImg.style.opacity = '1';
            }, 50);
        }, 200);
    }
});