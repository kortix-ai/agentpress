document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.querySelector('.cursor');
    const clones = document.querySelectorAll('.cursor-clone');
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    // Smooth cursor following
    const smoothFactor = 0.15;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Animation loop for smooth cursor movement
    function animate() {
        // Smooth movement for main cursor
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        cursorX += dx * smoothFactor;
        cursorY += dy * smoothFactor;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';

        // Update clone positions with increasing delays
        clones.forEach((clone, index) => {
            setTimeout(() => {
                clone.style.left = cursorX + 'px';
                clone.style.top = cursorY + 'px';
            }, (index + 1) * 50);
        });

        requestAnimationFrame(animate);
    }

    animate();

    // Add rainbow trail effect
    let hue = 0;
    function updateColors() {
        clones.forEach((clone, index) => {
            const hueOffset = (hue + index * 60) % 360;
            clone.style.borderColor = `hsl(${hueOffset}, 100%, 50%)`;
        });
        hue = (hue + 1) % 360;
        requestAnimationFrame(updateColors);
    }

    updateColors();

    // Add interaction effects
    document.addEventListener('mousedown', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
        clones.forEach(clone => {
            clone.style.transform = 'translate(-50%, -50%) scale(1.2)';
        });
    });

    document.addEventListener('mouseup', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        clones.forEach(clone => {
            clone.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
});