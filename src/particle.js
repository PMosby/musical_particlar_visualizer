class Particle {
    constructor(x, y, baseRadius = 4) {
        this.x = x;
        this.y = y;
        this.baseRadius = baseRadius;
        this.radius = baseRadius;
        this.color = this.generateColor();
        this.angle = Math.random() * Math.PI * 2;
        this.velocity = 0.5 + Math.random() * 0.8;
        this.lastUpdate = Date.now();
        this.distanceFromCenter = Math.sqrt((x - window.innerWidth/2)**2 + (y - window.innerHeight/2)**2);
        this.originalHue = Math.random() * 360;
        this.hue = this.originalHue;
        this.energy = 0;
    }

    generateColor() {
        this.hue = this.originalHue;
        return `hsl(${this.hue}, 100%, 50%)`;
    }

    update(audioData = 1, bassIntensity = 1, trebleIntensity = 1) {
        const now = Date.now();
        const delta = (now - this.lastUpdate) / 16;
        this.lastUpdate = now;

        const targetRadius = this.baseRadius * (1 + (audioData / 20)) * (1 + (bassIntensity / 30));
        this.radius += (targetRadius - this.radius) * 0.2;

        const bassImpact = Math.max(0, bassIntensity - 100) / 100;
        this.energy = Math.max(this.energy, bassImpact);
        this.energy *= 0.95;

        const centerPull = 0.03 * (bassIntensity / 100) * (1 + this.energy);
        const rotationSpeed = 0.002 * trebleIntensity * (1 + this.energy);
        
        const dx = window.innerWidth/2 - this.x;
        const dy = window.innerHeight/2 - this.y;
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy);
        
        const velocityMultiplier = 1 + (this.energy * 2);
        this.x += (dx * centerPull + Math.cos(this.angle) * this.velocity * velocityMultiplier) * delta;
        this.y += (dy * centerPull + Math.sin(this.angle) * this.velocity * velocityMultiplier) * delta;
        
        this.angle += (rotationSpeed + this.energy * 0.1) * delta;
        
        this.distanceFromCenter = Math.sqrt((this.x - window.innerWidth/2)**2 + (this.y - window.innerHeight/2)**2);

        const intensityEffect = audioData * (1 + this.energy);
        this.hue = this.originalHue + (intensityEffect * 2);
        const saturation = 100;
        const lightness = 50 + (this.energy * 25);
        this.color = `hsl(${this.hue}, ${saturation}%, ${lightness}%)`;

        if (this.x < 0 || this.x > window.innerWidth) {
            this.velocity *= -0.8;
            this.x = this.x < 0 ? 0 : window.innerWidth;
        }
        if (this.y < 0 || this.y > window.innerHeight) {
            this.velocity *= -0.8;
            this.y = this.y < 0 ? 0 : window.innerHeight;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        if (this.energy > 0.1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 + this.energy), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${parseInt(this.hue % 255)}, 150, 255, ${this.energy * 0.3})`;
            ctx.fill();
        }
    }
} 