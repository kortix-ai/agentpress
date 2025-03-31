// Set animation delay for each letter
document.querySelectorAll('.letter').forEach((letter, index) => {
    letter.style.setProperty('--i', index);
});

// Create floating icons randomly
const floatingIcons = document.querySelector('.floating-icons');
const icons = floatingIcons.querySelectorAll('i');

icons.forEach(icon => {
    // Random position
    const startPositionX = Math.random() * 100;
    const startDelay = Math.random() * 10;
    const duration = 10 + Math.random() * 20;
    const scale = 0.5 + Math.random() * 1.5;
    
    icon.style.left = `${startPositionX}%`;
    icon.style.animationDuration = `${duration}s`;
    icon.style.animationDelay = `${startDelay}s`;
    icon.style.fontSize = `${scale}rem`;
});

// Add click event to the button
const button = document.querySelector('.glow-button');
button.addEventListener('click', () => {
    // Create explosion effect
    for (let i = 0; i < 30; i++) {
        createParticle();
    }
});

function createParticle() {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    // Random styles
    const size = Math.random() * 15 + 5;
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    const angle = Math.random() * Math.PI * 2;
    const velocity = 1 + Math.random() * 3;
    const posX = Math.cos(angle) * velocity;
    const posY = Math.sin(angle) * velocity;
    
    // Apply styles
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.borderRadius = '50%';
    particle.style.position = 'absolute';
    particle.style.top = '50%';
    particle.style.left = '50%';
    particle.style.transform = 'translate(-50%, -50%)';
    particle.style.pointerEvents = 'none';
    
    document.querySelector('.container').appendChild(particle);
    
    // Animate the particle
    let positionX = 0;
    let positionY = 0;
    let opacity = 1;
    let scale = 1;
    
    const animate = () => {
        if (opacity <= 0) {
            particle.remove();
            return;
        }
        
        positionX += posX;
        positionY += posY;
        opacity -= 0.02;
        scale += 0.02;
        
        particle.style.transform = `translate(calc(-50% + ${positionX}px), calc(-50% + ${positionY}px)) scale(${scale})`;
        particle.style.opacity = opacity;
        
        requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
}

// Add some interactivity to the page
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    document.body.style.background = `linear-gradient(
        135deg, 
        hsl(240, 20%, 15%), 
        hsl(${220 + mouseX * 40}, 30%, 20%), 
        hsl(${200 + mouseY * 60}, 40%, 25%)
    )`;
});