// Preloader Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create preloader element
    const preloader = document.createElement('div');
    preloader.classList.add('preloader');
    preloader.innerHTML = `
        <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
        </div>
    `;
    
    // Insert preloader as the first element in body
    document.body.insertBefore(preloader, document.body.firstChild);
    
    // Hide preloader when page is loaded
    window.addEventListener('load', function() {
        setTimeout(function() {
            preloader.style.opacity = '0';
            setTimeout(function() {
                preloader.style.display = 'none';
            }, 500);
        }, 500);
    });
});