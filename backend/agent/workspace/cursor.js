// Custom cursor effect
document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.custom-cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Expand cursor when hovering over interactive elements
    const interactiveElements = document.querySelectorAll('.glow-button, .letter');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.width = '40px';
            cursor.style.height = '40px';
            cursor.style.backgroundColor = 'rgba(233, 69, 96, 0.2)';
            cursor.style.mixBlendMode = 'normal';
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.style.width = '20px';
            cursor.style.height = '20px';
            cursor.style.backgroundColor = 'transparent';
            cursor.style.mixBlendMode = 'difference';
        });
    });
    
    // Hide cursor when leaving the window
    document.addEventListener('mouseout', (e) => {
        if (e.relatedTarget === null) {
            cursor.style.opacity = '0';
        }
    });
    
    document.addEventListener('mouseover', () => {
        cursor.style.opacity = '1';
    });
});