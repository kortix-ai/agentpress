// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get the button element
    const button = document.getElementById('clickMe');
    
    // Add click event listener
    button.addEventListener('click', () => {
        alert('Hello! The button was clicked!');
    });
});