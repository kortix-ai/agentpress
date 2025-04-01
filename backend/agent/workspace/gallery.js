document.addEventListener('DOMContentLoaded', function() {
    const galleryContainer = document.getElementById('galleryContainer');
    const galleryImages = document.getElementById('galleryImages');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    const imageUpload = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadImageBtn');
    
    // Sample images for demo
    const demoImages = [
        'https://source.unsplash.com/random/300x200?nature,1',
        'https://source.unsplash.com/random/300x200?city,1',
        'https://source.unsplash.com/random/300x200?technology,1',
        'https://source.unsplash.com/random/300x200?animals,1'
    ];
    
    // Load images from localStorage or use demo images
    let images = JSON.parse(localStorage.getItem('galleryImages')) || demoImages;
    let currentIndex = 0;
    
    // Initialize gallery
    renderGallery();
    
    // Event listeners
    prevBtn.addEventListener('click', showPreviousImage);
    nextBtn.addEventListener('click', showNextImage);
    uploadBtn.addEventListener('click', handleImageUpload);
    
    function renderGallery() {
        if (images.length === 0) {
            galleryImages.innerHTML = '<p class="gallery-empty">No images in gallery. Add some!</p>';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }
        
        showImage(currentIndex);
        updateButtons();
    }
    
    function showImage(index) {
        galleryImages.innerHTML = '';
        const img = document.createElement('img');
        img.src = images[index];
        img.alt = `Gallery image ${index + 1}`;
        img.className = 'gallery-img';
        
        const counter = document.createElement('div');
        counter.className = 'gallery-counter';
        counter.textContent = `${index + 1} / ${images.length}`;
        
        galleryImages.appendChild(img);
        galleryImages.appendChild(counter);
    }
    
    function showPreviousImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        showImage(currentIndex);
        updateButtons();
    }
    
    function showNextImage() {
        currentIndex = (currentIndex + 1) % images.length;
        showImage(currentIndex);
        updateButtons();
    }
    
    function updateButtons() {
        prevBtn.disabled = images.length <= 1;
        nextBtn.disabled = images.length <= 1;
    }
    
    function handleImageUpload() {
        const imageUrl = imageUpload.value.trim();
        if (imageUrl) {
            // Simple validation - check if it looks like a URL
            if (imageUrl.startsWith('http') && (imageUrl.endsWith('.jpg') || 
                imageUrl.endsWith('.jpeg') || imageUrl.endsWith('.png') || 
                imageUrl.endsWith('.gif') || imageUrl.includes('unsplash'))) {
                
                addImage(imageUrl);
                imageUpload.value = '';
            } else {
                alert('Please enter a valid image URL (ending with .jpg, .jpeg, .png, or .gif)');
            }
        }
    }
    
    function addImage(url) {
        images.push(url);
        saveImages();
        currentIndex = images.length - 1; // Show the newly added image
        renderGallery();
    }
    
    function saveImages() {
        localStorage.setItem('galleryImages', JSON.stringify(images));
    }
});