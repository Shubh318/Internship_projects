// environmentManager.js - Manages backgrounds, world transitions, and colors

import { particleEngine } from './particleEngine.js';

export const WORLDS = [
  {
    id: 0,
    name: 'Luminara Forest',
    colors: {
      bgGrad1: '#040d06',
      bgGrad2: '#010402',
      primary: '#00ff66',
      secondary: '#00ffcc',
      particles: ['#00ff66', '#a3ffc2', '#00ffcc', '#3bff50']
    },
    bubbleParticles: false,
    sky: false,
    water: false,
    lava: false
  },
  {
    id: 1,
    name: 'Aqua Cave',
    colors: {
      bgGrad1: '#020d1c',
      bgGrad2: '#00040a',
      primary: '#00d2ff',
      secondary: '#0066ff',
      particles: ['#00d2ff', '#70e5ff', '#0066ff', '#ffffff']
    },
    bubbleParticles: true,
    sky: false,
    water: true,
    lava: false
  },
  {
    id: 2,
    name: 'Crystal Valley',
    colors: {
      bgGrad1: '#120224',
      bgGrad2: '#04000b',
      primary: '#bd00ff',
      secondary: '#ff00bb',
      particles: ['#bd00ff', '#f1b5ff', '#ff00bb', '#e970ff']
    },
    bubbleParticles: false,
    sky: false,
    water: false,
    lava: false
  },
  {
    id: 3,
    name: 'Sky Island',
    colors: {
      bgGrad1: '#0b1e36',
      bgGrad2: '#1a436e',
      primary: '#00e1ff',
      secondary: '#ffffff',
      particles: ['#ffffff', '#dbf8ff', '#00e1ff', '#eafbff']
    },
    bubbleParticles: false,
    sky: true,
    water: false,
    lava: false
  },
  {
    id: 4,
    name: 'Lava Zone',
    colors: {
      bgGrad1: '#1e0500',
      bgGrad2: '#070100',
      primary: '#ff5e00',
      secondary: '#ff2200',
      particles: ['#ff5e00', '#ff9454', '#ff2200', '#ffaa00']
    },
    bubbleParticles: false,
    sky: false,
    water: false,
    lava: true
  }
];

class EnvironmentManager {
  constructor() {
    this.currentWorldIndex = 0;
    this.transitionProgress = 1.0; // 0 to 1, 1 = fully transitioned
    this.previousWorldIndex = 0;
    this.transitionDirection = 1; // 1 = swipe right, -1 = swipe left
    
    // Ambient assets variables
    this.clouds = [];
    this.crystals = [];
    this.vines = [];
    this.bubbles = [];
    
    this.initialized = false;
  }

  getCurrentWorld() {
    return WORLDS[this.currentWorldIndex];
  }

  getPreviousWorld() {
    return WORLDS[this.previousWorldIndex];
  }

  init(width, height) {
    this.currentWorldIndex = 0;
    this.previousWorldIndex = 0;
    this.transitionProgress = 1.0;
    this.initialized = true;

    // Generate static procedural environment assets
    this.generateClouds(width);
    this.generateCrystals(width, height);
    
    // Spawn initial ambient particles
    this.resetAmbientParticles(width, height);
  }

  resetAmbientParticles(width, height) {
    const world = this.getCurrentWorld();
    particleEngine.initAmbient(width, height, world.colors.particles, world.bubbleParticles);
  }

  nextWorld(width, height) {
    if (this.transitionProgress < 1.0) return; // transition in progress
    this.previousWorldIndex = this.currentWorldIndex;
    this.currentWorldIndex = (this.currentWorldIndex + 1) % WORLDS.length;
    this.transitionProgress = 0.0;
    this.transitionDirection = 1;
    this.resetAmbientParticles(width, height);
  }

  prevWorld(width, height) {
    if (this.transitionProgress < 1.0) return; // transition in progress
    this.previousWorldIndex = this.currentWorldIndex;
    this.currentWorldIndex = (this.currentWorldIndex - 1 + WORLDS.length) % WORLDS.length;
    this.transitionProgress = 0.0;
    this.transitionDirection = -1;
    this.resetAmbientParticles(width, height);
  }

