class CursorClone {
    constructor() {
        // Create main cursor
        this.cursor = document.createElement('div');
        this.cursor.className = 'cursor-main';
        document.body.appendChild(this.cursor);

        // Create cursor clone
        this.cursorClone = document.createElement('div');
        this.cursorClone.className = 'cursor-clone';
        document.body.appendChild(this.cursorClone);

        // Create trails
        this.trails = [];
        this.trailCount = 5;
        this.createTrails();

        // Initialize positions
        this.mouseX = 0;
        this.mouseY = 0;
        this.cursorX = 0;
        this.cursorY = 0;
        this.cloneX = 0;
        this.cloneY = 0;

        // Settings
        this.smoothing = 8;
        this.cloneDelay = 100;
        this.cloneDistance = 20;
        
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
        // Mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Click effects
        document.addEventListener('mousedown', () => {
            this.cursor.classList.add('click');
            this.cursorClone.classList.add('click');
        });

        document.addEventListener('mouseup', () => {
            this.cursor.classList.remove('click');
            this.cursorClone.classList.remove('click');
        });

        // Hover effects
        const interactiveElements = 'a, button, input, textarea, [data-cursor="interactive"]';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches(interactiveElements)) {
                this.cursor.classList.add('hover');
                this.cursorClone.classList.add('hover');
            }
        });

        document.addEventListener('mouseout', (e) => {
            if (e.target.matches(interactiveElements)) {
                this.cursor.classList.remove('hover');
                this.cursorClone.classList.remove('hover');
            }
        });

        // Start animation
        this.animate();
    }

    animate() {
        // Smooth cursor movement
        this.cursorX += (this.mouseX - this.cursorX) / this.smoothing;
        this.cursorY += (this.mouseY - this.cursorY) / this.smoothing;

        // Clone follows with delay
        const angle = Math.atan2(this.mouseY - this.cursorY, this.mouseX - this.cursorX);
        const targetCloneX = this.cursorX + Math.cos(angle) * this.cloneDistance;
        const targetCloneY = this.cursorY + Math.sin(angle) * this.cloneDistance;

        this.cloneX += (targetCloneX - this.cloneX) / (this.smoothing * 1.5);
        this.cloneY += (targetCloneY - this.cloneY) / (this.smoothing * 1.5);

        // Update positions
        this.cursor.style.transform = `translate(${this.cursorX}px, ${this.cursorY}px)`;
        this.cursorClone.style.transform = `translate(${this.cloneX}px, ${this.cloneY}px)`;

        // Update trails
        this.trails.forEach((trail, index) => {
            const trailX = this.cursorX + (this.cloneX - this.cursorX) * (index / this.trailCount);
            const trailY = this.cursorY + (this.cloneY - this.cursorY) * (index / this.trailCount);
            
            trail.x += (trailX - trail.x) / (this.smoothing + trail.delay);
            trail.y += (trailY - trail.y) / (this.smoothing + trail.delay);
            
            trail.element.style.transform = `translate(${trail.x}px, ${trail.y}px)`;
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CursorClone();
});