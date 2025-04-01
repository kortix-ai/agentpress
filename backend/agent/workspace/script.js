// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check if user has a preferred theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Demo functionality
    const demoInput = document.getElementById('demoInput');
    const demoButton = document.getElementById('demoButton');
    const message = document.getElementById('message');
    
    demoButton.addEventListener('click', function() {
        if (demoInput.value.trim() !== '') {
            message.style.display = 'block';
            message.textContent = demoInput.value;
            message.style.backgroundColor = body.classList.contains('dark-mode') ? '#34495e' : '#f5f5f5';
            message.style.color = body.classList.contains('dark-mode') ? '#f4f4f4' : '#333';
            demoInput.value = '';
        } else {
            alert('Please enter some text first!');
        }
    });
    
    // Allow pressing Enter to submit
    demoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            demoButton.click();
        }
    });
    
    // Add animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});