  setWorld(index, width, height) {
    if (index === this.currentWorldIndex) return;
    this.previousWorldIndex = this.currentWorldIndex;
    this.currentWorldIndex = index;
    this.transitionProgress = 0.0;
    this.transitionDirection = index > this.previousWorldIndex ? 1 : -1;
    this.resetAmbientParticles(width, height);
  }

  generateClouds(width) {
    this.clouds = [];
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: Math.random() * width,
        y: Math.random() * 150 + 50,
        speed: Math.random() * 0.15 + 0.05,
        scale: Math.random() * 0.6 + 0.4,
        opacity: Math.random() * 0.2 + 0.1
      });
    }
  }

  generateCrystals(width, height) {
    this.crystals = [];
    for (let i = 0; i < 8; i++) {
      this.crystals.push({
        x: Math.random() * width,
        y: height - (Math.random() * 80 + 30),
        size: Math.random() * 30 + 15,
        rotation: Math.random() * 0.4 - 0.2,
        hue: Math.random() * 40 - 20 // variance
      });
    }
  }

  update(width, height) {
    if (!this.initialized) return;

    // Transition progress
    if (this.transitionProgress < 1.0) {
      this.transitionProgress += 0.025; // Transition speed
      if (this.transitionProgress >= 1.0) {
        this.transitionProgress = 1.0;
      }
    }

    // Update clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > width + 200 * cloud.scale) {
        cloud.x = -200 * cloud.scale;
        cloud.y = Math.random() * 150 + 50;
      }
    }
  }

  draw(ctx, width, height) {
    if (this.transitionProgress >= 1.0) {
      // Draw single background
      this.drawWorldBackground(ctx, this.getCurrentWorld(), width, height);
    } else {
      // Draw transition swipe split
      ctx.save();
      
      const swipeSplit = this.transitionProgress * width;

      // Draw previous world on left/right depending on direction
      ctx.save();
      if (this.transitionDirection === 1) {
        // Swipe right (previous slides left out)
        ctx.beginPath();
        ctx.rect(0, 0, width - swipeSplit, height);
        ctx.clip();
        this.drawWorldBackground(ctx, this.getPreviousWorld(), width, height);
      } else {
        // Swipe left (previous slides right out)
        ctx.beginPath();
        ctx.rect(swipeSplit, 0, width - swipeSplit, height);
        ctx.clip();
        this.drawWorldBackground(ctx, this.getPreviousWorld(), width, height);
      }
      ctx.restore();

      // Draw current world sliding in
      ctx.save();
      if (this.transitionDirection === 1) {
        ctx.beginPath();
        ctx.rect(width - swipeSplit, 0, swipeSplit, height);
        ctx.clip();
        this.drawWorldBackground(ctx, this.getCurrentWorld(), width, height);
      } else {
        ctx.beginPath();
        ctx.rect(0, 0, swipeSplit, height);
        ctx.clip();
        this.drawWorldBackground(ctx, this.getCurrentWorld(), width, height);
      }
      ctx.restore();

      // Draw glowing separation line
      ctx.beginPath();
      const lineX = this.transitionDirection === 1 ? width - swipeSplit : swipeSplit;
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, height);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00d2ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }
  }

  drawWorldBackground(ctx, world, width, height) {
    // 1. Base Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, world.colors.bgGrad1);
    gradient.addColorStop(1, world.colors.bgGrad2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Parallax background grids and atmospheric effects
    if (world.sky) {
      // Sky islands: clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (const cloud of this.clouds) {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 40 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 35 * cloud.scale, cloud.y - 10 * cloud.scale, 50 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(cloud.x + 70 * cloud.scale, cloud.y, 35 * cloud.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        ctx.fill();
      }

      // Flying island silhouettes
      ctx.fillStyle = 'rgba(12, 33, 56, 0.5)';
      ctx.beginPath();
      ctx.moveTo(width * 0.2, height * 0.6);
      ctx.quadraticCurveTo(width * 0.25, height * 0.58, width * 0.3, height * 0.6);
      ctx.lineTo(width * 0.28, height * 0.68);
      ctx.lineTo(width * 0.22, height * 0.66);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width * 0.7, height * 0.45);
      ctx.quadraticCurveTo(width * 0.77, height * 0.42, width * 0.82, height * 0.45);
      ctx.lineTo(width * 0.79, height * 0.55);
      ctx.lineTo(width * 0.73, height * 0.52);
      ctx.closePath();
      ctx.fill();
    }

    if (world.water) {
      // Deep rays of light
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const numRays = 4;
      for (let i = 0; i < numRays; i++) {
        const rx = (width / numRays) * i + (Math.sin(Date.now() * 0.0005 + i) * 80);
        const rayGrad = ctx.createLinearGradient(rx, 0, rx + 100, height);
        rayGrad.addColorStop(0, 'rgba(0, 210, 255, 0.15)');
        rayGrad.addColorStop(1, 'rgba(0, 210, 255, 0.0)');
        ctx.fillStyle = rayGrad;
        
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 80, 0);
        ctx.lineTo(rx + 250, height);
        ctx.lineTo(rx - 50, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Cave floor structures
      ctx.fillStyle = '#010814';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.quadraticCurveTo(width * 0.2, height - 60, width * 0.4, height - 30);
      ctx.quadraticCurveTo(width * 0.7, height - 80, width, height);
      ctx.lineTo(0, height);
      ctx.fill();
    }

    if (world.lava) {
      // Lava streams at the bottom
      ctx.save();
      const wave = Math.sin(Date.now() * 0.002) * 10;
      
      const lavaGrad = ctx.createLinearGradient(0, height - 50, 0, height);
      lavaGrad.addColorStop(0, '#ff3c00');
      lavaGrad.addColorStop(0.5, '#ff8800');
      lavaGrad.addColorStop(1, '#570400');
      ctx.fillStyle = lavaGrad;
      
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff3c00';
      
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, height - 40 + wave * 0.3);
      ctx.bezierCurveTo(width * 0.25, height - 60 + wave, width * 0.75, height - 30 - wave, width, height - 45 + wave * 0.2);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      // Volcano mountains silhouettes
      ctx.fillStyle = '#100300';
      ctx.beginPath();
      ctx.moveTo(width * 0.1, height - 30);
      ctx.lineTo(width * 0.25, height - 250);
      ctx.lineTo(width * 0.4, height - 30);
      ctx.moveTo(width * 0.5, height - 30);
      ctx.lineTo(width * 0.75, height - 350);
      ctx.lineTo(width * 0.9, height - 30);
      ctx.fill();
    }

    if (!world.sky && !world.water && !world.lava) {
      // Default: Luminara Forest silhouettes of glowing mushrooms / vines / trees
      ctx.fillStyle = '#010502';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.quadraticCurveTo(width * 0.25, height - 40, width * 0.5, height - 15);
      ctx.quadraticCurveTo(width * 0.75, height - 50, width, height);
      ctx.lineTo(0, height);
      ctx.fill();

      // Draw subtle trees in background
      ctx.fillStyle = 'rgba(4, 20, 10, 0.4)';
      ctx.fillRect(width * 0.1, height - 180, 20, 180);
      ctx.beginPath();
      ctx.arc(width * 0.1 + 10, height - 180, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(width * 0.8, height - 240, 30, 240);
      ctx.beginPath();
      ctx.arc(width * 0.8 + 15, height - 240, 70, 0, Math.PI * 2);
      ctx.fill();
    }

    if (world.name === 'Crystal Valley') {
      // Draw shiny crystals on the floor
      for (const crystal of this.crystals) {
        ctx.save();
        ctx.translate(crystal.x, crystal.y);
        ctx.rotate(crystal.rotation);
        
        const crystalGrad = ctx.createLinearGradient(0, 0, 0, -crystal.size);
        crystalGrad.addColorStop(0, '#600099');
        crystalGrad.addColorStop(0.5, world.colors.primary);
        crystalGrad.addColorStop(1, '#ffc7fd');
        
        ctx.fillStyle = crystalGrad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = world.colors.primary;
        
        // diamond polygon path
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-crystal.size * 0.4, -crystal.size * 0.3);
        ctx.lineTo(0, -crystal.size);
        ctx.lineTo(crystal.size * 0.4, -crystal.size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      }
    }
  }
}

export const environmentManager = new EnvironmentManager();
export default environmentManager;
