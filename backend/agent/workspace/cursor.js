class CustomCursor {
    constructor() {
        // Create main cursor
        this.cursor = document.createElement('div');
        this.cursor.className = 'cursor';
        document.body.appendChild(this.cursor);

        // Initialize trail elements
        this.trails = [];
        this.trailCount = 5;
        this.createTrails();

        // Mouse position
        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;

        // Smoothing factor (1 = no smoothing, higher = more smoothing)
        this.smoothing = 8;

        // Interactive elements
        this.hoverElements = 'a, button, .btn, [data-cursor="pointer"]';
        this.textElements = 'input, textarea, [contenteditable="true"]';

        this.init();
    }

    createTrails() {
        for (let i = 0; i < this.trailCount; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.opacity = 1 - (i / this.trailCount);
            document.body.appendChild(trail);
            this.trails.push({
                element: trail,
                x: 0,
                y: 0,
                delay: i * 2
            });
        }
    }

    init() {
        // Mouse move event
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Click animation
        document.addEventListener('mousedown', () => {
            this.cursor.classList.add('click');
        });

        document.addEventListener('mouseup', () => {
            this.cursor.classList.remove('click');
        });

        // Hover effects
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(this.hoverElements)) {
                this.cursor.classList.add('hover');
            }
            if (e.target.matches(this.textElements)) {
                this.cursor.classList.add('text');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.matches(this.hoverElements)) {
                this.cursor.classList.remove('hover');
            }
            if (e.target.matches(this.textElements)) {
                this.cursor.classList.remove('text');
            }
        });

        // Start animation loop
        this.animate();
    }

    animate() {
        // Smooth cursor movement
        this.cursorX += (this.mouseX - this.cursorX) / this.smoothing;
        this.cursorY += (this.mouseY - this.cursorY) / this.smoothing;

        // Update main cursor position
        this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;

        // Update trail positions with delay
        this.trails.forEach((trail, index) => {
            trail.x += (this.mouseX - trail.x) / (this.smoothing + trail.delay);
            trail.y += (this.mouseY - trail.y) / (this.smoothing + trail.delay);
            trail.element.style.transform = `translate(${trail.x}px, ${trail.y}px)`;
        });

        // Continue animation loop
        requestAnimationFrame(() => this.animate());
    }

    // Method to add custom hover effect for specific elements
    addCustomHover(selector, className) {
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(selector)) {
                this.cursor.classList.add(className);
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.matches(selector)) {
                this.cursor.classList.remove(className);
            }
        });
    }
}

// Initialize cursor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const cursor = new CustomCursor();

    // Example of adding custom hover effect
    cursor.addCustomHover('.special-element', 'special-hover');
});