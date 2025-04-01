// Simple confetti effect for celebrations
class Confetti {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.colors = ['#276EF1', '#000000', '#FFC043', '#FF5C39'];
    this.running = false;
    
    // Set up canvas
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    
    window.addEventListener('resize', () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });
  }
  
  createParticles(count = 100) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * -this.canvas.height,
        size: Math.random() * 8 + 3,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speed: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
        oscillationSpeed: Math.random() * 0.5 + 0.5,
        oscillationDistance: Math.random() * 5
      });
    }
  }
  
  start() {
    if (this.running) return;
    
    document.body.appendChild(this.canvas);
    this.createParticles();
    this.running = true;
    this.animate();
    
    // Auto-stop after 4 seconds
    setTimeout(() => this.stop(), 4000);
  }
  
  stop() {
    this.running = false;
    if (document.body.contains(this.canvas)) {
      document.body.removeChild(this.canvas);
    }
  }
  
  animate() {
    if (!this.running) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      p.y += p.speed;
      p.x += Math.sin(p.y * p.oscillationSpeed) * p.oscillationDistance;
      p.rotation += p.rotationSpeed;
      
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation * Math.PI / 180);
      
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      
      this.ctx.restore();
      
      // Reset particle if it's off screen
      if (p.y > this.canvas.height) {
        this.particles[i] = {
          x: Math.random() * this.canvas.width,
          y: Math.random() * -this.canvas.height,
          size: Math.random() * 8 + 3,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          speed: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
          oscillationSpeed: Math.random() * 0.5 + 0.5,
          oscillationDistance: Math.random() * 5
        };
      }
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Export to window
window.Confetti = Confetti;