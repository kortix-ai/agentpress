class CursorClone {
    constructor(options = {}) {
        this.options = {
            mainSize: 20,
            cloneSize: 40,
            trailCount: 5,
            smoothing: 8,
            cloneDelay: 100,
            cloneDistance: 20,
            mainColor: '#ff6b6b',
            cloneColor: '#4ecdc4',
            ...options
        };

        // Create cursor elements
        this.mainCursor = this.createCursorElement('cursor-main');
        this.cloneCursor = this.createCursorElement('cursor-clone');
        this.createTrails();

        // Initialize positions
        this.mouseX = 0;
        this.mouseY = 0;
        this.mainX = 0;
        this.mainY = 0;
        this.cloneX = 0;
        this.cloneY = 0;

        this.init();
    }

    createCursorElement(className) {
        const element = document.createElement('div');
        element.className = className;
        document.body.appendChild(element);
        return element;
    }

    createTrails() {
        this.trails = [];
        for (let i = 0; i < this.options.trailCount; i++) {
            const trail = this.createCursorElement('cursor-trail');
            trail.style.opacity = 1 - (i / this.options.trailCount);
            this.trails.push({
                element: trail,
                x: 0,
                y: 0,
                delay: i * 2
            });
        }
    }

    init() {
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Click effects
        document.addEventListener('mousedown', () => {
            this.mainCursor.classList.add('click');
            this.cloneCursor.classList.add('click');
        });

        document.addEventListener('mouseup', () => {
            this.mainCursor.classList.remove('click');
            this.cloneCursor.classList.remove('click');
        });

        // Hover effects for interactive elements
        const interactiveElements = 'a, button, input, textarea, [data-cursor="interactive"]';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(interactiveElements)) {
                this.mainCursor.classList.add('hover');
                this.cloneCursor.classList.add('hover');
            }
            if (e.target.matches('input, textarea')) {
                this.mainCursor.classList.add('text');
                this.cloneCursor.classList.add('text');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.matches(interactiveElements)) {
                this.mainCursor.classList.remove('hover');
                this.cloneCursor.classList.remove('hover');
            }
            if (e.target.matches('input, textarea')) {
                this.mainCursor.classList.remove('text');
                this.cloneCursor.classList.remove('text');
            }
        });

        // Handle cursor visibility
        document.addEventListener('mouseleave', () => this.setCursorVisibility(false));
        document.addEventListener('mouseenter', () => this.setCursorVisibility(true));

        // Start animation
        this.animate();
    }

    setCursorVisibility(visible) {
        const opacity = visible ? '1' : '0';
        this.mainCursor.style.opacity = opacity;
        this.cloneCursor.style.opacity = opacity;
        this.trails.forEach(trail => trail.element.style.opacity = visible ? 
            1 - (this.trails.indexOf(trail) / this.options.trailCount) : '0');
    }

    animate() {
        // Smooth cursor movement
        this.mainX += (this.mouseX - this.mainX) / this.options.smoothing;
        this.mainY += (this.mouseY - this.mainY) / this.options.smoothing;

        // Clone follows with delay and distance
        const angle = Math.atan2(this.mouseY - this.mainY, this.mouseX - this.mainX);
        const targetCloneX = this.mainX + Math.cos(angle) * this.options.cloneDistance;
        const targetCloneY = this.mainY + Math.sin(angle) * this.options.cloneDistance;

        this.cloneX += (targetCloneX - this.cloneX) / (this.options.smoothing * 1.5);
        this.cloneY += (targetCloneY - this.cloneY) / (this.options.smoothing * 1.5);

        // Update positions
        this.mainCursor.style.transform = `translate(${this.mainX}px, ${this.mainY}px)`;
        this.cloneCursor.style.transform = `translate(${this.cloneX}px, ${this.cloneY}px)`;

        // Update trails
        this.updateTrails();

        requestAnimationFrame(() => this.animate());
    }

    updateTrails() {
        this.trails.forEach((trail, index) => {
            const progress = index / this.options.trailCount;
            const trailX = this.mainX + (this.cloneX - this.mainX) * progress;
            const trailY = this.mainY + (this.cloneY - this.mainY) * progress;
            
            trail.x += (trailX - trail.x) / (this.options.smoothing + trail.delay);
            trail.y += (trailY - trail.y) / (this.options.smoothing + trail.delay);
            
            trail.element.style.transform = `translate(${trail.x}px, ${trail.y}px)`;
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CursorClone();
});