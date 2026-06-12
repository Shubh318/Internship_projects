// creatureEngine.js - Creature classes, physics, and canvas drawing

import { particleEngine } from './particleEngine.js';
import { soundEngine } from './soundEngine.js';

class Creature {
  constructor(name, x, y, options = {}) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.radius = options.radius || 25;
    this.colorTheme = options.colorTheme || '#00d2ff';
    this.secondaryColor = options.secondaryColor || '#ffffff';
    
    // Core game stats
    this.mood = 'Curious'; // Happy, Curious, Scared, Sleepy, Angry, Excited, Hungry
    this.energy = 80;
    this.happiness = 70;
    this.maxSpeed = options.maxSpeed || 4;
    this.maxForce = options.maxForce || 0.15;
    this.sick = false; // Stage 4: can be sick
    
    // Blinking eye variables
    this.isBlinking = false;
    this.blinkTimer = 0;
    
    // Orbit angles for gather
    this.orbitRadius = Math.random() * 60 + 50;
    this.orbitSpeed = (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1);
    this.orbitAngle = Math.random() * Math.PI * 2;
    
    // Wander variables
    this.wanderAngle = Math.random() * Math.PI * 2;
    
    // Hover amplitude/frequency for floating
    this.hoverAmp = Math.random() * 4 + 3;
    this.hoverFreq = Math.random() * 0.003 + 0.002;
    this.hoverSeed = Math.random() * 1000;
    
    // Selected state
    this.selected = false;
    this.sleeping = false;
    
    // Mood bubble timer
    this.moodText = '';
    this.moodTimer = 0;

