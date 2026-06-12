// script.js - Main game engine, loop, and UI manager

import gestureDetector from './utils/gestureDetector.js';
import environmentManager, { WORLDS } from './utils/environmentManager.js';
import soundEngine from './utils/soundEngine.js';
import particleEngine from './utils/particleEngine.js';
import StoryManager, { STAGES } from './utils/storyManager.js';
import {
  FireflyDragon,
  WaterBlob,
  LeafSpirit,
  TinyRockGolem,
  ElectricButterfly,
  ShadowCat,
  WindBird,
  CrystalBug,
  SolarLion,
  ThunderElephant,
  PrimalDinosaur
} from './utils/creatureEngine.js';

const CREATURE_CLASSES = {
  'Firefly Dragon': FireflyDragon,
  'Water Blob': WaterBlob,
  'Leaf Spirit': LeafSpirit,
  'Tiny Rock Golem': TinyRockGolem,
  'Electric Butterfly': ElectricButterfly,
  'Shadow Cat': ShadowCat,
  'Wind Bird': WindBird,
  'Crystal Bug': CrystalBug,
  'Solar Lion': SolarLion,
  'Thunder Elephant': ThunderElephant,
  'Primal Dinosaur': PrimalDinosaur
};

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.overlayCanvas = document.getElementById('camera-overlay');
    this.previewVideo = document.getElementById('webcam-preview');
    
    this.creatures = [];
    this.selectedCreature = null;
    
    this.storyManager = new StoryManager(this);
    this.score = 0;
    this.isMuted = false;
    this.inputMode = 'mouse'; // 'mouse' or 'webcam'
    this.mediaStream = null;
    
    // Bounds for boundary constraints
    this.bounds = { width: window.innerWidth, height: window.innerHeight };
    
    // Selection cooldown
    this.selectionCooldown = 0;
    
    // Mouse fallback coordinate interpolation
    this.smoothPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Stage transition lock
    this.transitioning = false;
  }

  async init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Hide loader, show start screen
    const loader = document.getElementById('loading-indicator');
    loader.style.display = 'none';
    
    const startScreen = document.getElementById('start-screen');
    startScreen.classList.remove('hidden');

    // Setup input listeners in gestureDetector
    gestureDetector.setupFallbackListeners();
    
    // Bind UI Buttons
    document.getElementById('btn-request-camera').addEventListener('click', () => this.startAppWithCamera());
    document.getElementById('fallback-link').addEventListener('click', () => this.startAppWithMouse());
    
    document.getElementById('mode-story').addEventListener('click', () => this.chooseMode('story'));
    document.getElementById('mode-freeplay').addEventListener('click', () => this.chooseMode('freeplay'));
    
    document.getElementById('btn-dialog-ok').addEventListener('click', () => this.dismissDialog());
    
    document.getElementById('btn-mute').addEventListener('click', () => this.toggleMute());
    document.getElementById('btn-input-mode').addEventListener('click', () => this.toggleInputMode());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetStage());
    document.getElementById('btn-exit').addEventListener('click', () => this.exitToMenu());

    // Canvas click spawning in free play
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // Initialize environment elements
    environmentManager.init(this.bounds.width, this.bounds.height);

    // Start tick
    this.loop();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.bounds.width = this.canvas.width;
    this.bounds.height = this.canvas.height;
    
    // Mini webcam debug overlay resize
    this.overlayCanvas.width = 128;
    this.overlayCanvas.height = 96;
  }

  async startAppWithCamera() {
    document.getElementById('loading-indicator').style.display = 'flex';
    document.getElementById('loading-text-element').textContent = "Calibrating Neural Vision...";
    
    const success = await gestureDetector.init((text) => {
      document.getElementById('loading-text-element').textContent = text;
    });

    if (success) {
      await this.initCameraStream();
      this.inputMode = 'webcam';
      this.updateInputButtonUI();
    } else {
      this.showMouseBanner("MediaPipe failed. Active Mouse fallback.");
      this.inputMode = 'mouse';
    }

    document.getElementById('loading-indicator').style.display = 'none';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('mode-selection-overlay').classList.remove('hidden');
    soundEngine.playSelect();
  }

  startAppWithMouse() {
    this.inputMode = 'mouse';
    this.updateInputButtonUI();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('mode-selection-overlay').classList.remove('hidden');
    soundEngine.playSelect();
  }

  async initCameraStream() {
    if (this.mediaStream) {
      // stop old streams
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" }
      });
      
      this.previewVideo.srcObject = this.mediaStream;
      await this.previewVideo.play();
      
      document.getElementById('tracking-status').classList.add('active');
    } catch (err) {
      console.warn("Could not access camera, running mouse fallback", err);
      this.showMouseBanner("Webcam denied. Mouse fallback activated.");
      this.inputMode = 'mouse';
      this.updateInputButtonUI();
    }
  }

  showMouseBanner(text) {
    const banner = document.getElementById('mouse-notification');
    const bannerText = document.getElementById('mouse-notification-text');
    bannerText.textContent = text;
    banner.classList.add('show');
    setTimeout(() => {
      banner.classList.remove('show');
    }, 4000);
  }

  chooseMode(mode) {
    document.getElementById('mode-selection-overlay').classList.add('hidden');
    document.getElementById('hud').classList.add('visible');
    
    if (mode === 'story') {
      this.transitioning = false;
      this.storyManager.startStoryMode();
      document.getElementById('hud-mode-text').textContent = "Story Mode";
      document.getElementById('hud-mode-text').style.color = "var(--color-warning)";
      document.getElementById('story-status-panel').style.display = "block";
      this.showStageDialog();
    } else {
      this.storyManager.isStoryModeActive = false;
      document.getElementById('hud-mode-text').textContent = "Free Play Sandbox";
      document.getElementById('hud-mode-text').style.color = "var(--color-primary)";
      document.getElementById('story-status-panel').style.display = "none";
      this.setupFreePlay();
    }
    soundEngine.playLevelUp();
  }

  setupFreePlay() {
    this.clearWorld();
    // Spawn initial elemental creatures
    this.spawnCreature('Firefly Dragon', 300, 300);
    this.spawnCreature('Water Blob', 500, 400);
    this.spawnCreature('Leaf Spirit', 700, 300);
    this.spawnCreature('Tiny Rock Golem', 450, 550);
    this.spawnCreature('Electric Butterfly', 600, 200);

    this.selectCreature(this.creatures[0]);
  }

  showStageDialog() {
    const stage = this.storyManager.getCurrentStage();
    document.getElementById('dialog-badge').textContent = stage.badge;
    document.getElementById('dialog-title').textContent = stage.title;
    document.getElementById('dialog-text').innerHTML = stage.text;
    document.getElementById('dialog-goal').textContent = stage.goalText;
    document.getElementById('dialog-overlay').classList.remove('hidden');
  }

  dismissDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden');
    soundEngine.playSelect();
  }

  clearWorld() {
    this.creatures = [];
    this.selectedCreature = null;
    particleEngine.reset();
  }

  spawnCreature(type, x, y) {
    const CClass = CREATURE_CLASSES[type];
    if (CClass) {
      const c = new CClass(x, y);
      this.creatures.push(c);
      particleEngine.spawnSparkles(x, y, c.colorTheme, 15);
      return c;
    }
    return null;
  }

  selectCreature(creature) {
    this.creatures.forEach(c => c.selected = false);
    if (creature) {
      creature.selected = true;
      this.selectedCreature = creature;
      soundEngine.playSelect();
      this.updateCreatureCardUI();
    } else {
      this.selectedCreature = null;
    }
  }

  updateCreatureCardUI() {
    const card = document.getElementById('creature-card');
    if (this.selectedCreature) {
      card.style.opacity = '1';
      document.getElementById('creature-name').textContent = this.selectedCreature.name;
      document.getElementById('creature-mood').textContent = `${this.selectedCreature.mood} ${this.getMoodEmoji(this.selectedCreature.mood)}`;
      
      const energyBar = document.getElementById('creature-energy');
      const happinessBar = document.getElementById('creature-happiness');
      energyBar.style.width = `${this.selectedCreature.energy}%`;
      happinessBar.style.width = `${this.selectedCreature.happiness}%`;
    } else {
      card.style.opacity = '0.5';
      document.getElementById('creature-name').textContent = "No creature selected";
      document.getElementById('creature-mood').textContent = "-";
    }
  }

  getMoodEmoji(mood) {
    switch (mood) {
      case 'Happy': return '😊';
      case 'Curious': return '👀';
      case 'Scared': return '😨';
      case 'Sleepy': return '💤';
      case 'Angry': return '💢';
      case 'Excited': return '✨';
      case 'Hungry': return '🍕';
      default: return '😐';
    }
  }

  handleCanvasClick(e) {
    if (this.storyManager.isStoryModeActive) return; // ignore in story mode clicks

    const mx = e.clientX;
    const my = e.clientY;
    
    // Check if clicked close to a creature to select it
    let clickedCreature = null;
    this.creatures.forEach(c => {
      const dx = c.x - mx;
      const dy = c.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < c.radius + 15) {
        clickedCreature = c;
      }
    });

    if (clickedCreature) {
      this.selectCreature(clickedCreature);
    } else {
      // Spawn random creature at click location in Free Play
      const types = ['Firefly Dragon', 'Water Blob', 'Leaf Spirit', 'Tiny Rock Golem', 'Electric Butterfly', 'Shadow Cat', 'Wind Bird', 'Crystal Bug'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const spawned = this.spawnCreature(randomType, mx, my);
      if (spawned) {
        this.selectCreature(spawned);
        soundEngine.playSpawn();
      }
    }
  }

  resetStage() {
    soundEngine.playSelect();
    if (this.storyManager.isStoryModeActive) {
      this.transitioning = false;
      this.storyManager.loadStage();
    } else {
      this.setupFreePlay();
    }
    this.showMouseBanner("World Re-initialized");
  }

  exitToMenu() {
    soundEngine.playSelect();
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('mode-selection-overlay').classList.remove('hidden');
    this.clearWorld();
  }

  toggleMute() {
    const isMuted = soundEngine.toggleMute();
    document.getElementById('btn-mute').textContent = isMuted ? '🔇' : '🔊';
  }

  toggleInputMode() {
    soundEngine.playSelect();
    if (this.inputMode === 'mouse') {
      this.startAppWithCamera();
    } else {
      this.inputMode = 'mouse';
      this.updateInputButtonUI();
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      document.getElementById('tracking-status').classList.remove('active');
      this.showMouseBanner("Switched to Mouse / Keys fallback");
    }
  }

  updateInputButtonUI() {
    const btn = document.getElementById('btn-input-mode');
    btn.textContent = this.inputMode === 'webcam' ? '🎥' : '🖱️';
    btn.title = this.inputMode === 'webcam' ? "Switch to Mouse Controls" : "Switch to Webcam Tracking";
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    
    // Clear screen
    this.ctx.clearRect(0, 0, this.bounds.width, this.bounds.height);

    // 1. Process Hand skeleton tracking if camera active
    if (this.inputMode === 'webcam') {
      gestureDetector.detect(this.previewVideo, this.overlayCanvas);
    } else {
      // Fallback update
      gestureDetector.processGestures(this.bounds.width, this.bounds.height);
    }

    // 2. Fetch gesture variables
    const gesture = gestureDetector.currentGesture;
    const pointer = gestureDetector.getPointerPosition();
    const palm = gestureDetector.getPalmPosition();

    // Smooth pointer coordinates for rendering
    this.smoothPointer.x += (pointer.x - this.smoothPointer.x) * 0.25;
    this.smoothPointer.y += (pointer.y - this.smoothPointer.y) * 0.25;

    // 3. Environmental swipe left/right changes
    if (gestureDetector.swipeEvent) {
      soundEngine.playSwipe();
      if (gestureDetector.swipeEvent === 'left') {
        environmentManager.nextWorld(this.bounds.width, this.bounds.height);
      } else {
        environmentManager.prevWorld(this.bounds.width, this.bounds.height);
      }
      
      // Sync world UI
      setTimeout(() => {
        const curWorld = environmentManager.getCurrentWorld();
        document.getElementById('world-name').textContent = curWorld.name;
        document.getElementById('world-dot').style.backgroundColor = curWorld.colors.primary;
        document.getElementById('world-dot').style.boxShadow = `0 0 10px ${curWorld.colors.primary}`;
      }, 300);
    }

    // 4. Update HUD text values
    const gestName = document.getElementById('gesture-name');
    const gestIcon = document.getElementById('gesture-icon');
    if (gesture !== 'None') {
      gestName.textContent = gesture;
      gestIcon.textContent = this.getGestureEmoji(gesture);
    } else {
      gestName.textContent = "Calibrating...";
      gestIcon.textContent = '❓';
    }

    // 5. Update environment
    environmentManager.update(this.bounds.width, this.bounds.height);
    environmentManager.draw(this.ctx, this.bounds.width, this.bounds.height);

    // 6. Update story manager
    let storyCompleted = false;
    if (this.storyManager.isStoryModeActive) {
      const result = this.storyManager.update(pointer, gesture);
      
      // Update HUD progress bar
      document.getElementById('story-progress').style.width = `${result.progress}%`;
      
      const curStage = this.storyManager.getCurrentStage();
      document.getElementById('hud-story-stage').textContent = `${curStage.badge}: ${curStage.title}`;
      document.getElementById('hud-story-desc').textContent = curStage.goalText;

      // Draw custom story elements
      this.storyManager.draw(this.ctx);

      if (result.complete && !this.transitioning) {
        // Stage completed! Show dialogue trigger after short delay
        this.transitioning = true;
        setTimeout(() => {
          const hasNext = this.storyManager.nextStage();
          this.transitioning = false;
          if (hasNext) {
            this.showStageDialog();
          } else {
            // All stages clear!
            this.showMouseBanner("Congratulations! Luminara is Reborn!");
            soundEngine.playLevelUp();
            this.exitToMenu();
          }
        }, 1500);
      }
    }

    // 7. Update and Draw Particles
    particleEngine.update(this.bounds.width, this.bounds.height);
    particleEngine.draw(this.ctx);

    // 8. Shockwave trigger on Fist
    if (gesture === 'Closed Fist' && Math.random() < 0.05) {
      soundEngine.playShockwave();
      particleEngine.spawnShockwave(pointer.x, pointer.y, environmentManager.getCurrentWorld().colors.primary);
    }

    // 9. Two Fingers Up triggers switching selected creature in Free Play
    if (gesture === 'Two Fingers' && this.creatures.length > 1 && !this.storyManager.isStoryModeActive) {
      if (this.selectionCooldown === 0) {
        const idx = this.creatures.indexOf(this.selectedCreature);
        const nextIdx = (idx + 1) % this.creatures.length;
        this.selectCreature(this.creatures[nextIdx]);
        
        // Spawn select sparkles
        particleEngine.spawnSparkles(this.selectedCreature.x, this.selectedCreature.y, '#ffffff', 8);
        this.selectionCooldown = 25; // debounce frames
      }
    }
    if (this.selectionCooldown > 0) this.selectionCooldown--;

    // 10. Update and Draw Creatures
    this.creatures.forEach(c => {
      c.update(pointer, palm, gesture, this.bounds);
      c.draw(this.ctx);
    });

    // Update UI dashboard statistics card on frames
    this.updateCreatureCardUI();

    // 11. Draw Custom Magical Cursor/Pointer Sparkles
    this.drawMagicWand(this.ctx, this.smoothPointer.x, this.smoothPointer.y, gesture);
  }

  getGestureEmoji(gesture) {
    switch (gesture) {
      case 'One Finger': return '☝️';
      case 'Open Palm': return '✋';
      case 'Closed Fist': return '✊';
      case 'Pinch': return '🤏';
      case 'Two Fingers': return '✌️';
      case 'Thumb Up': return '👍';
      case 'Thumb Down': return '👎';
      default: return '❓';
    }
  }

  drawMagicWand(ctx, x, y, gesture) {
    ctx.save();
    
    const curTheme = environmentManager.getCurrentWorld().colors;
    ctx.shadowBlur = 15;
    ctx.shadowColor = curTheme.primary;
    
    // Draw magic circle outline around pointer
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw secondary ring
    ctx.beginPath();
    const rotSpeed = Date.now() * 0.002;
    ctx.arc(x, y, 22, rotSpeed, rotSpeed + Math.PI * 0.5);
    ctx.arc(x, y, 22, rotSpeed + Math.PI, rotSpeed + Math.PI * 1.5);
    ctx.strokeStyle = curTheme.secondary;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw pointer core dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }
}

// Instantiate and start engine
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  game.init();
});
