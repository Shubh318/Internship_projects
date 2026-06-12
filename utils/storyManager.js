// storyManager.js - Orchestrates the 10 story mode stages

import { soundEngine } from './soundEngine.js';
import { particleEngine } from './particleEngine.js';

export const STAGES = [
  {
    id: 1,
    title: "Awakening Forest",
    badge: "Stage 1",
    text: "The spirits of Luminara are deep in slumber. Use your magic pointer (One Finger Up) to touch and awaken 3 sleeping firefly dragons.",
    goalText: "Wake up 3 sleeping fireflies by pointing at them.",
    setup: (manager, engine) => {
      engine.clearWorld();
      // Spawn 3 sleeping creatures
      for (let i = 0; i < 3; i++) {
        const c = engine.spawnCreature('Firefly Dragon', 200 + i * 250, 400);
        c.sleeping = true;
        c.mood = 'Sleepy';
      }
    },
    update: (manager, engine, pointer, gesture) => {
      let awakeCount = 0;
      engine.creatures.forEach(c => {
        // If pointer is close, wake up
        if (c.sleeping && gesture === 'One Finger') {
          const dx = pointer.x - c.x;
          const dy = pointer.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            c.sleeping = false;
            c.mood = 'Happy';
            c.showMoodText('☀️');
            soundEngine.playSpawn();
            particleEngine.spawnSparkles(c.x, c.y, c.colorTheme, 15);
          }
        }
        if (!c.sleeping) awakeCount++;
      });

      const progress = (awakeCount / 3) * 100;
      return { progress, complete: awakeCount >= 3 };
    }
  },
  {
    id: 2,
    title: "Spirit Gathering",
    badge: "Stage 2",
    text: "Magical energies are shifting. Use your Open Palm (✋) to summon and hold 5 water blobs inside the central glowing circle.",
    goalText: "Gather 5 water blobs inside the center circle for 3 seconds.",
    circleRadius: 160,
    setup: (manager, engine) => {
      engine.clearWorld();
      for (let i = 0; i < 5; i++) {
        engine.spawnCreature('Water Blob', 100 + i * 180, 500);
      }
      manager.stageTimer = 0;
    },
    update: (manager, engine, pointer, gesture) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      
      let insideCount = 0;
      engine.creatures.forEach(c => {
        const dx = c.x - cx;
        const dy = c.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          insideCount++;
        }
      });

      // If all 5 are inside, increment timer
      if (insideCount >= 5 && gesture === 'Open Palm') {
        manager.stageTimer += 0.8;
      } else {
        manager.stageTimer = Math.max(0, manager.stageTimer - 0.4);
      }

      const progress = Math.min(100, (manager.stageTimer / 100) * 100);
      return { progress, complete: manager.stageTimer >= 100 };
    },
    draw: (ctx) => {
      // Draw central portal circle
      ctx.save();
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00d2ff';
      ctx.stroke();
      
      ctx.restore();
    }
  },
  {
    id: 3,
    title: "Storm Escape",
    badge: "Stage 3",
    text: "A dark particle storm is collapsing! Avoid falling crimson toxic embers. Swipe Left or Right to change worlds and guide creatures to safety.",
    goalText: "Survive for 20 seconds. Swipe left/right if storm gets heavy.",
    setup: (manager, engine) => {
      engine.clearWorld();
      for (let i = 0; i < 4; i++) {
        engine.spawnCreature('Leaf Spirit', 150 + i * 200, 450);
      }
      manager.stageTimer = 0;
      particleEngine.hazards = [];
    },
    update: (manager, engine, pointer, gesture) => {
      manager.stageTimer += 0.5; // Tick time
      
      // Spawn falling hazard embers
      if (Math.random() < 0.1) {
        particleEngine.spawnStormHazards(window.innerWidth, 2);
      }

      // Check collision between creatures and hazards
      engine.creatures.forEach(c => {
        for (let i = particleEngine.hazards.length - 1; i >= 0; i--) {
          const h = particleEngine.hazards[i];
          const dx = c.x - h.x;
          const dy = c.y - h.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < c.radius + h.radius) {
            c.happiness = Math.max(10, c.happiness - 10);
            c.showMoodText('💥', 30);
            soundEngine.playSad();
            particleEngine.hazards.splice(i, 1);
          }
        }
      });

      const progress = Math.min(100, (manager.stageTimer / 200) * 100);
      return { progress, complete: manager.stageTimer >= 200 };
    }
  },
  {
    id: 4,
    title: "Healing Ritual",
    badge: "Stage 4",
    text: "The storm left elemental spirits weak and sick. Hover your pointer over them and show a Thumb Up (👍) gesture to heal and feed them.",
    goalText: "Heal 3 sick creatures (glowing green with nausea emojis).",
    setup: (manager, engine) => {
      engine.clearWorld();
      const types = ['Firefly Dragon', 'Water Blob', 'Leaf Spirit'];
      types.forEach((type, i) => {
        const c = engine.spawnCreature(type, 200 + i * 250, 400);
        c.sick = true;
        c.happiness = 20;
      });
    },
    update: (manager, engine, pointer, gesture) => {
      let healedCount = 0;
      engine.creatures.forEach(c => {
        if (!c.sick) {
          healedCount++;
        }
      });

      const progress = (healedCount / 3) * 100;
      return { progress, complete: healedCount >= 3 };
    }
  },
  {
    id: 5,
    title: "Portal Opening",
    badge: "Stage 5",
    text: "To unlock the legendary beasts, you must activate the portal gate. Use the Pinch gesture (🤏) to drag the 3 loose crystals into their glowing slots.",
    goalText: "Drag 3 crystals (sparkling circles) into their respective slots.",
    setup: (manager, engine) => {
      engine.clearWorld();
      
      // Define 3 slot markers in center
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      manager.slots = [
        { x: cx - 180, y: cy + 50, locked: false, color: '#00ff66' },
        { x: cx, y: cy - 100, locked: false, color: '#00d2ff' },
        { x: cx + 180, y: cy + 50, locked: false, color: '#bd00ff' }
      ];

      // Spawn 3 crystal nodes scattered around
      manager.crystals = [
        { x: 150, y: 150, radius: 15, color: '#00ff66', grabbed: false },
        { x: window.innerWidth - 150, y: 150, radius: 15, color: '#00d2ff', grabbed: false },
        { x: 150, y: window.innerHeight - 150, radius: 15, color: '#bd00ff', grabbed: false }
      ];
    },
    update: (manager, engine, pointer, gesture) => {
      const isPinching = gesture === 'Pinch';
      
      manager.crystals.forEach((crystal, index) => {
        const slot = manager.slots[index];
        if (slot.locked) return;

        // If grabbing
        if (isPinching) {
          const dx = pointer.x - crystal.x;
          const dy = pointer.y - crystal.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40 && !crystal.grabbed && !manager.crystals.some(c => c.grabbed)) {
            crystal.grabbed = true;
            soundEngine.playSelect();
          }
        } else {
          crystal.grabbed = false;
        }

        if (crystal.grabbed) {
          crystal.x = pointer.x;
          crystal.y = pointer.y;
          particleEngine.spawnSparkles(crystal.x, crystal.y, crystal.color, 1);

          // Check snap to slot
          const sdx = crystal.x - slot.x;
          const sdy = crystal.y - slot.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sdist < 45) {
            slot.locked = true;
            crystal.grabbed = false;
            crystal.x = slot.x;
            crystal.y = slot.y;
            soundEngine.playLevelUp();
            particleEngine.spawnShockwave(slot.x, slot.y, crystal.color);
          }
        }
      });

      let lockedCount = 0;
      manager.slots.forEach(s => { if (s.locked) lockedCount++; });

      const progress = (lockedCount / 3) * 100;
      return { progress, complete: lockedCount >= 3 };
    },
    draw: (ctx, manager) => {
      // Draw slot markers
      manager.slots.forEach(slot => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, 25, 0, Math.PI * 2);
        ctx.strokeStyle = slot.locked ? slot.color : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        if (!slot.locked) ctx.setLineDash([4, 4]);
        ctx.stroke();

        if (slot.locked) {
          ctx.beginPath();
          ctx.arc(slot.x, slot.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = slot.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = slot.color;
          ctx.fill();
        }
        ctx.restore();
      });

      // Draw crystal nodes
      manager.crystals.forEach((c, index) => {
        const slot = manager.slots[index];
        if (slot.locked) return;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.fillStyle = c.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = c.color;
        
        ctx.beginPath();
        ctx.moveTo(0, -c.radius);
        ctx.lineTo(-c.radius, 0);
        ctx.lineTo(0, c.radius);
        ctx.lineTo(c.radius, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
    }
  },
  {
    id: 6,
    title: "Guardian Creature",
    badge: "Stage 6",
    text: "The portal has awakened a colossal wind spirit. Use your pointer (☝️) to guide the giant beast and collect 5 golden mana spores.",
    goalText: "Lead the giant wind bird to absorb 5 golden mana spores.",
    setup: (manager, engine) => {
      engine.clearWorld();
      // Spawn one large Wind Bird
      const c = engine.spawnCreature('Wind Bird', 400, 300);
      c.radius = 45; // larger
      c.maxSpeed = 3.5;
      
      // Spawn first mana spore
      manager.sporeCount = 0;
      manager.spawnSpore();
    },
    spawnSpore: function() {
      this.spore = {
        x: Math.random() * (window.innerWidth - 200) + 100,
        y: Math.random() * (window.innerHeight - 200) + 100,
        radius: 12
      };
    },
    update: function(manager, engine, pointer, gesture) {
      const g = engine.creatures[0];
      if (!g) return { progress: 0, complete: false };

      // check collision between giant and spore
      const dx = g.x - this.spore.x;
      const dy = g.y - this.spore.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < g.radius + this.spore.radius) {
        manager.sporeCount++;
        soundEngine.playSelect();
        particleEngine.spawnShockwave(this.spore.x, this.spore.y, '#ffd700');
        if (manager.sporeCount < 5) {
          this.spawnSpore();
        }
      }

      const progress = (manager.sporeCount / 5) * 100;
      return { progress, complete: manager.sporeCount >= 5 };
    },
    draw: function(ctx, manager) {
      if (!this.spore) return;
      // Draw golden spore
      ctx.save();
      const pulse = 2 + Math.sin(Date.now() * 0.01) * 3;
      ctx.beginPath();
      ctx.arc(this.spore.x, this.spore.y, this.spore.radius + pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffd700';
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 7,
    title: "The Sun Lion",
    badge: "Stage 7",
    text: "A prideful Sun Lion has emerged, but it is highly agitated! Keep your Open Palm (✋) held to soothe it, and use Thumb Up (👍) to feed it.",
    goalText: "Soothe the Solar Lion until its anger level drops to 0%.",
    setup: (manager, engine) => {
      engine.clearWorld();
      engine.spawnCreature('Solar Lion', window.innerWidth / 2, window.innerHeight / 2);
    },
    update: (manager, engine, pointer, gesture) => {
      const lion = engine.creatures.find(c => c.name === 'Solar Lion');
      if (!lion) return { progress: 0, complete: false };
      
      const progress = 100 - lion.angerLevel;
      return { progress, complete: lion.angerLevel <= 0 };
    }
  },
  {
    id: 8,
    title: "The Thunder Elephant",
    badge: "Stage 8",
    text: "A giant Thunder Elephant is blocked by floating meteors. Use your Closed Fist (✊) to detonate shockwaves to shatter the rocks in its path.",
    goalText: "Detonate 3 stone obstacles blocking the elephant's path.",
    setup: (manager, engine) => {
      engine.clearWorld();
      
      // Spawn slow elephant
      const el = engine.spawnCreature('Thunder Elephant', 120, window.innerHeight / 2);
      el.maxSpeed = 1.0;
      
      // Spawn 3 floating rocks
      manager.obstacles = [
        { x: window.innerWidth * 0.35, y: window.innerHeight / 2 + (Math.random() * 40 - 20), radius: 35, destroyed: false },
        { x: window.innerWidth * 0.55, y: window.innerHeight / 2 + (Math.random() * 40 - 20), radius: 35, destroyed: false },
        { x: window.innerWidth * 0.75, y: window.innerHeight / 2 + (Math.random() * 40 - 20), radius: 35, destroyed: false }
      ];
      manager.destroyedObstacles = 0;
    },
    update: (manager, engine, pointer, gesture) => {
      // If fist, check if near an obstacle
      if (gesture === 'Closed Fist') {
        manager.obstacles.forEach(obs => {
          if (obs.destroyed) return;
          const dx = pointer.x - obs.x;
          const dy = pointer.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) { // close enough for shockwave blast
            obs.destroyed = true;
            manager.destroyedObstacles++;
            soundEngine.playShockwave();
            particleEngine.spawnShockwave(obs.x, obs.y, '#777788');
          }
        });
      }

      // Elephant moves slowly towards right, seeking the path
      const el = engine.creatures.find(c => c.name === 'Thunder Elephant');
      if (el) {
        // Find next active obstacle
        const nextObs = manager.obstacles.find(o => !o.destroyed);
        if (nextObs) {
          // Seek position just before obstacle
          if (el.x < nextObs.x - 120) {
            el.seek(nextObs.x - 110, el.y);
          } else {
            el.vx *= 0.5; // stop
            el.showMoodText('🐘 blocked!', 5);
          }
        } else {
          // Path clear, walk off screen
          el.seek(window.innerWidth + 100, el.y);
        }
      }

      const progress = (manager.destroyedObstacles / 3) * 100;
      return { progress, complete: manager.destroyedObstacles >= 3 || (el && el.x > window.innerWidth) };
    },
    draw: (ctx, manager) => {
      manager.obstacles.forEach(obs => {
        if (obs.destroyed) return;
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.fillStyle = '#2c2e38';
        ctx.strokeStyle = '#555566';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000';
        
        // draw rough stone polygon
        ctx.beginPath();
        ctx.moveTo(-obs.radius, -10);
        ctx.lineTo(-15, -obs.radius);
        ctx.lineTo(20, -obs.radius + 5);
        ctx.lineTo(obs.radius, 10);
        ctx.lineTo(15, obs.radius);
        ctx.lineTo(-20, obs.radius - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
      });
    }
  },
  {
    id: 9,
    title: "The Primal Dinosaur",
    badge: "Stage 9",
    text: "A fierce T-Rex has arrived hunting elementals! Use Hand Down (↕️) to trigger a sleep spell so spirits freeze/hide, and use One Finger (☝️) to lure the Dino away.",
    goalText: "Survive the dinosaur's hunt for 20 seconds using hide/decoy.",
    setup: (manager, engine) => {
      engine.clearWorld();
      // Spawn small spirits
      engine.spawnCreature('Water Blob', 200, 500);
      engine.spawnCreature('Leaf Spirit', 300, 480);
      
      // Spawn dinosaur
      const dino = engine.spawnCreature('Primal Dinosaur', window.innerWidth - 150, 450);
      manager.stageTimer = 0;
    },
    update: (manager, engine, pointer, gesture) => {
      manager.stageTimer += 0.5;
      
      const dino = engine.creatures.find(c => c.name === 'Primal Dinosaur');
      const spirits = engine.creatures.filter(c => c.name !== 'Primal Dinosaur');

      if (dino && dino.alertStatus === 'Hunting') {
        // Find nearest awake spirit
        let target = null;
        let minDist = Infinity;
        spirits.forEach(s => {
          if (!s.sleeping) {
            const dx = s.x - dino.x;
            const dy = s.y - dino.y;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minDist) {
              minDist = d;
              target = s;
            }
          }
        });

        // If we have an awake target and the player isn't actively decoying using index pointer
        if (target && gesture !== 'One Finger') {
          dino.seek(target.x, target.y);
          
          // If overlaps, damage happiness
          const tdx = target.x - dino.x;
          const tdy = target.y - dino.y;
          const td = Math.sqrt(tdx*tdx + tdy*tdy);
          if (td < dino.radius + target.radius) {
            target.happiness = Math.max(10, target.happiness - 5);
            target.showMoodText('🦖💥', 10);
            if (Math.random() < 0.1) soundEngine.playSad();
          }
        }
      }

      const progress = Math.min(100, (manager.stageTimer / 200) * 100);
      return { progress, complete: manager.stageTimer >= 200 };
    }
  },
  {
    id: 10,
    title: "Luminara Reborn",
    badge: "Final Stage",
    text: "The elemental guardians and spirits are united. Trigger the central energy beacon by pinching on it (🤏) to open the final portal and restore Luminara!",
    goalText: "Pinch and hold the glowing central beacon for 2 seconds.",
    setup: (manager, engine) => {
      engine.clearWorld();
      // Spawn all creatures!
      engine.spawnCreature('Firefly Dragon', 150, 400);
      engine.spawnCreature('Water Blob', 300, 500);
      engine.spawnCreature('Leaf Spirit', 450, 380);
      engine.spawnCreature('Solar Lion', window.innerWidth * 0.2, 200);
      engine.spawnCreature('Thunder Elephant', window.innerWidth * 0.5, 220);
      engine.spawnCreature('Primal Dinosaur', window.innerWidth * 0.8, 350);
      
      manager.stageTimer = 0;
    },
    update: (manager, engine, pointer, gesture) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      // If pinching close to center beacon
      if (gesture === 'Pinch') {
        const dx = pointer.x - cx;
        const dy = pointer.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          manager.stageTimer += 1.0;
          particleEngine.spawnSparkles(cx, cy, '#bd00ff', 4);
        }
      } else {
        manager.stageTimer = Math.max(0, manager.stageTimer - 0.5);
      }

      const progress = Math.min(100, (manager.stageTimer / 120) * 100);
      return { progress, complete: manager.stageTimer >= 120 };
    },
    draw: (ctx, manager) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      
      ctx.save();
      const pulse = Math.sin(Date.now() * 0.005) * 10;
      
      // Draw portal beacon glow
      const beaconGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 50 + pulse);
      beaconGrad.addColorStop(0, '#ffffff');
      beaconGrad.addColorStop(0.3, '#bd00ff');
      beaconGrad.addColorStop(0.7, '#00d2ff');
      beaconGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = beaconGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 50 + pulse, 0, Math.PI * 2);
      ctx.fill();
      
      // Border ring
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();

      ctx.restore();
    }
  }
];