    // Segments history (for trailing bodies)
    this.history = [];
    this.historyLength = options.historyLength || 10;
  }

  showMoodText(text, duration = 120) {
    this.moodText = text;
    this.moodTimer = duration;
  }

  update(pointer, palm, gesture, bounds) {
    // Save coordinate history
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > this.historyLength) {
      this.history.shift();
    }

    // Handle blinks
    if (!this.isBlinking && Math.random() < 0.008) {
      this.isBlinking = true;
      this.blinkTimer = 10;
    }
    if (this.isBlinking) {
      this.blinkTimer--;
      if (this.blinkTimer <= 0) this.isBlinking = false;
    }

    // Update mood bubble
    if (this.moodTimer > 0) this.moodTimer--;

    // Stats decay
    if (Math.random() < 0.0005) {
      this.energy = Math.max(10, this.energy - 1);
    }
    if (Math.random() < 0.001 && this.mood === 'Sad') {
      this.happiness = Math.max(10, this.happiness - 1);
    }

    // Set sleeping state if Hand Down or low energy
    if (this.energy < 20 && !this.sleeping) {
      this.sleeping = true;
      this.mood = 'Sleepy';
      this.showMoodText('💤');
    }

    // Reaction states based on physical gesture
    this.sleeping = (gesture === "Hand Down") || this.sleeping;
    if (gesture === "Hand Up" && this.sleeping) {
      this.sleeping = false;
      this.mood = 'Excited';
      this.energy = Math.min(100, this.energy + 20);
      this.showMoodText('☀️');
    }

    // Apply forces based on gesture & state
    if (this.sleeping) {
      this.applySleepPhysics(bounds);
    } else if (this.selected && gesture === "Pinch") {
      this.dragTo(pointer.x, pointer.y);
    } else {
      switch (gesture) {
        case "Closed Fist":
          this.mood = 'Scared';
          this.flee(pointer.x, pointer.y);
          break;
          
        case "Open Palm":
          this.mood = 'Happy';
          this.gather(palm.x, palm.y);
          break;
          
        case "One Finger":
          this.mood = 'Curious';
          this.seek(pointer.x, pointer.y);
          break;
          
        case "Thumb Up":
          if (this.selected || Math.random() < 0.05) {
            this.heal();
          }
          this.wander();
          break;
          
        case "Thumb Down":
          if (this.selected || Math.random() < 0.05) {
            this.mood = 'Angry';
            this.happiness = Math.max(10, this.happiness - 3);
            this.showMoodText('💢', 30);
          }
          this.wander();
          break;
          
        default:
          this.wander();
          break;
      }
    }

    // Physics integration
    this.vx += this.ax;
    this.vy += this.ay;
    
    // Cap velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }
    
    this.x += this.vx;
    this.y += this.vy;
    
    // Reset acceleration
    this.ax = 0;
    this.ay = 0;

    // Apply friction/drag
    this.vx *= 0.96;
    this.vy *= 0.96;

    // Boundary constraints
    this.constrainToBounds(bounds);

    // Spawn movement trails
    particleEngine.spawnCreatureTrail(this.x, this.y, this.colorTheme, this.selected ? 1.5 : 1.0);
  }

  applyForce(fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }

  seek(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    
    if (d > 5) {
      // Map speed
      const targetSpeed = Math.min(this.maxSpeed, d * 0.1);
      const desiredVx = (dx / d) * targetSpeed;
      const desiredVy = (dy / d) * targetSpeed;
      
      const forceX = desiredVx - this.vx;
      const forceY = desiredVy - this.vy;
      
      // Limit force
      const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
      if (forceMag > this.maxForce) {
        this.applyForce((forceX / forceMag) * this.maxForce, (forceY / forceMag) * this.maxForce);
      } else {
        this.applyForce(forceX, forceY);
      }
    }
  }

  flee(targetX, targetY) {
    const dx = this.x - targetX;
    const dy = this.y - targetY;
    const d = Math.sqrt(dx * dx + dy * dy);
    
    if (d < 300) {
      const forceSpeed = this.maxSpeed * 1.5; // scatter fast
      const desiredVx = (dx / d) * forceSpeed;
      const desiredVy = (dy / d) * forceSpeed;
      
      const forceX = desiredVx - this.vx;
      const forceY = desiredVy - this.vy;
      
      this.applyForce(forceX * 0.3, forceY * 0.3);
    }
  }

  gather(palmX, palmY) {
    // Orbit around palm
    this.orbitAngle += this.orbitSpeed;
    const targetX = palmX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const targetY = palmY + Math.sin(this.orbitAngle) * this.orbitRadius;
    
    this.seek(targetX, targetY);
  }

  dragTo(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    if (Math.random() < 0.05) {
      particleEngine.spawnSparkles(this.x, this.y, this.colorTheme, 2);
    }
  }

  wander() {
    this.wanderAngle += (Math.random() * 0.4 - 0.2);
    const wanderDistance = 80;
    const wanderRadius = 30;
    
    // Circle offset
    const circleX = this.vx === 0 ? this.x : this.x + (this.vx / Math.sqrt(this.vx*this.vx + this.vy*this.vy)) * wanderDistance;
    const circleY = this.vy === 0 ? this.y : this.y + (this.vy / Math.sqrt(this.vx*this.vx + this.vy*this.vy)) * wanderDistance;
    
    const targetX = circleX + Math.cos(this.wanderAngle) * wanderRadius;
    const targetY = circleY + Math.sin(this.wanderAngle) * wanderRadius;
    
    this.seek(targetX, targetY);
  }

  applySleepPhysics(bounds) {
    this.mood = 'Sleepy';
    // Float slowly downwards to rest on boundary bottom
    const targetX = this.x;
    const targetY = bounds.height - this.radius - 10;
    
    const dy = targetY - this.y;
    if (dy > 5) {
      this.seek(targetX, targetY);
    } else {
      // Gentle rocking in sleep
      this.vx *= 0.5;
      this.vy = Math.sin(Date.now() * 0.001) * 0.2;
    }
  }

  heal() {
    if (this.happiness < 100 || this.sick) {
      this.happiness = Math.min(100, this.happiness + 0.8);
      this.energy = Math.min(100, this.energy + 0.6);
      this.sick = false;
      this.mood = 'Happy';
      if (Math.random() < 0.08) {
        soundEngine.playFeed();
        particleEngine.spawnHealing(this.x, this.y, '#00ff66');
      }
    }
  }

  constrainToBounds(bounds) {
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -0.5;
    } else if (this.x > bounds.width - this.radius) {
      this.x = bounds.width - this.radius;
      this.vx *= -0.5;
    }

    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -0.5;
    } else if (this.y > bounds.height - this.radius - 5) {
      this.y = bounds.height - this.radius - 5;
      this.vy *= -0.5;
    }
  }

  draw(ctx) {
    // Child classes implement custom designs
  }

  drawCommonEffects(ctx) {
    // Glow effect if selected
    if (this.selected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = this.colorTheme;
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.colorTheme;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.restore();
    }

    // Draw mood emoji bubble
    if (this.moodTimer > 0 || this.sick) {
      const bubbleEmoji = this.sick ? '🤢' : this.moodText;
      if (bubbleEmoji) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        ctx.strokeStyle = this.sick ? '#00ff66' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        const bx = this.x;
        const by = this.y - this.radius - 20;
        
        ctx.beginPath();
        ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // arrow point down
        ctx.beginPath();
        ctx.moveTo(bx - 4, by + 12);
        ctx.lineTo(bx + 4, by + 12);
        ctx.lineTo(bx, by + 18);
        ctx.closePath();
        ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubbleEmoji, bx, by);
        
        ctx.restore();
      }
    }
  }
}

