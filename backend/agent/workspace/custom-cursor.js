class CustomCursor {
    constructor() {
        // Create cursor elements
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        document.body.appendChild(this.cursor);

        // Create trail elements
        this.trails = [];
        this.trailCount = 3;
        this.createTrails();

        // Initialize variables
        this.cursorX = 0;
        this.cursorY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.isClicking = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.animate = this.animate.bind(this);
        
        // Initialize
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
        // Add event listeners
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mouseup', this.handleMouseUp);

        // Add hover effects for interactive elements
        const interactiveElements = document.querySelectorAll('a, button, input, textarea, [role="button"]');
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => this.cursor.classList.add('hover'));
            element.addEventListener('mouseleave', () => this.cursor.classList.remove('hover'));
        });

        // Add text cursor effect for text elements
        const textElements = document.querySelectorAll('input[type="text"], textarea');
        textElements.forEach(element => {
            element.addEventListener('mouseenter', () => this.cursor.classList.add('text'));
            element.addEventListener('mouseleave', () => this.cursor.classList.remove('text'));
        });

        // Start animation loop
        this.animate();
    }

    handleMouseMove(e) {
        this.targetX = e.clientX;
        this.targetY = e.clientY;
    }

    handleMouseDown() {
        this.isClicking = true;
        this.cursor.classList.add('click');
    }

    handleMouseUp() {
        this.isClicking = false;
        this.cursor.classList.remove('click');
    }

    updateTrails() {
        this.trails.forEach((trail, index) => {
            const delay = trail.delay;
            trail.x += (this.cursorX - trail.x) / (10 + delay);
            trail.y += (this.cursorY - trail.y) / (10 + delay);
            trail.element.style.transform = `translate(${trail.x}px, ${trail.y}px)`;
        });
    }

    animate() {
        // Smooth cursor movement
        const ease = 0.2;
        this.cursorX += (this.targetX - this.cursorX) * ease;
        this.cursorY += (this.targetY - this.cursorY) * ease;

        // Update cursor position
        this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;

        // Update trails
        this.updateTrails();

        // Continue animation loop
        requestAnimationFrame(this.animate);
    }
}

// Initialize cursor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CustomCursor();
});