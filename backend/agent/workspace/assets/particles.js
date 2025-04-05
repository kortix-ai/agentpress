class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createParticle(x, y, color) {
        return {
            x: x,
            y: y,
            color: color,
            velocity: {
                x: (Math.random() - 0.5) * 3,
                y: (Math.random() - 0.5) * 3
            },
            size: Math.random() * 3 + 2,
            life: 1,
            decay: 0.02
        };
    }

    emit(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(x, y, color));
        }
    }

    update(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}${Math.floor(p.life * 255).toString(16).padStart(2, '0')}`;
            ctx.fill();
        }
    }
}

class Trail {
    constructor(maxPoints = 10) {
        this.points = [];
        this.maxPoints = maxPoints;
    }

    addPoint(x, y) {
        this.points.unshift({ x, y, alpha: 1 });
        if (this.points.length > this.maxPoints) {
            this.points.pop();
        }
    }

    draw(ctx) {
        ctx.save();
        for (let i = this.points.length - 1; i >= 0; i--) {
            const p = this.points[i];
            p.alpha = i / this.points.length;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 15 * p.alpha, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 255, ${p.alpha * 0.3})`;
            ctx.fill();
        }
        ctx.restore();
    }
}