// 1. FIREFLY DRAGON CREATURE
export class FireflyDragon extends Creature {
  constructor(x, y) {
    super('Firefly Dragon', x, y, {
      radius: 20,
      colorTheme: '#ff5e00',
      secondaryColor: '#ffea00',
      historyLength: 12,
      maxSpeed: 4.8,
      maxForce: 0.18
    });
  }

  draw(ctx) {
    ctx.save();
    
    // Draw body segments
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.colorTheme;
    
    for (let i = 0; i < this.history.length; i++) {
      const seg = this.history[i];
      const sizeRatio = (i / this.history.length);
      const radius = this.radius * 0.75 * sizeRatio;
      
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = i === this.history.length - 1 ? this.colorTheme : `rgba(255, 94, 0, ${sizeRatio * 0.8})`;
      ctx.fill();
    }

    // Wings
    const wingFlap = Math.sin(Date.now() * 0.012) * 18;
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 3;
    
    // Left Wing
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.bezierCurveTo(this.x - 40, this.y - 30 + wingFlap, this.x - 20, this.y - 50 + wingFlap, this.x - 45, this.y - 10 + wingFlap);
    ctx.stroke();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.bezierCurveTo(this.x + 40, this.y - 30 + wingFlap, this.x + 20, this.y - 50 + wingFlap, this.x + 45, this.y - 10 + wingFlap);
    ctx.stroke();

    // Head details
    ctx.beginPath();
    ctx.arc(this.x, this.y - 4, this.radius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = this.secondaryColor;
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#050512';
    const eyeSize = 3;
    const eyeOffset = 6;
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.arc(this.x - eyeOffset, this.y - 6, eyeSize, 0, Math.PI * 2);
      ctx.arc(this.x + eyeOffset, this.y - 6, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#050512';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x - eyeOffset - 2, this.y - 6);
      ctx.lineTo(this.x - eyeOffset + 2, this.y - 6);
      ctx.moveTo(this.x + eyeOffset - 2, this.y - 6);
      ctx.lineTo(this.x + eyeOffset + 2, this.y - 6);
      ctx.stroke();
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 2. WATER BLOB CREATURE
export class WaterBlob extends Creature {
  constructor(x, y) {
    super('Water Blob', x, y, {
      radius: 26,
      colorTheme: '#00c3ff',
      secondaryColor: '#e0f7ff',
      maxSpeed: 3.5,
      maxForce: 0.1
    });
  }

  draw(ctx) {
    ctx.save();
    
    // Squish calculation based on velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const squishX = 1 + (speed * 0.05) - (Math.sin(Date.now() * 0.01) * 0.04);
    const squishY = 1 - (speed * 0.05) + (Math.sin(Date.now() * 0.01) * 0.04);

    ctx.translate(this.x, this.y);
    ctx.scale(squishX, squishY);

    // Glowing Jelly Body
    const blobGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius);
    blobGrad.addColorStop(0, '#74e5ff');
    blobGrad.addColorStop(0.7, '#00a6ff');
    blobGrad.addColorStop(1, 'rgba(0, 166, 255, 0.4)');

    ctx.fillStyle = blobGrad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00a6ff';
    
    ctx.beginPath();
    // Squishy oval shape
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    const ex = 7;
    const ey = -3;
    const es = this.isBlinking ? 1 : 6;
    
    ctx.beginPath();
    ctx.arc(-ex, ey, 5, 0, Math.PI * 2);
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#050512';
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.arc(-ex, ey, 2.5, 0, Math.PI * 2);
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 3. LEAF SPIRIT CREATURE
export class LeafSpirit extends Creature {
  constructor(x, y) {
    super('Leaf Spirit', x, y, {
      radius: 22,
      colorTheme: '#00ff66',
      secondaryColor: '#ccffdd',
      maxSpeed: 3.8,
      maxForce: 0.13
    });
    this.angle = 0;
  }

  draw(ctx) {
    ctx.save();
    
    // Rotate slightly in flight direction
    this.angle = Math.atan2(this.vy, this.vx) + Math.PI/2;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.sin(Date.now() * 0.005) * 0.15);

    // Draw Leaf Body
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.colorTheme;
    ctx.fillStyle = this.colorTheme;
    
    ctx.beginPath();
    // Draw leaf shape outline
    ctx.moveTo(0, -this.radius * 1.3);
    ctx.quadraticCurveTo(-this.radius * 0.9, 0, 0, this.radius * 1.1);
    ctx.quadraticCurveTo(this.radius * 0.9, 0, 0, -this.radius * 1.3);
    ctx.fill();

    // Leaf Veins
    ctx.strokeStyle = 'rgba(5, 5, 18, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 1.3);
    ctx.lineTo(0, this.radius * 0.9);
    ctx.stroke();

    // Branch veins
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.4, -this.radius * 0.8);
    ctx.moveTo(0, -this.radius * 0.5);
    ctx.lineTo(this.radius * 0.4, -this.radius * 0.8);
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.radius * 0.5, -this.radius * 0.2);
    ctx.moveTo(0, 0);
    ctx.lineTo(this.radius * 0.5, -this.radius * 0.2);
    ctx.stroke();

    // Glowing Cute Eyes
    ctx.fillStyle = this.secondaryColor;
    const ex = 5;
    const ey = -this.radius * 0.4;
    
    ctx.beginPath();
    if (!this.isBlinking) {
      ctx.arc(-ex, ey, 3.5, 0, Math.PI * 2);
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    } else {
      ctx.arc(-ex, ey, 3.5, 0, Math.PI);
      ctx.arc(ex, ey, 3.5, 0, Math.PI);
    }
    ctx.fill();

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 4. TINY ROCK GOLEM CREATURE
export class TinyRockGolem extends Creature {
  constructor(x, y) {
    super('Tiny Rock Golem', x, y, {
      radius: 25,
      colorTheme: '#787a8a',
      secondaryColor: '#00ffcc', // glow cracks
      maxSpeed: 2.2, // slow
      maxForce: 0.1
    });
    this.hopOffset = 0;
    this.hopSpeed = 0.08;
    this.hopAngle = 0;
  }

  update(pointer, palm, gesture, bounds) {
    // Golem bounds strictly to the bottom ground in Free Play, hops upwards when guided
    super.update(pointer, palm, gesture, bounds);
    
    // Hop animation
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 0.5) {
      this.hopAngle += this.hopSpeed * (speed * 0.5);
      this.hopOffset = Math.abs(Math.sin(this.hopAngle)) * 15;
      
      // Spawn dust cracks on stomp
      if (this.hopOffset < 1 && Math.random() < 0.2) {
        soundEngine.playSpawn();
        particleEngine.spawnSparkles(this.x, this.y + this.radius, '#555', 4);
      }
    } else {
      this.hopOffset *= 0.8;
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Draw Golem body at hop offset height
    ctx.translate(this.x, this.y - this.hopOffset);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#000000';

    // Stone plate outlines (polygon shapes)
    ctx.fillStyle = this.colorTheme;
    ctx.beginPath();
    // Hexagonal head
    ctx.moveTo(-15, -15);
    ctx.lineTo(15, -15);
    ctx.lineTo(22, 10);
    ctx.lineTo(12, 22);
    ctx.lineTo(-12, 22);
    ctx.lineTo(-22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3e404a';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Glowing fissures / cracks
    ctx.strokeStyle = this.secondaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(0, 15);
    ctx.lineTo(10, 5);
    ctx.stroke();

    // Glowing elemental eyes
    ctx.fillStyle = this.secondaryColor;
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.fillRect(-12, -6, 6, 4);
      ctx.fillRect(6, -6, 6, 4);
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 5. ELECTRIC BUTTERFLY CREATURE
export class ElectricButterfly extends Creature {
  constructor(x, y) {
    super('Electric Butterfly', x, y, {
      radius: 18,
      colorTheme: '#bd00ff',
      secondaryColor: '#00ffff',
      maxSpeed: 5.5, // fast erratic jitter
      maxForce: 0.25
    });
  }

  update(pointer, palm, gesture, bounds) {
    // Erratic jitter flight steering
    if (Math.random() < 0.2 && !this.selected && !this.sleeping) {
      this.applyForce(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }
    super.update(pointer, palm, gesture, bounds);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Fluttering flap cycles
    const flap = Math.abs(Math.sin(Date.now() * 0.035)) * 0.8 + 0.2;

    ctx.shadowBlur = 15;
    ctx.shadowColor = this.secondaryColor;

    // Wing design
    ctx.fillStyle = this.colorTheme;
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 2.5;

    // Top Left Wing
    ctx.save();
    ctx.scale(-flap, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-25, -25, -20, -40, -5, -8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Top Right Wing
    ctx.save();
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-25, -25, -20, -40, -5, -8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Bottom Left Wing
    ctx.save();
    ctx.scale(-flap, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-20, 20, -18, 5, -3, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Bottom Right Wing
    ctx.save();
    ctx.scale(flap, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-20, 20, -18, 5, -3, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Thin butterfly body core
    ctx.fillStyle = '#050512';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Small blue eyes
    ctx.fillStyle = this.secondaryColor;
    ctx.beginPath();
    ctx.arc(-2, -12, 1.5, 0, Math.PI*2);
    ctx.arc(2, -12, 1.5, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 6. SHADOW CAT CREATURE
export class ShadowCat extends Creature {
  constructor(x, y) {
    super('Shadow Cat', x, y, {
      radius: 24,
      colorTheme: '#220b38',
      secondaryColor: '#fefe66', // yellow eyes
      maxSpeed: 4.5,
      maxForce: 0.18,
      historyLength: 15
    });
  }

  draw(ctx) {
    ctx.save();
    
    // Draw sliding shadow body trails (motion blur silhouette)
    for (let i = 0; i < this.history.length; i++) {
      const seg = this.history[i];
      const opacity = (i / this.history.length) * 0.35;
      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.fillStyle = `rgba(34, 11, 56, ${opacity})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * (i / this.history.length), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(this.x, this.y);
    
    // Main dark body
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#bd00ff';
    ctx.fillStyle = '#10031c';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Cat Ears
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.lineTo(-24, -32);
    ctx.lineTo(-6, -20);
    ctx.closePath();
    ctx.moveTo(18, -12);
    ctx.lineTo(24, -32);
    ctx.lineTo(6, -20);
    ctx.closePath();
    ctx.fill();

    // Cat tail wiggles
    const tailWiggle = Math.sin(Date.now() * 0.007) * 12;
    ctx.strokeStyle = '#10031c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-15 + tailWiggle, 28, -25 + tailWiggle, 10);
    ctx.stroke();

    // Glowing yellow slit eyes
    ctx.fillStyle = this.secondaryColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.secondaryColor;
    
    if (!this.isBlinking) {
      // Slit left eye
      ctx.beginPath();
      ctx.ellipse(-7, -4, 4, 2, Math.PI/4, 0, Math.PI * 2);
      ctx.fill();
      
      // Slit right eye
      ctx.beginPath();
      ctx.ellipse(7, -4, 4, 2, -Math.PI/4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 7. WIND BIRD CREATURE
export class WindBird extends Creature {
  constructor(x, y) {
    super('Wind Bird', x, y, {
      radius: 20,
      colorTheme: '#8ae2ff',
      secondaryColor: '#ffffff',
      maxSpeed: 4.8,
      maxForce: 0.14
    });
  }

  draw(ctx) {
    ctx.save();
    
    // Rotate in flight vector direction
    const flightAngle = Math.atan2(this.vy, this.vx);
    ctx.translate(this.x, this.y);
    ctx.rotate(flightAngle);

    // Draw bird body shape
    ctx.fillStyle = this.colorTheme;
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.colorTheme;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.2, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glowing wings bending up/down dynamically
    const wingBend = Math.sin(Date.now() * 0.01) * 12;
    ctx.fillStyle = this.secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.quadraticCurveTo(0, -25 - wingBend, 15, -35 - wingBend);
    ctx.quadraticCurveTo(8, -15, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-5, 3);
    ctx.quadraticCurveTo(0, 25 + wingBend, 15, 35 + wingBend);
    ctx.quadraticCurveTo(8, 15, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(this.radius * 1.1, -4);
    ctx.lineTo(this.radius * 1.5, 0);
    ctx.lineTo(this.radius * 1.1, 4);
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#050512';
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.arc(8, -3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 8. CRYSTAL BUG CREATURE
export class CrystalBug extends Creature {
  constructor(x, y) {
    super('Crystal Bug', x, y, {
      radius: 20,
      colorTheme: '#ff8aeb',
      secondaryColor: '#ffffff',
      maxSpeed: 3.0,
      maxForce: 0.12
    });
  }

  draw(ctx) {
    ctx.save();
    
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(Date.now() * 0.005) * 0.3);

    // Crystal buggy facets
    ctx.fillStyle = this.colorTheme;
    ctx.strokeStyle = this.secondaryColor;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.colorTheme;

    // Draw diamond shell facets
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // inner facets lines
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(0, this.radius);
    ctx.moveTo(-this.radius, 0);
    ctx.lineTo(this.radius, 0);
    ctx.stroke();

    // Small glowing bug legs
    ctx.strokeStyle = this.colorTheme;
    ctx.lineWidth = 2.5;
    const legWiggle = Math.sin(Date.now() * 0.015) * 4;
    
    ctx.beginPath();
    // left legs
    ctx.moveTo(-10, -5); ctx.lineTo(-20, -10 + legWiggle);
    ctx.moveTo(-10, 0); ctx.lineTo(-22, 0 - legWiggle);
    ctx.moveTo(-10, 5); ctx.lineTo(-20, 10 + legWiggle);
    // right legs
    ctx.moveTo(10, -5); ctx.lineTo(20, -10 - legWiggle);
    ctx.moveTo(10, 0); ctx.lineTo(22, 0 + legWiggle);
    ctx.moveTo(10, 5); ctx.lineTo(20, 10 - legWiggle);
    ctx.stroke();

    // Glowing eyes
    ctx.fillStyle = this.secondaryColor;
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.arc(-4, -10, 3, 0, Math.PI * 2);
      ctx.arc(4, -10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// ==========================================
// LEGENDARY CREATURES (STORY TARGETS)
// ==========================================

// 9. SOLAR LION (Stage 7 Target)
export class SolarLion extends Creature {
  constructor(x, y) {
    super('Solar Lion', x, y, {
      radius: 65, // Giant!
      colorTheme: '#ff5e00',
      secondaryColor: '#ffea00',
      maxSpeed: 2.5,
      maxForce: 0.08
    });
    this.angerLevel = 100; // Calmed down by open palm & feeding (Stage 7 goal)
    this.mood = 'Angry';
  }

  update(pointer, palm, gesture, bounds) {
    if (this.angerLevel > 0) {
      this.mood = this.angerLevel > 50 ? 'Angry' : 'Curious';
      if (gesture === 'Open Palm') {
        this.angerLevel = Math.max(0, this.angerLevel - 0.4);
        if (Math.random() < 0.05) {
          particleEngine.spawnHealing(this.x, this.y, '#ffea00');
        }
      }
      if (gesture === 'Thumb Up') {
        this.angerLevel = Math.max(0, this.angerLevel - 0.6);
        this.heal();
      }
    } else {
      this.mood = 'Happy';
    }
    
    super.update(pointer, palm, gesture, bounds);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing fire mane (Circles rotating and pulsating)
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = this.colorTheme;
    ctx.fillStyle = this.colorTheme;
    
    const time = Date.now() * 0.005;
    const segments = 12;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 + time * 0.2;
      const pulse = 10 + Math.sin(time + i) * 6;
      const mx = Math.cos(angle) * (this.radius * 0.9 + pulse);
      const my = Math.sin(angle) * (this.radius * 0.9 + pulse);
      
      const maneGrad = ctx.createRadialGradient(mx, my, 2, mx, my, 22);
      maneGrad.addColorStop(0, this.secondaryColor);
      maneGrad.addColorStop(0.5, this.colorTheme);
      maneGrad.addColorStop(1, 'rgba(255, 94, 0, 0)');
      
      ctx.fillStyle = maneGrad;
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Lion Face Core
    ctx.fillStyle = '#1c0700';
    ctx.strokeStyle = this.colorTheme;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Angry/Happy eyes
    ctx.strokeStyle = this.secondaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.secondaryColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    if (this.mood === 'Angry') {
      // Angry slanted eyes
      ctx.beginPath();
      ctx.moveTo(-22, -15); ctx.lineTo(-6, -6);
      ctx.moveTo(22, -15); ctx.lineTo(6, -6);
      ctx.stroke();
    } else {
      // Happy cute arc eyes
      ctx.beginPath();
      ctx.arc(-14, -8, 6, Math.PI, 0, false);
      ctx.arc(14, -8, 6, Math.PI, 0, false);
      ctx.stroke();
    }

    // Solar nose
    ctx.fillStyle = this.colorTheme;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-8, -10);
    ctx.lineTo(8, -10);
    ctx.closePath();
    ctx.fill();

    // Draw Lion anger percentage bar above head
    if (this.angerLevel > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(-40, -this.radius - 20, 80, 8);
      ctx.fillStyle = '#ff0033';
      ctx.fillRect(-40, -this.radius - 20, 80 * (this.angerLevel / 100), 8);
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 10. THUNDER ELEPHANT (Stage 8 Target)
export class ThunderElephant extends Creature {
  constructor(x, y) {
    super('Thunder Elephant', x, y, {
      radius: 70, // Giant!
      colorTheme: '#005dff',
      secondaryColor: '#00ffff', // thunder sparkles
      maxSpeed: 1.8, // extremely slow and heavy
      maxForce: 0.06
    });
    this.freedCount = 0; // Incremented by clearing debris
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw heavy body
    ctx.fillStyle = '#010c24';
    ctx.strokeStyle = this.colorTheme;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.colorTheme;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Large elephant ears
    const earFlap = Math.sin(Date.now() * 0.003) * 6;
    ctx.fillStyle = '#021a47';
    ctx.beginPath();
    // left ear
    ctx.ellipse(-this.radius * 0.6, -10, 22 + earFlap, 35, Math.PI/6, 0, Math.PI * 2);
    // right ear
    ctx.ellipse(this.radius * 0.6, -10, 22 + earFlap, 35, -Math.PI/6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Curved trunk
    const trunkWiggle = Math.sin(Date.now() * 0.005) * 8;
    ctx.strokeStyle = '#010c24';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(-15 + trunkWiggle, 40, -8 + trunkWiggle, 65);
    ctx.stroke();
    
    // Tusks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, 20); ctx.quadraticCurveTo(-25, 35, -30, 25);
    ctx.moveTo(10, 20); ctx.quadraticCurveTo(25, 35, 30, 25);
    ctx.stroke();

    // Glowing cyan lightning eyes
    ctx.fillStyle = this.secondaryColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.secondaryColor;
    
    if (!this.isBlinking) {
      ctx.beginPath();
      ctx.arc(-18, -10, 4.5, 0, Math.PI * 2);
      ctx.arc(18, -10, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}

// 11. PRIMAL DINOSAUR (Stage 9 Target)
export class PrimalDinosaur extends Creature {
  constructor(x, y) {
    super('Primal Dinosaur', x, y, {
      radius: 75, // Massive T-Rex!
      colorTheme: '#851a00',
      secondaryColor: '#ff2600',
      maxSpeed: 2.8,
      maxForce: 0.12
    });
    this.rageTimer = 0;
    this.alertStatus = 'Calm'; // Calm vs Hunting
  }

  update(pointer, palm, gesture, bounds) {
    if (gesture === 'Hand Down') {
      // User is hiding/sleeping, T-Rex loses interest
      this.alertStatus = 'Calm';
      this.vx *= 0.5;
      this.vy *= 0.5;
    } else {
      this.alertStatus = 'Hunting';
      // Pursues nearest small spirits, unless player moves index finger pointer to distract it
      if (gesture === 'One Finger') {
        this.seek(pointer.x, pointer.y);
      } else {
        // Stomping around randomly
        this.wander();
      }
    }
    
    super.update(pointer, palm, gesture, bounds);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Giant reptile shell body
    ctx.fillStyle = '#210400';
    ctx.strokeStyle = this.colorTheme;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.colorTheme;
    
    ctx.beginPath();
    ctx.moveTo(-40, 20);
    ctx.lineTo(-this.radius * 0.9, -10);
    ctx.lineTo(-30, -50);
    ctx.lineTo(20, -50);
    ctx.lineTo(this.radius * 0.8, -10);
    ctx.lineTo(30, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dino spine plates
    ctx.fillStyle = this.colorTheme;
    ctx.beginPath();
    ctx.moveTo(-25, -50); ctx.lineTo(-15, -68); ctx.lineTo(-5, -50);
    ctx.moveTo(-5, -50); ctx.lineTo(5, -68); ctx.lineTo(15, -50);
    ctx.moveTo(15, -50); ctx.lineTo(25, -65); ctx.lineTo(35, -45);
    ctx.fill();

    // Tiny arms wiggling
    const armWiggle = Math.sin(Date.now() * 0.015) * 5;
    ctx.strokeStyle = '#210400';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(25, 0); ctx.lineTo(38 + armWiggle, 8);
    ctx.stroke();

    // Glowing red predatory eyes
    ctx.fillStyle = this.secondaryColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.secondaryColor;
    
    if (this.alertStatus === 'Hunting') {
      ctx.beginPath();
      // slanted angry eyes
      ctx.moveTo(10, -18); ctx.lineTo(25, -25); ctx.lineTo(22, -15);
      ctx.closePath();
      ctx.fill();
    } else {
      // peaceful sleeping dots
      ctx.beginPath();
      ctx.arc(15, -18, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    this.drawCommonEffects(ctx);
  }
}
