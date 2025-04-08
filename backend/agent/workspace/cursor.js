document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.cursor');
    
    // Update cursor position
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Add hover effect on clickable elements
    document.querySelectorAll('a, button, .btn, .logo, nav ul li').forEach(element => {
        element.addEventListener('mouseenter', () => {
            cursor.classList.add('grow');
        });
        
        element.addEventListener('mouseleave', () => {
            cursor.classList.remove('grow');
        });
    });
});