class StoryManager {
  constructor(engine) {
    this.engine = engine;
    this.currentStageIndex = 0;
    this.stageTimer = 0;
    this.isStoryModeActive = false;
    this.stageComplete = false;
  }

  getCurrentStage() {
    return STAGES[this.currentStageIndex];
  }

  startStoryMode() {
    this.isStoryModeActive = true;
    this.currentStageIndex = 0;
    this.loadStage();
  }

  loadStage() {
    this.stageComplete = false;
    this.stageTimer = 0;
    const stage = this.getCurrentStage();
    stage.setup(this, this.engine);
    soundEngine.playLevelUp();
  }

  nextStage() {
    if (this.currentStageIndex < STAGES.length - 1) {
      this.currentStageIndex++;
      this.loadStage();
      return true;
    } else {
      // Story completed!
      this.isStoryModeActive = false;
      return false;
    }
  }

  update(pointer, gesture) {
    if (!this.isStoryModeActive || this.stageComplete) return { progress: 100, complete: this.stageComplete };

    const stage = this.getCurrentStage();
    const result = stage.update(this, this.engine, pointer, gesture);
    
    if (result.complete && !this.stageComplete) {
      this.stageComplete = true;
      soundEngine.playLevelUp();
      particleEngine.spawnShockwave(window.innerWidth/2, window.innerHeight/2, '#00ff66');
    }

    return result;
  }

  draw(ctx) {
    if (!this.isStoryModeActive) return;
    const stage = this.getCurrentStage();
    if (stage.draw) {
      stage.draw(ctx, this);
    }
  }
}

export default StoryManager;
