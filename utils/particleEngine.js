// particleEngine.js - High-performance canvas particle system

class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx !== undefined ? options.vx : (Math.random() * 2 - 1);
    this.vy = options.vy !== undefined ? options.vy : (Math.random() * 2 - 1);
    this.radius = options.radius !== undefined ? options.radius : Math.random() * 3 + 1;
    this.color = options.color || '#fff';
    this.alpha = 1;
    this.decay = options.decay !== undefined ? options.decay : Math.random() * 0.02 + 0.01;
    this.gravity = options.gravity || 0;
    this.friction = options.friction || 0.98;
    this.shape = options.shape || 'circle'; // 'circle', 'plus', 'star', 'bubble'
    this.glow = options.glow || false;
    this.life = 1.0; // 1 to 0
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    
    this.life -= this.decay;
    this.alpha = Math.max(0, this.life);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    if (this.glow) {
      ctx.shadowBlur = this.radius * 2.5;
      ctx.shadowColor = this.color;
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'bubble') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.stroke();
      // small shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'plus') {
      ctx.beginPath();
      ctx.lineWidth = this.radius * 0.4;
      ctx.moveTo(this.x - this.radius, this.y);
      ctx.lineTo(this.x + this.radius, this.y);
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x, this.y + this.radius);
      ctx.stroke();
    } else if (this.shape === 'star') {
      ctx.beginPath();
      const spikes = 4;
      const outerRadius = this.radius * 1.5;
      const innerRadius = this.radius * 0.5;
      let rot = Math.PI / 2 * 3;
      let x = this.x;
      let y = this.y;
      const step = Math.PI / spikes;

      ctx.moveTo(this.x, this.y - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = this.x + Math.cos(rot) * outerRadius;
        y = this.y + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = this.x + Math.cos(rot) * innerRadius;
        y = this.y + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(this.x, this.y - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.ambientParticles = [];
    this.hazards = [];
  }

  reset() {
    this.particles = [];
    this.ambientParticles = [];
    this.hazards = [];
  }

  add(particle) {
    this.particles.push(particle);
  }

  addAmbient(particle) {
    this.ambientParticles.push(particle);
  }

  addHazard(particle) {
    this.hazards.push(particle);
  }

  spawnShockwave(x, y, color = '#00d2ff') {
    // Blast ring
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = Math.random() * 6 + 4;
      this.add(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: color,
        decay: Math.random() * 0.03 + 0.02,
        friction: 0.95,
        glow: true
      }));
    }

    // Sparkles flying out
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 2;
      this.add(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1,
        color: '#ffffff',
        decay: Math.random() * 0.04 + 0.02,
        friction: 0.92,
        shape: 'star',
        glow: true
      }));
    }
  }

  spawnSparkles(x, y, color = '#bd00ff', count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.add(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5,
        color: color,
        decay: Math.random() * 0.04 + 0.03,
        shape: 'star',
        glow: true
      }));
    }
  }

  spawnHealing(x, y, color = '#00ff66') {
    // Spawn floaters rising upwards
    for (let i = 0; i < 4; i++) {
      this.add(new Particle(x + (Math.random() * 40 - 20), y + (Math.random() * 20 - 10), {
        vx: Math.random() * 1 - 0.5,
        vy: -(Math.random() * 2 + 1),
        radius: Math.random() * 5 + 3,
        color: color,
        decay: Math.random() * 0.02 + 0.015,
        shape: Math.random() > 0.4 ? 'plus' : 'circle',
        glow: true
      }));
    }
  }

  spawnCreatureTrail(x, y, color, sizeMultiplier = 1) {
    // Only spawn occasionally to avoid overloading the DOM
    if (Math.random() > 0.4) {
      this.add(new Particle(x, y, {
        vx: (Math.random() * 0.8 - 0.4),
        vy: (Math.random() * 0.8 - 0.4),
        radius: (Math.random() * 3 + 1) * sizeMultiplier,
        color: color,
        decay: Math.random() * 0.04 + 0.03,
        glow: true
      }));
    }
  }

  spawnPortalRing(x, y, radius, color = '#bd00ff') {
    // Generate circular portal particles
    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      // move tangential
      const tangentX = -Math.sin(angle);
      const tangentY = Math.cos(angle);
      const speed = Math.random() * 1.5 + 0.5;

      this.add(new Particle(px, py, {
        vx: tangentX * speed + (Math.random() * 0.4 - 0.2),
        vy: tangentY * speed + (Math.random() * 0.4 - 0.2),
        radius: Math.random() * 3 + 2,
        color: color,
        decay: Math.random() * 0.03 + 0.015,
        shape: 'star',
        glow: true
      }));
    }
  }

  spawnStormHazards(width, count = 1) {
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * width;
      this.addHazard(new Particle(rx, -10, {
        vx: Math.random() * 1.5 - 0.75,
        vy: Math.random() * 2 + 2.5,
        radius: Math.random() * 4 + 2,
        color: '#ff3366',
        decay: 0.005, // very slow decay, will exit screen
        glow: true,
        shape: 'circle'
      }));
    }
  }

  update(width, height) {
    // Update active custom/burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update ambient particles
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i];
      p.update();
      // if ambient particle fades, wrap it back with full opacity and reset positions
      if (p.alpha <= 0) {
        p.x = Math.random() * width;
        p.y = Math.random() * height;
        p.alpha = 1;
        p.life = 1.0;
        p.vx = Math.random() * 0.6 - 0.3;
        p.vy = Math.random() * 0.6 - 0.3;
      }
    }

    // Update hazard particles
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const p = this.hazards[i];
      p.update();
      // Keep moving hazards down, delete if they hit floor
      if (p.y > height + 20 || p.alpha <= 0) {
        this.hazards.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 1. Draw ambient particles first
    for (const p of this.ambientParticles) {
      p.draw(ctx);
    }

    // 2. Draw hazard particles
    for (const p of this.hazards) {
      p.draw(ctx);
    }

    // 3. Draw burst particles
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }

  initAmbient(width, height, colorTheme, bubbleTheme = false) {
    this.ambientParticles = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      this.addAmbient(new Particle(rx, ry, {
        vx: Math.random() * 0.6 - 0.3,
        vy: Math.random() * 0.6 - 0.3,
        radius: Math.random() * 2.5 + 0.8,
        color: colorTheme[Math.floor(Math.random() * colorTheme.length)],
        decay: Math.random() * 0.005 + 0.001,
        shape: bubbleTheme ? 'bubble' : 'circle',
        glow: Math.random() > 0.4
      }));
    }
  }
}

export const particleEngine = new ParticleEngine();
export default particleEngine;
