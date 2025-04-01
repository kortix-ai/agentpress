document.addEventListener('DOMContentLoaded', function() {
    const cardContainer = document.querySelector('.card-container');
    const flipBtn = document.getElementById('flip-btn');
    const colorOptions = document.querySelectorAll('.color-option');
    
    // Set initial primary color
    document.documentElement.style.setProperty('--primary-color', '#1a237e');
    
    // Flip card functionality
    flipBtn.addEventListener('click', function() {
        cardContainer.classList.toggle('flipped');
    });
    
    // Color change functionality
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            document.documentElement.style.setProperty('--primary-color', color);
        });
    });
    
    // Double click to flip card
    cardContainer.addEventListener('dblclick', function() {
        this.classList.toggle('flipped');
    });
});