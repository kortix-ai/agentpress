// Portfolio functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize portfolio filtering
    const filterButtons = document.querySelectorAll('.portfolio-filter button');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    // Set animation delay for staggered appearance
    portfolioItems.forEach((item, index) => {
        item.style.setProperty('--item-index', index);
    });
    
    // Add click event to filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get filter value
            const filterValue = button.getAttribute('data-filter');
            
            // Filter portfolio items
            let visibleIndex = 0;
            portfolioItems.forEach(item => {
                // Reset animation by removing and re-adding the class
                item.classList.remove('show');
                
                if (filterValue === 'all' || item.classList.contains(filterValue)) {
                    setTimeout(() => {
                        item.style.display = 'block';
                        item.style.setProperty('--item-index', visibleIndex++);
                        // Add a small delay before adding the show class for better animation
                        requestAnimationFrame(() => {
                            item.classList.add('show');
                        });
                    }, 10);
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // Initialize lightbox for portfolio items
    const portfolioLinks = document.querySelectorAll('.portfolio-item a');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDesc = document.getElementById('lightbox-description');
    
    // Preload images for smoother lightbox experience
    portfolioLinks.forEach(link => {
        const img = new Image();
        img.src = link.getAttribute('href');
    });
    
    // Open lightbox when clicking on portfolio item
    portfolioLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const imgSrc = link.getAttribute('href');
            const title = link.getAttribute('data-title');
            const description = link.getAttribute('data-description');
            
            // Set lightbox content
            lightboxImg.src = imgSrc;
            lightboxTitle.textContent = title;
            lightboxDesc.textContent = description;
            
            // Show lightbox with a slight delay for better animation
            setTimeout(() => {
                lightbox.classList.add('show');
                document.body.style.overflow = 'hidden';
            }, 50);
        });
    });
    
    // Close lightbox
    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('show');
        document.body.style.overflow = 'auto';
    });
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Close lightbox with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('show')) {
            lightbox.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });
    
    // Add keyboard navigation for lightbox
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('show')) return;
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            // Find current item
            const currentSrc = lightboxImg.src;
            const items = Array.from(portfolioLinks);
            const currentIndex = items.findIndex(link => link.getAttribute('href') === currentSrc);
            
            let nextIndex;
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % items.length;
            } else {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
            }
            
            const nextLink = items[nextIndex];
            lightboxImg.src = nextLink.getAttribute('href');
            lightboxTitle.textContent = nextLink.getAttribute('data-title');
            lightboxDesc.textContent = nextLink.getAttribute('data-description');
        }
    });
});