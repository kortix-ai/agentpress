class CustomCursor {
    constructor(options = {}) {
        this.options = {
            trailCount: 3,
            trailDelay: 100,
            hoverTargets: 'a, button, .btn, [data-cursor-hover]',
            ...options
        };

        this.init();
    }

    init() {
        // Create main cursor
        this.cursor = document.createElement('div');
        this.cursor.className = 'custom-cursor';
        document.body.appendChild(this.cursor);

        // Create cursor trails
        this.trails = [];
        for (let i = 0; i < this.options.trailCount; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            document.body.appendChild(trail);
            this.trails.push({
                element: trail,
                x: 0,
                y: 0
            });
        }

        // Initialize mouse position
        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;

        // Bind event listeners
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // Update trail positions with delay
            setTimeout(() => {
                this.updateTrails(e.clientX, e.clientY);
            }, this.options.trailDelay);
        });

        // Mouse events for animation
        document.addEventListener('mousedown', () => this.cursor.classList.add('click'));
        document.addEventListener('mouseup', () => this.cursor.classList.remove('click'));

        // Hover effects
        document.querySelectorAll(this.options.hoverTargets).forEach(element => {
            element.addEventListener('mouseenter', () => this.cursor.classList.add('hover'));
            element.addEventListener('mouseleave', () => this.cursor.classList.remove('hover'));
        });

        // Handle cursor visibility
        document.addEventListener('mouseleave', () => {
            this.cursor.style.opacity = '0';
            this.trails.forEach(trail => trail.element.style.opacity = '0');
        });

        document.addEventListener('mouseenter', () => {
            this.cursor.style.opacity = '1';
            this.trails.forEach(trail => trail.element.style.opacity = '1');
        });
    }

    updateTrails(x, y) {
        this.trails.forEach((trail, index) => {
            // Calculate trail position with delay
            const delay = (this.trails.length - index) * this.options.trailDelay;
            setTimeout(() => {
                trail.x = x;
                trail.y = y;
                trail.element.style.transform = `translate(${x}px, ${y}px)`;
                trail.element.style.opacity = 1 - (index / this.trails.length);
            }, delay);
        });
    }

    render() {
        // Smooth cursor movement
        this.cursorX += (this.mouseX - this.cursorX) * 0.1;
        this.cursorY += (this.mouseY - this.cursorY) * 0.1;
        
        this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;

        // Animation loop
        requestAnimationFrame(() => this.render());
    }

    // Helper methods
    setHoverTargets(selectors) {
        this.options.hoverTargets = selectors;
        // Rebind hover events
        this.bindEvents();
    }

    updateTrailCount(count) {
        // Remove existing trails
        this.trails.forEach(trail => trail.element.remove());
        this.trails = [];
        
        // Create new trails
        this.options.trailCount = count;
        for (let i = 0; i < count; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            document.body.appendChild(trail);
            this.trails.push({
                element: trail,
                x: 0,
                y: 0
            });
        }
    }
}

// Initialize cursor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const cursor = new CustomCursor({
        trailCount: 3,
        trailDelay: 80,
        hoverTargets: 'a, button, .btn, input, textarea, [data-cursor-hover]'
    });
});