/**
 * EcoShot Arena — Gesture Controlled Environmental Shooting Game
 * Core Engine Script (Vanilla JS & MediaPipe Canvas Engine)
 */

// ==========================================
// 1. CONSTANTS & RESOURCES
// ==========================================

const ARCHETYPE_GARBAGE = 'garbage';
const ARCHETYPE_NATURE = 'nature';
const ARCHETYPE_BONUS = 'bonus';

const GARBAGE_TYPES = [
  { id: 'bottle', name: 'Plastic Bottle', emoji: '🍾', archetype: ARCHETYPE_GARBAGE, points: 10, speedMin: 2, speedMax: 4.5, color: '#10b981', help: 'Sort empty bottles into recycling bin!' },
  { id: 'chips', name: 'Chips Packet', emoji: '🍟', archetype: ARCHETYPE_GARBAGE, points: 10, speedMin: 2, speedMax: 4.5, color: '#059669', help: 'Empty packaging goes to landfill waste.' },
  { id: 'bag', name: 'Garbage Bag', emoji: '🗑️', archetype: ARCHETYPE_GARBAGE, points: 15, speedMin: 1.2, speedMax: 2.5, color: '#34d399', help: 'Always tie disposal bags tightly.' },
  { id: 'can', name: 'Tin Can', emoji: '🥫', archetype: ARCHETYPE_GARBAGE, points: 15, speedMin: 3, speedMax: 5.5, color: '#06ffd2', help: 'Cans can be recycled infinitely!' },
  { id: 'phone', name: 'E-Waste Phone', emoji: '📱', archetype: ARCHETYPE_GARBAGE, points: 20, speedMin: 2, speedMax: 4, color: '#38bdf8', help: 'Take old electronics to e-waste centers!' },
  { id: 'battery', name: 'Toxic Battery', emoji: '🔋', archetype: ARCHETYPE_GARBAGE, points: 25, speedMin: 3.5, speedMax: 6, color: '#f59e0b', help: 'Batteries leak acid. Recycle separately!' },
  { id: 'smoke', name: 'Carbon Cloud', emoji: '💨', archetype: ARCHETYPE_GARBAGE, points: 20, speedMin: 1, speedMax: 2.2, color: '#ef4444', help: 'Reduce driving to clean carbon smoke!' },
  { id: 'barrel', name: 'Chemical Barrel', emoji: '🛢️', archetype: ARCHETYPE_GARBAGE, points: 30, speedMin: 1, speedMax: 2, color: '#dc2626', help: 'Warning: Toxic waste requires industrial care!' },
  { id: 'monster_mini', name: 'Trash Slime', emoji: '👾', archetype: ARCHETYPE_GARBAGE, points: 50, speedMin: 2.5, speedMax: 5, color: '#f59e0b', help: 'Fierce garbage minion! Bullet-down now!' }
];

const NATURE_TYPES = [
  { id: 'tree', name: 'Green Tree', emoji: '🌳', archetype: ARCHETYPE_NATURE, points: -30, warning: 'Protect trees! They clean our air!' },
  { id: 'bird', name: 'Siberian Bird', emoji: '🐦', archetype: ARCHETYPE_NATURE, points: -25, warning: 'Save animals! Keep wetlands toxic-free!' },
  { id: 'water', name: 'Pure Water', emoji: '💧', archetype: ARCHETYPE_NATURE, points: -20, warning: 'Save clean water! Don\'t waste drops!' },
  { id: 'flower', name: 'Clover Flower', emoji: '🌸', archetype: ARCHETYPE_NATURE, points: -15, warning: 'Don\'t harm original wildflower blooms!' },
  { id: 'earth', name: 'Mother Earth', emoji: '🌍', archetype: ARCHETYPE_NATURE, points: -50, warning: 'Protect the Earth! Our only home!' },
  { id: 'solar', name: 'Clean Solar Panel', emoji: '☀️', archetype: ARCHETYPE_NATURE, points: -30, warning: 'Keep solar active to harness clean energy.' }
];

const BONUS_TYPES = [
  { id: 'leaf', name: 'Organic Leaf', emoji: '🍃', archetype: ARCHETYPE_BONUS, points: 10, bonus: 'time', val: 5, color: '#a7f3d0' },
  { id: 'star', name: 'Eco Power Star', emoji: '⭐', archetype: ARCHETYPE_BONUS, points: 100, bonus: 'score', val: 100, color: '#fef08a' },
  { id: 'shield', name: 'Recycle Shield', emoji: '🛡️', archetype: ARCHETYPE_BONUS, points: 15, bonus: 'shield', val: 1, color: '#a5f3fc' },
  { id: 'double', name: 'Double Leaf', emoji: '🍀', archetype: ARCHETYPE_BONUS, points: 20, bonus: 'double', val: 10, color: '#86efac' }
];

const ECO_TIPS = [
  "Segregate dry and wet waste in homes to enable successful community sorting.",
  "Avoid single-use plastic cups, straws, and cutlery. Use steel or bamboo!",
  "Always recycle exhausted electronic waste and alkaline batteries separately.",
  "Save water inside municipal zones. Report structural line leaks immediately.",
  "Keep cities clean. Urban rubbish causes blockages and subsequent floods.",
  "Turn off appliances and server networks when idle to lower carbon drag.",
  "Planting native clover shrubs supports local bees and improves regional soil quality."
];

const BADGES = [
  { minScore: 0, maxScore: 300, name: 'Eco Rookie', emoji: '🌱' },
  { minScore: 301, maxScore: 700, name: 'Green Shooter', emoji: '🔫' },
  { minScore: 701, maxScore: 1200, name: 'Eco Defender', emoji: '🛡️' },
  { minScore: 1201, maxScore: 2000, name: 'Planet Protector', emoji: '🌟' },
  { minScore: 2001, maxScore: 999999, name: 'Earth Guardian', emoji: '🌍' }
];

// ==========================================
// 2. GAME STATE MANAGEMENT
// ==========================================

let state = {
  score: 0,
  cleanedCount: 0,
  hits: 0,
  misses: 0,
  totalShots: 0,
  comboLevel: 0,
  comboHits: 0,
  timeLeft: 300, // 5 minutes, i.e. 300 seconds (or shorter in practice mod)
  isPaused: false,
  activeScreen: 'landing', // landing, guide, camera-setup, game, result
  activeMode: 'normal', // normal, practice
  
  // Game environment background transformation score benchmarks
  pollutionSeverity: 100, // 0 to 100 opacity scale
  
  // Shield / Double points timers
  shieldActive: false,
  doublePointsTimer: 0, // seconds remaining
  
  // Boss state
  bossActive: false,
  bossHp: 500,
  bossMaxHp: 500,
  bossX: 0,
  bossY: 0,
  bossDir: 1,
  bossSpeed: 3.5,
  
  // Timers and thread tags
  gameLoopId: null,
  countdownId: null,
  spawnerIds: [],
  currentTime: 0, // game milliseconds
  
  // Mouse / Fallback state
  mouseMode: true, // starts true as guarantee before cam completes
  mouseX: 400,
  mouseY: 300,
  
  // Gesture dynamic state (MediaPipe tracker)
  handDetected: false,
  currentGesture: "NO HAND", // "FIST", "THUMBS_UP", "OPEN_HAND"
  lastGestureChange: 0,
  trackedAimX: 400,
  trackedAimY: 300,
  previousThumbUp: false,
  lastShotTime: 0,
  fpsCount: 0,
  fpsLastUpdate: 0,
  camStarted: false
};

// Calibration state variables (saved & loaded dynamically)
let config = {
  mirror: true,
  cooldown: 250, // ms
  targetSize: 90, //px avg
  smoothing: 0.35, // LERP interpolation factor
  confidenceThreshold: 0.5,
  nightEnhance: false,
  sensitivity: 0.70
};

// Object collections for gameplay animation
let gameObjects = [];
let particles = [];
let lasers = [];
let floatingTexts = [];

// Screen Dimensions
let canvas = null;
let ctx = null;

// MediaPipe API constructs
let mediaPipeHands = null;
let mediaPipeCamera = null;

// Audio context holder
let audioCtx = null;

// ==========================================
// 3. SYNTHESIZED SOUND CORE (WEB AUDIO API)
// ==========================================

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  // Make sure to resume context inside modern browser sandboxes
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  try {
    const now = audioCtx.currentTime;
    
    if (type === 'shoot') {
      // Swishing high-tech energy laser pulse
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } 
    else if (type === 'hit-trash') {
      // Clean eco thud
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } 
    else if (type === 'hit-wrong') {
      // Dangerous caution buzzer sequence
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } 
    else if (type === 'bonus') {
      // Shimmering high pitches for bonuses
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(1040, now + 0.25);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } 
    else if (type === 'combo') {
      // Fast pitch ascensions
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } 
    else if (type === 'boss-defeat') {
      // Big sweeping futuristic game boom!
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
      
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.82);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    }
  } catch (err) {
    console.warn("Dynamic Audio Node Play blocked / unready: ", err);
  }
}

// ==========================================
// 4. CANVAS / HUD DIMENSIONS SETUP
// ==========================================

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  // Make sure aimed coordinates remain relative
  if (state.mouseX > canvas.width) state.mouseX = canvas.width / 2;
  if (state.mouseY > canvas.height) state.mouseY = canvas.height / 2;
  if (state.trackedAimX > canvas.width) state.trackedAimX = canvas.width / 2;
  if (state.trackedAimY > canvas.height) state.trackedAimY = canvas.height / 2;
}

// ==========================================
// 5. MEDIAPIPE GESTURE RECOGNITION MATHS
// ==========================================

function dist3D(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
}

function processHandLandmarks(results) {
  // Check frame update speed
  state.fpsCount++;
  const elapsed = Date.now() - state.fpsLastUpdate;
  if (elapsed >= 1000) {
    document.getElementById('diag-fps').innerText = (state.fpsCount * (1000 / elapsed)).toFixed(1);
    state.fpsCount = 0;
    state.fpsLastUpdate = Date.now();
  }

  // Detect and parse single hand
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    state.handDetected = true;
    const landmarks = results.multiHandLandmarks[0];
    
    // GESTURE CHECKS & COORDINATES PARSING
    // Let's analyze gestures relative to wrist (0)
    const wrist = landmarks[0];
    
    // Compute finger spread indicators for complex overlays
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    
    // Base knuckles MCP joints
    const mcp5 = landmarks[5];
    const mcp9 = landmarks[9];
    const mcp13 = landmarks[13];
    const mcp17 = landmarks[17];
    
    // Extended states comparison relative to wrist (very robust)
    const indexExtended = dist3D(indexTip, wrist) > dist3D(indexPip, wrist) * 1.08;
    const middleExtended = dist3D(middleTip, wrist) > dist3D(middlePip, wrist) * 1.08;
    const ringExtended = dist3D(ringTip, wrist) > dist3D(ringPip, wrist) * 1.08;
    const pinkyExtended = dist3D(pinkyTip, wrist) > dist3D(pinkyPip, wrist) * 1.08;
    
    // Fingertips folded constitutes a Fist posture.
    const isFist = !indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
    
    // Much more robust Thumbs Up detection to distinguish from relaxed thumb:
    // 1. Thumb Tip must be physically higher than the Thumb IP joint and MCP joint
    // 2. Distance from Thumb Tip to Thumb MCP shows it is extended/raised, and not tucked against the hand
    // 3. Thumb Tip must be physically higher than the Index knuckle (mcp5) to ensure it is raised up in thumbs-up posture
    const thumbIsUp = (thumbTip.y < thumbIp.y - 0.015) && (thumbTip.y < thumbMcp.y - 0.015);
    const thumbExtended = dist3D(thumbTip, thumbMcp) > dist3D(thumbIp, thumbMcp) * 1.10;
    const thumbAboveKnuckles = (thumbTip.y < mcp5.y - 0.015);
    const currentThumbUp = thumbIsUp && thumbExtended && thumbAboveKnuckles;

    // We can move the pointer when the hand is folded into a fist OR when we do a thumbs-up (which is naturally a fist format)
    const canMovePointer = isFist || currentThumbUp;
    
    // 👉 For moving the pointer / targeting the object
    if (canMovePointer) {
      // Smooth aim tracking mapping middle knuckle (mcp9) which is the absolute center of the fist
      const rawX = mcp9.x;
      const rawY = mcp9.y;
      
      // Scale coordinates using tracking sensitivity centered at 0.5 to prevent over-sensitive jumps!
      const sens = config.sensitivity !== undefined ? config.sensitivity : 0.70;
      
      const dx = rawX - 0.5;
      const dy = rawY - 0.5;
      
      const scaledX = Math.max(0.01, Math.min(0.99, 0.5 + dx * sens));
      const scaledY = Math.max(0.01, Math.min(0.99, 0.5 + dy * sens));
      
      // Physical mirror orientation mapping
      let px = config.mirror ? (1 - scaledX) * canvas.width : scaledX * canvas.width;
      let py = scaledY * canvas.height;
      
      // Continuous Lerp Smoothing interpolation to remove physical hand shakiness
      state.trackedAimX = state.trackedAimX * (1 - config.smoothing) + px * config.smoothing;
      state.trackedAimY = state.trackedAimY * (1 - config.smoothing) + py * config.smoothing;
    }
    
    // Diagnostic confidence updates
    document.getElementById('diag-conf').innerText = results.multiHandedness[0].score.toFixed(2);
    document.getElementById('hud-no-hand').classList.add('opacity-0');
    
    // Evaluate main postures: only FIST, THUMBS_UP, and OPEN_HAND
    let currentPose = "OPEN_HAND";
    if (isFist) {
      currentPose = "FIST";
    }
    if (currentThumbUp) {
      currentPose = "THUMBS_UP";
    }
    
    // Smooth continuous auto-firing when thumbs up is held!
    if (currentThumbUp) {
      triggerHandShot(state.trackedAimX, state.trackedAimY);
    }
    
    // Track transition register
    state.previousThumbUp = currentThumbUp;
    
    // Render feedback overlays
    updateGestureHUD(currentPose, currentThumbUp);

    // If camera calibrator is currently listening, draw visual skeletons
    if (state.activeScreen === 'camera-setup') {
      drawSkeletalOverlay(landmarks);
    } else if (state.activeScreen === 'game') {
      // Draw mini glowing green skeleton connections on the HUD canvas during gameplay!
      const hCanvas = document.getElementById('hud-camera-canvas');
      if (hCanvas) {
        const hCtx = hCanvas.getContext('2d');
        hCtx.strokeStyle = 'rgba(57, 255, 20, 0.75)';
        hCtx.fillStyle = '#39ff14';
        hCtx.lineWidth = 1.5;
        
        const connections = [
          [0,1], [1,2], [2,3], [3,4], // Thumb
          [0,5], [5,6], [6,7], [7,8], // Index
          [9,10], [10,11], [11,12],   // Middle
          [13,14], [14,15], [15,16],   // Ring
          [0,17], [17,18], [18,19], [19,20], // Pinky
          [5,9], [9,13], [13,17] // Palm cross-caps
        ];
        
        connections.forEach(pair => {
          const p1 = landmarks[pair[0]];
          const p2 = landmarks[pair[1]];
          if (p1 && p2) {
            hCtx.beginPath();
            hCtx.moveTo(p1.x * hCanvas.width, p1.y * hCanvas.height);
            hCtx.lineTo(p2.x * hCanvas.width, p2.y * hCanvas.height);
            hCtx.stroke();
          }
        });
        
        landmarks.forEach(pt => {
          hCtx.beginPath();
          hCtx.arc(pt.x * hCanvas.width, pt.y * hCanvas.height, 1.8, 0, Math.PI * 2);
          hCtx.fill();
        });
      }
    }
  } else {
    // No hand detected
    state.handDetected = false;
    document.getElementById('hud-no-hand').classList.remove('opacity-0');
    updateGestureHUD("NO HAND", false);
  }
}

function updateGestureHUD(pose, thumbUp) {
  state.currentGesture = pose;
  const badge = document.getElementById('cam-gesture-badge');
  const val = document.getElementById('cam-gesture-val');
  const hudGesture = document.getElementById('hud-gesture');
  const hudGestureState = document.getElementById('hud-gesture-state');
  const triggerVisual = document.getElementById('trigger-state-visual');
  const diagShoot = document.getElementById('diag-shoot');

  // Sync diagnostic panels
  if (thumbUp) {
    triggerVisual.className = "w-8 h-8 rounded-lg flex items-center justify-center text-lg trigger-active bg-emerald-500 text-black";
    triggerVisual.innerHTML = "👍";
    diagShoot.innerText = "FIRE";
    diagShoot.className = "font-bold text-emerald-400";
  } else {
    triggerVisual.className = "w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-slate-900 border border-slate-850 text-slate-600 opacity-40";
    triggerVisual.innerHTML = "👍";
    diagShoot.innerText = "IDLE";
    diagShoot.className = "font-bold text-slate-400";
  }

  // Handle visual modes feedback
  if (state.mouseMode) {
    if (hudGesture) hudGesture.innerText = "Mouse Play Actived";
    if (hudGestureState) {
      hudGestureState.innerText = "CLICK MOUSE TO SHOOT";
      hudGestureState.className = "text-[9px] font-mono text-cyan-400 animate-pulse";
    }
    return;
  }

  let text = "Searching Hand...";
  let colorClass = "bg-slate-800 text-slate-400";
  let displayIcon = "❌";

  switch (pose) {
    case "FIST":
      text = "Fist: Aim & Move Pointer";
      displayIcon = "✊";
      colorClass = "bg-emerald-950 text-emerald-400 border border-emerald-500/30";
      break;
    case "THUMBS_UP":
      text = "Firing: Thumbs Up (Continuous!)";
      displayIcon = "💥";
      colorClass = "bg-teal-950 text-teal-400 border border-teal-500/30";
      break;
    case "OPEN_HAND":
      text = "Fold Fingers into a Fist to Aim!";
      displayIcon = "🖐️";
      colorClass = "bg-amber-950/40 text-amber-300 border border-amber-500/20";
      break;
    default:
      text = "Tracking Space...";
      displayIcon = "❓";
  }

  // Update DOM
  if (val) val.innerText = `${displayIcon} ${text}`;
  if (badge) {
    badge.className = `px-2.5 py-1 rounded-md text-[10px] font-mono tracking-widest uppercase ${colorClass}`;
    badge.innerText = pose;
  }
  if (hudGesture) hudGesture.innerText = text;
  if (hudGestureState) {
    hudGestureState.innerText = "CAMERA GESTURE CONTROL";
    hudGestureState.className = "text-[9px] font-mono text-emerald-400";
  }
}

function triggerHandShot(x, y) {
  const now = Date.now();
  if (now - state.lastShotTime >= config.cooldown) {
    state.lastShotTime = now;
    shoot(x, y);
  }
}

// Draw skeleton helper lines inside webcam setup menu
function drawSkeletalOverlay(landmarks) {
  const setupCanvas = document.getElementById('camera-overlay-canvas');
  if (!setupCanvas) return;

  const video = document.getElementById('webcam-video');
  if (video && video.videoWidth > 0) {
    if (setupCanvas.width !== video.videoWidth || setupCanvas.height !== video.videoHeight) {
      setupCanvas.width = video.videoWidth;
      setupCanvas.height = video.videoHeight;
    }
  } else {
    if (setupCanvas.width !== 640) {
      setupCanvas.width = 640;
      setupCanvas.height = 480;
    }
  }

  const sCtx = setupCanvas.getContext('2d');
  sCtx.clearRect(0, 0, setupCanvas.width, setupCanvas.height);
  
  // Sizable point drawing
  sCtx.fillStyle = '#39ff14';
  sCtx.strokeStyle = 'rgba(57, 255, 20, 0.4)';
  sCtx.lineWidth = 3;
  
  // Landmark connections
  const connections = [
    [0,1], [1,2], [2,3], [3,4], // Thumb
    [0,5], [5,6], [6,7], [7,8], // Index
    [9,10], [10,11], [11,12],   // Middle
    [13,14], [14,15], [15,16],   // Ring
    [0,17], [17,18], [18,19], [19,20], // Pinky
    [5,9], [9,13], [13,17] // Palm cross-caps
  ];
  
  connections.forEach(pair => {
    const p1 = landmarks[pair[0]];
    const p2 = landmarks[pair[1]];
    sCtx.beginPath();
    sCtx.moveTo(p1.x * setupCanvas.width, p1.y * setupCanvas.height);
    sCtx.lineTo(p2.x * setupCanvas.width, p2.y * setupCanvas.height);
    sCtx.stroke();
  });
  
  landmarks.forEach(pt => {
    sCtx.beginPath();
    sCtx.arc(pt.x * setupCanvas.width, pt.y * setupCanvas.height, 4, 0, Math.PI * 2);
    sCtx.fill();
  });
}

// ==========================================
// 6. WEBCAM STREAM & DETECTOR PIPELINE
// ==========================================

function startCameraSource() {
  const video = document.getElementById('webcam-video');
  const errorBox = document.getElementById('cam-permission-error');
  const statusDoc = document.getElementById('cam-status-text');
  const statusDot = document.getElementById('cam-status-dot');

  if (state.camStarted) return;

  // Set indicators to loading
  if (statusDoc) statusDoc.innerText = 'Syncing Camera...';

  // Instantiate MediaPipe constructs
  if (!mediaPipeHands) {
    mediaPipeHands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    
    mediaPipeHands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: config.confidenceThreshold,
      minTrackingConfidence: config.confidenceThreshold
    });

    mediaPipeHands.onResults(processHandLandmarks);
  }

  // Probe user camera with fast attributes for high-refresh rates (60fps+ if supported)
  navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 60 }
    }
  })
    .then(stream => {
      video.srcObject = stream;
      state.camStarted = true;
      state.mouseMode = false; // webcam connects, mute mouse fallback initially

      if (statusDoc) statusDoc.innerText = 'Camera Calibrated';
      if (statusDot) {
        statusDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse";
      }
      if (errorBox) errorBox.classList.add('hidden');

      // Initialize media camera loop
      mediaPipeCamera = new Camera(video, {
        onFrame: async () => {
          if (state.camStarted) {
            await mediaPipeHands.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });
      mediaPipeCamera.start();

      // Mirror game camera corner
      const hCanvas = document.getElementById('hud-camera-canvas');
      if (hCanvas) {
        const hCtx = hCanvas.getContext('2d');
        function copyHudCam() {
          if (!state.camStarted) return;
          if (state.activeScreen === 'game') {
            hCtx.drawImage(video, 0, 0, hCanvas.width, hCanvas.height);
          }
          requestAnimationFrame(copyHudCam);
        }
        hCanvas.width = 160;
        hCanvas.height = 120;
        requestAnimationFrame(copyHudCam);
      }
    })
    .catch(err => {
      console.warn("Camera pipeline load failed: ", err);
      state.mouseMode = true; // Force fallback immediately on error or denial
      if (statusDoc) statusDoc.innerText = 'Fallback Engaged';
      if (statusDot) statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
      if (errorBox) errorBox.classList.remove('hidden');
    });
}

function stopCameraSource() {
  const video = document.getElementById('webcam-video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  if (mediaPipeCamera) {
    mediaPipeCamera.stop();
  }
  state.camStarted = false;
  state.handDetected = false;
}

// ==========================================
// 7. WEAPON PHYSICS & INTERACTION TRIGGERS
// ==========================================

function shoot(targetX, targetY) {
  state.totalShots++;
  playSound('shoot');

  // Trigger weapon visuals (lasers & muzzle flare)
  lasers.push({
    startX: canvas.width / 2,
    startY: canvas.height,
    endX: targetX,
    endY: targetY,
    width: 6,
    alpha: 1.0,
    color: '#10b981'
  });

  // Calculate dynamic impact radius
  let impactR = config.targetSize * 0.45;
  let targetHit = false;

  // Reverse loop to allow removal on hit
  for (let i = gameObjects.length - 1; i >= 0; i--) {
    let obj = gameObjects[i];
    let dist = Math.sqrt((obj.x - targetX) ** 2 + (obj.y - targetY) ** 2);
    
    // Collision detection
    if (dist <= obj.radius + impactR) {
      targetHit = true;
      handleImpact(obj, i, targetX, targetY);
      break; // Single impact per laser burst
    }
  }

  // Perform Boss damage verification
  if (!targetHit && state.bossActive) {
    let bDist = Math.sqrt((state.bossX - targetX) ** 2 + (state.bossY - targetY) ** 2);
    if (bDist <= 110) { // Large Boss hit circle dimensions
      targetHit = true;
      damageBoss(25, targetX, targetY);
    }
  }

  // Standard missed penalty registered
  if (!targetHit) {
    state.misses++;
    state.comboLevel = 0;
    state.comboHits = 0;
    createFloatingText(targetX, targetY - 15, "MISSED", "#64748b");
    
    // Small particle debris on impact spot
    for (let p = 0; p < 4; p++) {
      particles.push({
        x: targetX,
        y: targetY,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: Math.random() * 2 + 1,
        color: '#64748b',
        alpha: 1,
        life: 1.0,
        decay: 0.05
      });
    }
  }

  // Update HUD
  syncGameHUD();
}

function handleImpact(obj, index, hitX, hitY) {
  // Check Double Score multiplier
  let pointsEarned = obj.points;
  if (state.doublePointsTimer > 0 && pointsEarned > 0) {
    pointsEarned *= 2;
  }

  if (obj.archetype === ARCHETYPE_GARBAGE) {
    // Correct garbage cleanses!
    state.cleanedCount++;
    state.score = Math.max(0, state.score + pointsEarned);
    state.hits++;
    state.comboHits++;
    
    // Combo escalation steps
    let comboMultiplierText = "";
    if (state.comboHits >= 10) {
      state.score += 100;
      comboMultiplierText = " 🔥 PLANET SAVER +100";
      playSound('combo');
      createFloatingText(hitX, hitY - 45, "ECO BLAST! 💎", '#f59e0b');
    } else if (state.comboHits === 5) {
      state.score += 50;
      comboMultiplierText = " ✨ ECO BLAST +50";
      playSound('combo');
    } else if (state.comboHits === 3) {
      state.score += 20;
      comboMultiplierText = " 🍃 GREEN COMBO +20";
      playSound('hit-trash');
    } else {
      playSound('hit-trash');
    }

    // Determine current Combo state and update HUD progress pips
    state.comboLevel = Math.floor(state.comboHits / 3);

    // Floating success triggers
    let txt = `+${pointsEarned}`;
    if (comboMultiplierText) txt += comboMultiplierText;
    createFloatingText(hitX, hitY - 20, txt, state.doublePointsTimer > 0 ? '#10b981' : '#34d399');

    // Create explosion leaf particles
    let partColor = obj.color || '#10b981';
    for (let p = 0; p < 14; p++) {
      particles.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2, // floating upwards
        radius: Math.random() * 6 + 3,
        color: partColor,
        alpha: 1,
        life: 1.2,
        decay: 0.03,
        spin: (Math.random() - 0.5) * 0.2,
        angle: Math.random() * Math.PI,
        isLeaf: true
      });
    }

    // Educational banner alerts
    if (obj.help) {
      triggerToastNotification(obj.help);
    }

    // Clear target from registry
    gameObjects.splice(index, 1);
  } 
  else if (obj.archetype === ARCHETYPE_NATURE) {
    // Increment global Nature Penalties counter
    state.naturePenalties = (state.naturePenalties || 0) + 1;

    // Direct Check: If Earth (🌍) is hit, end game instantly
    if (obj.id === 'earth') {
      playSound('hit-wrong');
      createFloatingText(hitX, hitY - 20, "EARTH DESTROYED! GAME OVER", '#f43f5e');
      triggerNatureWarningFlash("Mother Earth hit! Eco Simulation terminated!");
      
      // Clear gameObjects immediately to stop interactions
      gameObjects = [];
      
      // Delay slightly so the visual flash & sound play clearly, then terminate
      setTimeout(() => {
        terminateSimulation(false, true);
      }, 700);
      return;
    }

    // INCORRECT impact: Nature protection warning!
    if (state.shieldActive) {
      // Shield consumed, save points!
      state.shieldActive = false;
      createFloatingText(hitX, hitY - 20, "SHIELD RECOVERY!", '#38bdf8');
      playSound('hit-trash');
      triggerToastNotification("Recycle shield protected your nature objects!");
    } else {
      // Deduct penalties
      state.score = Math.max(0, state.score + pointsEarned);
      state.comboLevel = 0;
      state.comboHits = 0;
      playSound('hit-wrong');

      createFloatingText(hitX, hitY - 20, `${pointsEarned} PENALTY!`, '#ef4444');
      triggerNatureWarningFlash(obj.warning);
    }

    // Spawning smoke particle elements
    for (let p = 0; p < 12; p++) {
      particles.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        radius: Math.random() * 10 + 4,
        color: '#ef4444',
        alpha: 0.8,
        life: 0.8,
        decay: 0.05,
        isSmoke: true
      });
    }

    gameObjects.splice(index, 1);
  } 
  else if (obj.archetype === ARCHETYPE_BONUS) {
    // Dynamic bonus objects collection
    playSound('bonus');
    createFloatingText(hitX, hitY - 20, `CONVERTED! +${pointsEarned}`, '#fbf373');

    if (obj.bonusType === 'time') {
      state.timeLeft += obj.val;
      createFloatingText(hitX, hitY - 40, `+${obj.val} SECONDS! ⏳`, '#34d399');
    } 
    else if (obj.bonusType === 'score') {
      state.score += obj.val;
    } 
    else if (obj.bonusType === 'shield') {
      state.shieldActive = true;
      triggerToastNotification("Active Recycle Shield - Next nature hit penalty blocked!");
    } 
    else if (obj.bonusType === 'double') {
      state.doublePointsTimer = Math.max(state.doublePointsTimer, 10); // 10 sec double
      triggerToastNotification("2X DOUBLE POINTS ACTIVATED FOR 10 SECONDS!");
    }

    // Flash celebration particles
    for (let p = 0; p < 15; p++) {
      particles.push({
        x: hitX,
        y: hitY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        radius: Math.random() * 4 + 2,
        color: '#fbbf24',
        alpha: 1,
        life: 1.5,
        decay: 0.04
      });
    }

    gameObjects.splice(index, 1);
  }

  // Gradually transform background based on total pollution cleaned
  state.pollutionSeverity = Math.max(10, 100 - (state.cleanedCount * 2.5));

  // Sync state
  syncGameHUD();
}

function damageBoss(dmg, hitX, hitY) {
  if (!state.bossActive) return;

  state.bossHp = Math.max(0, state.bossHp - dmg);
  state.score += 15;
  createFloatingText(hitX, hitY - 20, "-25 HP 💥", '#f87171');
  playSound('hit-trash');

  // Spark effects
  for (let p = 0; p < 8; p++) {
    particles.push({
      x: hitX,
      y: hitY,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      radius: Math.random() * 5 + 2,
      color: '#f43f5e',
      alpha: 1,
      life: 0.8,
      decay: 0.04
    });
  }

  // Check defeat
  if (state.bossHp <= 0) {
    state.bossActive = false;
    state.score += 300;
    playSound('boss-defeat');
    triggerToastNotification("🔥 GARBAGE MONSTER DEFEATED! BONUS +300 POINTS!");
    
    // Hide boss hud
    document.getElementById('boss-hud').classList.add('opacity-0');

    // Huge fireworks shower of eco bonus-stars
    for (let s = 0; s < 12; s++) {
      spawnCustomTarget(ARCHETYPE_BONUS, 'star', hitX + (Math.random() - 0.5) * 200, hitY + (Math.random() - 0.5) * 200);
    }
  }

  // Sync HUD
  const hpBar = document.getElementById('boss-hp-bar');
  const hpText = document.getElementById('boss-hp-text');
  if (hpBar) hpBar.style.width = `${(state.bossHp / state.bossMaxHp) * 100}%`;
  if (hpText) hpText.innerText = `${state.bossHp} / ${state.bossMaxHp} HP`;
}

function activateRecycleShield() {
  state.shieldActive = true;
  playSound('bonus');
  createFloatingText(state.trackedAimX, state.trackedAimY - 30, "SHIELD ARMED! 🛡️", '#38bdf8');
  triggerToastNotification("Recycle Shield powered up by Fist. Safe from penalty!");
}

// ==========================================
// 8. DATA SPAWNERS & PROGRESSIVE LOGIC
// ==========================================

function spawnCustomTarget(archetype, specificId = null, forcedX = null, forcedY = null) {
  let item = null;

  if (archetype === ARCHETYPE_GARBAGE) {
    // Select waste item
    if (specificId) {
      item = GARBAGE_TYPES.find(g => g.id === specificId);
    } else {
      // Dynamic availability based on timeline minutes elapsed
      const secs = 300 - state.timeLeft;
      let available = [GARBAGE_TYPES[0], GARBAGE_TYPES[1], GARBAGE_TYPES[2]]; // bottles chips bags
      if (secs >= 60) available.push(GARBAGE_TYPES[3], GARBAGE_TYPES[4]); // cans phones
      if (secs >= 120) available.push(GARBAGE_TYPES[5], GARBAGE_TYPES[6]); // batteries smoke
      if (secs >= 180) available.push(GARBAGE_TYPES[7], GARBAGE_TYPES[8]); // chemical mini-monsters

      item = available[Math.floor(Math.random() * available.length)];
    }
  } 
  else if (archetype === ARCHETYPE_NATURE) {
    item = NATURE_TYPES[Math.floor(Math.random() * NATURE_TYPES.length)];
  } 
  else if (archetype === ARCHETYPE_BONUS) {
    if (specificId) {
      item = BONUS_TYPES.find(b => b.id === specificId);
    } else {
      item = BONUS_TYPES[Math.floor(Math.random() * BONUS_TYPES.length)];
    }
  }

  if (!item) return;

  // Compute spawn layout positions
  const radius = (config.targetSize * (0.8 + Math.random() * 0.45));
  const side = Math.floor(Math.random() * 3); // 0 = Left, 1 = Right, 2 = Top
  
  let x = forcedX;
  let y = forcedY;
  let vx = 0;
  let vy = 0;

  if (x === null || y === null) {
    if (side === 0) { // left side entry
      x = -radius;
      y = Math.random() * (canvas.height * 0.6) + 120;
      vx = Math.random() * 2 + (item.speedMin || 1.5);
      vy = (Math.random() - 0.5) * 2;
    } 
    else if (side === 1) { // right side entry
      x = canvas.width + radius;
      y = Math.random() * (canvas.height * 0.6) + 120;
      vx = -(Math.random() * 2 + (item.speedMin || 1.5));
      vy = (Math.random() - 0.5) * 2;
    } 
    else { // top side entry
      x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1;
      y = -radius;
      vx = (Math.random() - 0.5) * 3;
      vy = Math.random() * 2 + (item.speedMin || 1.5);
    }
  }

  // Double-check speed configurations
  const targetObj = {
    id: item.id + Math.random(),
    name: item.name,
    emoji: item.emoji,
    radius: radius * 0.55,
    archetype: item.archetype,
    points: item.points,
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    color: item.color || '#94a3b8',
    warning: item.warning || '',
    help: item.help || '',
    bonusType: item.bonus || null,
    val: item.val || 0,
    pulseSpeed: Math.random() * 0.05 + 0.02,
    pulseVal: 0,
    spin: (Math.random() - 0.5) * 0.04,
    angle: Math.random() * Math.PI,
    lifetime: 10 + Math.random() * 8, // auto-fade seconds
    birth: Date.now()
  };

  gameObjects.push(targetObj);
}

// Master Scheduler triggers spawning intervals depending on game timeline
function adjustSpawnerIntervals() {
  // Clear any existing spawner intervals
  state.spawnerIds.forEach(id => clearInterval(id));
  state.spawnerIds = [];

  const timeElapsed = 300 - state.timeLeft;
  let garbageRate = 1600; // ms
  let natureRate = 4000;
  let bonusRate = 12000;

  // Core Progression Curve mapping
  if (timeElapsed < 60) {
    // Stage 1 (Min 1): slow, onboarding
    garbageRate = 1800;
    natureRate = 6000;
  } 
  else if (timeElapsed < 120) {
    // Stage 2 (Min 2): medium speed, active garbage
    garbageRate = 1400;
    natureRate = 4500;
    bonusRate = 10000;
  } 
  else if (timeElapsed < 180) {
    // Stage 3 (Min 3): toxic garbage
    garbageRate = 1200;
    natureRate = 3500;
  } 
  else if (timeElapsed < 240) {
    // Stage 4 (Min 4): high action nature items appear
    garbageRate = 1000;
    natureRate = 2800;
    bonusRate = 9000;
  } 
  else {
    // Stage 5 (Min 5): garbage boss throws projectiles + fast spawns
    garbageRate = 800;
    natureRate = 2400;
    bonusRate = 8000;
    
    // Summon boss on final 45 seconds if normal mode
    if (state.timeLeft <= 45 && !state.bossActive && state.activeMode === 'normal') {
      triggerBossArrival();
    }
  }

  // Create active loop threads
  state.spawnerIds.push(setInterval(() => {
    if (!state.isPaused) spawnCustomTarget(ARCHETYPE_GARBAGE);
  }, garbageRate));

  state.spawnerIds.push(setInterval(() => {
    if (!state.isPaused) spawnCustomTarget(ARCHETYPE_NATURE);
  }, natureRate));

  state.spawnerIds.push(setInterval(() => {
    if (!state.isPaused) spawnCustomTarget(ARCHETYPE_BONUS);
  }, bonusRate));
}

function triggerBossArrival() {
  state.bossActive = true;
  state.bossHp = 500;
  state.bossMaxHp = 500;
  state.bossX = canvas.width / 2;
  state.bossY = 160;
  state.bossDir = 1;

  playSound('boss-defeat');
  triggerToastNotification("⚠️ WARNING: THE GIANT WASTE MONSTER HAS REVEALED HERSELF! DEFEAT HER FAST!");

  // Show boss HP panel
  const bossHud = document.getElementById('boss-hud');
  if (bossHud) {
    bossHud.classList.remove('opacity-0');
    bossHud.classList.add('scale-100');
  }
}

// ==========================================
// 9. ANIMATION, LAUNCHERS & RENDER ENGINE
// ==========================================

function updateGameObjects() {
  const now = Date.now();

  // Draw & update laser triggers
  for (let i = lasers.length - 1; i >= 0; i--) {
    let l = lasers[i];
    l.alpha -= 0.15;
    if (l.alpha <= 0) {
      lasers.splice(i, 1);
    }
  }

  // Draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;

    if (p.isLeaf) {
      p.angle += p.spin;
      p.vy += 0.05; // light weight downward drag
    }

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // Draw floating scores
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let t = floatingTexts[i];
    t.y -= 1.2;
    t.life -= 0.016;
    if (t.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }

  // Draw running garbage/nature collection
  for (let i = gameObjects.length - 1; i >= 0; i--) {
    let obj = gameObjects[i];
    
    // Apply position updates
    obj.x += obj.vx;
    obj.y += obj.vy;
    obj.pulseVal += obj.pulseSpeed;
    obj.angle += obj.spin;

    // Bounce check off borders
    if (obj.x - obj.radius < 0 || obj.x + obj.radius > canvas.width) {
      obj.vx *= -1;
      obj.x = obj.x < obj.radius ? obj.radius : canvas.width - obj.radius;
    }

    // Bounce off bottom boundaries or auto-clean
    if (obj.y - obj.radius > canvas.height) {
      // Clean missed elements safely
      gameObjects.splice(i, 1);
      continue;
    }

    // Check expiry to keep memory lightweight
    if (now - obj.birth > obj.lifetime * 1000) {
      gameObjects.splice(i, 1);
    }
  }

  // Animate Boss movement
  if (state.bossActive) {
    state.bossX += state.bossSpeed * state.bossDir;
    
    // Boundary collision
    if (state.bossX - 100 < 50 || state.bossX + 100 > canvas.width - 50) {
      state.bossDir *= -1;
    }

    // Throw rubbish projectiles sequentially
    if (Math.random() < 0.04) {
      spawnCustomTarget(ARCHETYPE_GARBAGE, null, state.bossX, state.bossY + 60);
    }
  }

  // Double score counter ticks
  if (state.doublePointsTimer > 0) {
    state.doublePointsTimer = Math.max(0, state.doublePointsTimer - 0.016);
  }
}

function processRenderFrame() {
  if (!ctx || state.activeScreen !== 'game') return;

  // Draw space landscape background representing environment status
  renderStaticEnvironment();

  // Draw Lasers
  lasers.forEach(l => {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.lineCap = 'round';
    ctx.globalAlpha = l.alpha;
    
    // Beam trace shadow
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.moveTo(l.startX, l.startY);
    ctx.lineTo(l.endX, l.endY);
    ctx.stroke();
    
    ctx.shadowBlur = 0; // reset
    ctx.globalAlpha = 1.0;
  });

  // Draw Game Moving Targets
  gameObjects.forEach(obj => {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.angle);

    // Apply scale pulsing effects
    let scale = 1 + Math.sin(obj.pulseVal) * 0.05;
    ctx.scale(scale, scale);

    // Dynamic gradient neon glow circle border
    ctx.shadowColor = obj.color;
    ctx.shadowBlur = 15;
    
    ctx.fillStyle = 'rgba(10, 16, 36, 0.72)';
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Draw central target emojis
    ctx.font = `${obj.radius * 1.05}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.emoji, 0, 1.5);

    ctx.restore();
  });

  // Draw Boss Monster in Arena
  if (state.bossActive) {
    renderWasteBoss();
  }

  // Draw Particles explosion bursts
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;

    if (p.isLeaf) {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      // Draw small leafy rhombic shape
      ctx.beginPath();
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(p.radius * 0.6, 0);
      ctx.lineTo(0, p.radius);
      ctx.lineTo(-p.radius * 0.6, 0);
      ctx.closePath();
      ctx.fill();
    } 
    else if (p.isSmoke) {
      // Draw fluffy smoke
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    } 
    else {
      // Standard spark
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // Draw Floating Score texts
  floatingTexts.forEach(t => {
    ctx.save();
    ctx.globalAlpha = t.life;
    ctx.fillStyle = t.color;
    ctx.font = 'bold 16px font-mono, sans-serif';
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });

  // Draw AIM crosshair coordinates overlay (smooth tracker)
  let crossX = state.mouseMode ? state.mouseX : state.trackedAimX;
  let crossY = state.mouseMode ? state.mouseY : state.trackedAimY;

  renderCrosshairPointer(crossX, crossY);

  // Restart canvas framework inside next RAF tick
  if (!state.isPaused) {
    state.gameLoopId = requestAnimationFrame(processRenderFrame);
    updateGameObjects();
  }
}

function renderStaticEnvironment() {
  // Low score paints grey smoke grids
  // High score shines turquoise sunny clears
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  
  // Transition gradient coordinates depending on active pollutionSeverity state
  if (state.pollutionSeverity > 70) {
    // Polluted (Dull Greyish Purple)
    grd.addColorStop(0, '#02030d');
    grd.addColorStop(0.5, '#13111c');
    grd.addColorStop(1, '#1b1416');
  } 
  else if (state.pollutionSeverity > 35) {
    // Healing (Clean Deep Blue)
    grd.addColorStop(0, '#030712');
    grd.addColorStop(0.5, '#04101e');
    grd.addColorStop(1, '#022c22');
  } 
  else {
    // Eco Paradise (Neon Sunbeams)
    grd.addColorStop(0, '#020e17');
    grd.addColorStop(0.5, '#05231c');
    grd.addColorStop(1, '#064e3b');
  }

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw environment indicator details (sun beams/smog clouds)
  if (state.pollutionSeverity > 60) {
    // Draw thick background smoke layers
    ctx.fillStyle = 'rgba(75, 85, 99, 0.08)';
    for (let s = 1; s <= 4; s++) {
      ctx.beginPath();
      ctx.arc((canvas.width * 0.2) * s, canvas.height * 0.82, 180, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Draw clean background glowing sun rays
    ctx.save();
    ctx.globalAlpha = 0.03 + (100 - state.pollutionSeverity) * 0.0015;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height);
    ctx.lineTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function renderWasteBoss() {
  ctx.save();
  ctx.translate(state.bossX, state.bossY);

  // Floating bounce animation rhythm
  let offset = Math.sin(Date.now() * 0.004) * 8;
  ctx.translate(0, offset);

  // Giant core sphere structure
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 24;
  ctx.fillStyle = 'rgba(28, 25, 23, 0.95)';
  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = 6;

  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Eyes (Two glowing neon yellow centers)
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-26, -15, 14, 0, Math.PI * 2);
  ctx.arc(26, -15, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-26, -15, 5, 0, Math.PI * 2);
  ctx.arc(26, -15, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Mouth (Spam jagged edges)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-40, 25);
  ctx.lineTo(-20, 35);
  ctx.lineTo(0, 25);
  ctx.lineTo(20, 35);
  ctx.lineTo(40, 25);
  ctx.stroke();

  // Floating decorative warning labels
  ctx.font = 'bold 15px font-sans, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText("♻️ POLLUTION SLIME", 0, -100);

  ctx.restore();
}

function renderCrosshairPointer(x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Pulsing diameter rotation indicator lines
  let pulse = 1 + Math.sin(Date.now() * 0.01) * 0.08;
  let baseR = 24 * pulse;

  // Rotate ring slowly
  ctx.rotate((Date.now() * 0.001) % (Math.PI * 2));

  // Determine pointer color status
  let clr = '#10b981'; // normal Ready Green
  if (state.shieldActive) clr = '#06b6d4'; // Shield Cyan
  if (Date.now() - state.lastShotTime < config.cooldown) clr = '#a7f3d0'; // Charging mint

  ctx.strokeStyle = clr;
  ctx.shadowColor = clr;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.5;

  // Outer segmented target brackets
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 0.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, baseR, Math.PI * 0.5, Math.PI * 0.8);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, baseR, Math.PI, Math.PI * 1.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, baseR, Math.PI * 1.5, Math.PI * 1.8);
  ctx.stroke();

  // Draw inner solid locks
  ctx.fillStyle = clr;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Calibration circle helper grids
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = clr;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// ==========================================
// 10. SYSTEM TELEMETRY, HUD & ALERTS
// ==========================================

function createFloatingText(x, y, txt, clr) {
  floatingTexts.push({
    x: x,
    y: y,
    text: txt,
    color: clr,
    life: 1.0
  });
}

function syncGameHUD() {
  document.getElementById('hud-score').innerText = String(state.score).padStart(4, '0');
  document.getElementById('hud-cleaned').innerText = state.cleanedCount;
  
  // Accuracy percentage mapping
  let acc = 100;
  if (state.totalShots > 0) {
    acc = Math.round((state.hits / state.totalShots) * 100);
  }
  document.getElementById('hud-accuracy').innerText = `${acc}%`;

  // Draw Combo states
  const listComboVal = document.getElementById('hud-combo');
  const barCombo = document.getElementById('combo-progressbar');
  
  if (listComboVal && barCombo) {
    listComboVal.innerText = `x${state.comboHits}`;
    // Segmented layout width: every 10 is max. Represent progress to next level
    let perc = (state.comboHits % 10) * 10;
    if (state.comboHits > 0 && state.comboHits % 10 === 0) perc = 100;
    barCombo.style.width = `${perc}%`;
  }
}

function triggerToastNotification(str) {
  const toast = document.getElementById('eco-toast');
  const txt = document.getElementById('eco-toast-text');
  if (!toast || !txt) return;

  txt.innerText = str;
  toast.className = "absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-slate-950/92 border border-slate-800 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xl transition-all duration-300 translate-y-0 opacity-100";
  
  setTimeout(() => {
    toast.className = "absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-slate-950/92 border border-slate-800 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xl transition-all duration-300 translate-y-12 opacity-0";
  }, 4400);
}

function triggerNatureWarningFlash(str) {
  const overlay = document.getElementById('nature-warning');
  const txt = document.getElementById('nature-warning-txt');
  if (!overlay || !txt) return;

  txt.innerText = `⚠️ PENALTY: ${str}`;
  overlay.style.boxShadow = "inset 0 0 40px rgba(239, 68, 68, 0.4)";
  txt.className = "px-6 py-2.5 rounded-xl bg-rose-950 border border-rose-500/30 text-rose-400 font-bold text-lg select-none uppercase tracking-wider scale-100 opacity-100 transition-all duration-200 shadow-xl";

  setTimeout(() => {
    overlay.style.boxShadow = "none";
    txt.className = "px-6 py-2.5 rounded-xl bg-rose-950 border border-rose-500/30 text-rose-400 font-bold text-lg select-none uppercase tracking-wider scale-90 opacity-0 transition-all duration-200 shadow-xl";
  }, 1400);
}

// ==========================================
// 11. TIMERS, MODES & STATE ROUTING
// ==========================================

function loadHighScores() {
  const topScore = localStorage.getItem('eco_top_score') || '0';
  const topClean = localStorage.getItem('eco_top_cleaned') || '0';
  const topRank = localStorage.getItem('eco_top_rank') || 'Eco Rookie';

  document.getElementById('best-score').innerText = topScore;
  document.getElementById('total-cleaned').innerText = topClean;
  document.getElementById('best-rank').innerText = topRank;
}

function saveHighScores() {
  const currentTop = parseInt(localStorage.getItem('eco_top_score') || '0');
  const currentCleaned = parseInt(localStorage.getItem('eco_top_cleaned') || '0');
  
  // Calculate best badge rank
  const finalBadge = queryEarnedRankBadge(state.score);

  if (state.score > currentTop) {
    localStorage.setItem('eco_top_score', state.score);
    localStorage.setItem('eco_top_rank', finalBadge.name);
  }
  
  localStorage.setItem('eco_top_cleaned', currentCleaned + state.cleanedCount);
}

function queryEarnedRankBadge(score) {
  return BADGES.find(b => score >= b.minScore && score <= b.maxScore) || BADGES[0];
}

function handleSceneRoute(screenId) {
  // Hide all screens
  document.getElementById('screen-landing').classList.add('hidden');
  document.getElementById('screen-gesture-guide').classList.add('hidden');
  document.getElementById('screen-camera-setup').classList.add('hidden');
  document.getElementById('screen-game').classList.add('hidden');
  document.getElementById('screen-result').classList.add('hidden');

  // Activate specific screen
  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.remove('hidden');
    state.activeScreen = screenId;
  }

  // Hook background camera listeners on setup page
  if (screenId === 'camera-setup') {
    startCameraSource();
  }

  // Handle gameplay setups
  if (screenId === 'game') {
    startGameCoreEngine();
  } else {
    // Clear spawner and clocks
    clearInterval(state.countdownId);
    state.spawnerIds.forEach(id => clearInterval(id));
  }
}

function startGameCoreEngine() {
  initAudio();
  playSound('bonus');

  // Sync parameters
  state.score = 0;
  state.naturePenalties = 0;
  state.cleanedCount = 0;
  state.hits = 0;
  state.misses = 0;
  state.totalShots = 0;
  state.comboLevel = 0;
  state.comboHits = 0;
  state.shieldActive = false;
  state.doublePointsTimer = 0;
  state.bossActive = false;
  state.isPaused = false;
  state.currentTime = 0;

  gameObjects = [];
  particles = [];
  lasers = [];
  floatingTexts = [];

  // Set default 5-minute arcade standard countdown
  state.timeLeft = 300; 
  document.getElementById('hud-timer').innerText = "05:00";
  if (document.getElementById('timer-progress')) {
    document.getElementById('timer-progress').style.width = '100%';
  }
  
  // Launch standard 1s ticking alarm clock
  state.countdownId = setInterval(() => {
    if (!state.isPaused) {
      state.timeLeft--;
      syncTimerCountdownDisplay();
      
      // Randomly trigger tip toasting banners every 28 seconds
      if (state.timeLeft > 0 && state.timeLeft % 28 === 0) {
        const randomTip = ECO_TIPS[Math.floor(Math.random() * ECO_TIPS.length)];
        triggerToastNotification(randomTip);
      }

      if (state.timeLeft <= 0) {
        terminateSimulation(true);
      }
    }
  }, 1000);

  // Apply calibration settings to sizing
  syncTimerCountdownDisplay();
  resizeCanvas();

  // Build spawner clocks
  adjustSpawnerIntervals();

  // Run initial animation RAF thread
  cancelAnimationFrame(state.gameLoopId);
  state.isPaused = false;
  state.gameLoopId = requestAnimationFrame(processRenderFrame);

  syncGameHUD();
}

function syncTimerCountdownDisplay() {
  const mins = String(Math.floor(state.timeLeft / 60)).padStart(2, '0');
  const secs = String(state.timeLeft % 60).padStart(2, '0');
  const domTimer = document.getElementById('hud-timer');
  const container = document.getElementById('hud-timer-container');
  
  if (domTimer) domTimer.innerText = `${mins}:${secs}`;
  
  // Progress bar ticks
  const progressRatio = (state.timeLeft / 300) * 100;
  document.getElementById('timer-progress').style.width = `${progressRatio}%`;

  // Warning flashing trigger below 30s
  if (state.timeLeft <= 30) {
    container.classList.add('border-rose-500', 'bg-rose-950/20', 'animate-pulse');
    domTimer.classList.add('text-rose-400');
  } else {
    container.classList.remove('border-rose-500', 'bg-rose-950/20', 'animate-pulse');
    domTimer.classList.remove('text-rose-400');
  }
}

function togglePause(forcedState = null) {
  state.isPaused = forcedState !== null ? forcedState : !state.isPaused;
  const overlay = document.getElementById('hud-pause-overlay');
  const txt = document.getElementById('txt-pause');

  if (state.isPaused) {
    overlay.classList.remove('hidden');
    if (txt) txt.innerText = "▶️ Resume";
    cancelAnimationFrame(state.gameLoopId);
  } else {
    overlay.classList.add('hidden');
    if (txt) txt.innerText = "⏸️ Pause";
    initAudio();
    state.gameLoopId = requestAnimationFrame(processRenderFrame);
  }
}

function terminateSimulation(normalCompletion, earthHit = false) {
  // Save scores
  saveHighScores();
  loadHighScores();

  // Sound completion alert
  if (earthHit) {
    playSound('hit-wrong');
  } else {
    playSound('boss-defeat');
  }

  // Halt engines
  clearInterval(state.countdownId);
  state.spawnerIds.forEach(id => clearInterval(id));
  cancelAnimationFrame(state.gameLoopId);

  // Sync result calculations
  const finalBadge = queryEarnedRankBadge(state.score);
  
  document.getElementById('res-score').innerText = String(state.score).padStart(4, '0');
  document.getElementById('res-cleaned').innerText = `${state.cleanedCount} Items`;
  document.getElementById('res-combo').innerText = `Max x${state.comboHits}`;
  document.getElementById('res-penalties').innerText = `${state.naturePenalties || 0} ${state.naturePenalties === 1 ? 'Hit' : 'Hits'}`;
  
  let acc = 100;
  if (state.totalShots > 0) {
    acc = Math.round((state.hits / state.totalShots) * 100);
  }
  document.getElementById('res-accuracy').innerText = `${acc}%`;

  const headerEl = document.getElementById('result-header');
  const subheaderEl = document.getElementById('result-subheader');
  const iconEl = document.getElementById('result-icon');
  const rankEl = document.getElementById('result-rank');
  const rankDescEl = document.getElementById('result-rank-desc');

  if (earthHit) {
    if (headerEl) {
      headerEl.innerText = "Earth Destroyed!";
      headerEl.style.color = "#f43f5e";
    }
    if (subheaderEl) {
      subheaderEl.innerText = "GAME OVER: Hitting the planet is strictly forbidden!";
      subheaderEl.style.color = "#fda4af";
    }
    if (iconEl) {
      iconEl.innerText = "🚨";
    }
    if (rankEl) {
      rankEl.innerText = "PLANET VANDAL";
      rankEl.style.color = "#f43f5e";
    }
    if (rankDescEl) {
      rankDescEl.innerText = "The life on our home planet Earth collapsed because space lasers targeted it. Always focus exclusively on cleaning rubbish, and spare original life forms!";
    }
  } else {
    // Standard normal game completion
    if (headerEl) {
      headerEl.innerText = "Simulation Completed!";
      headerEl.style.color = ""; // dynamic gradient defined in html
    }
    if (subheaderEl) {
      subheaderEl.innerText = "You helped clean the planet!";
      subheaderEl.style.color = "";
    }
    if (iconEl) {
      iconEl.innerText = "🏆";
    }
    if (rankEl) {
      rankEl.innerText = `${finalBadge.emoji} ${finalBadge.name}`;
      rankEl.style.color = "";
    }

    // Direct descriptions of eco cognitive tiers
    let rankDesc = "Keep practicing! Protect nature trees and dispose of chips packages inside recycling grids to escalate score.";
    if (state.score > 300) rankDesc = "Good work! You are developing solid reflexive eco-cognitive timing. Aim more efficiently to lower misses.";
    if (state.score > 700) rankDesc = "Excellent shooting metrics! You defended wetlands, avoided flower blooms, and cleaned toxic waste like a professional.";
    if (state.score > 1200) rankDesc = "Fabulous! You cleanly neutralized mini-waste slimes and unlocked multiple recycle shields with Fist gestures.";
    if (state.score > 2000) rankDesc = "Legendary Guardian! The entire forest is breathing clear, sunny skygrids now. You defeated the heavy Waste Boss with master level speed!";
    
    if (rankDescEl) {
      rankDescEl.innerText = rankDesc;
    }
  }

  // View screen
  handleSceneRoute('result');
}

// ==========================================
// 12. CALIBRATION PANEL INPUTS CONTROLS
// ==========================================

function initCalibrationSettings() {
  // Load configuration from local registry if present
  const localConfig = localStorage.getItem('eco_shot_config');
  if (localConfig) {
    try {
      config = { ...config, ...JSON.parse(localConfig) };
    } catch(e) {}
  }

  // Setup initial sliders values
  document.getElementById('slider-cooldown').value = config.cooldown;
  document.getElementById('val-cooldown').innerText = `${config.cooldown}ms`;
  
  document.getElementById('slider-size').value = config.targetSize;
  document.getElementById('val-size').innerText = config.targetSize > 100 ? 'Extra Large' : (config.targetSize < 80 ? 'Small' : 'Standard Large');
  
  document.getElementById('slider-smoothing').value = config.smoothing;
  document.getElementById('val-smoothing').innerText = config.smoothing.toFixed(2);
  
  if (config.sensitivity === undefined) {
    config.sensitivity = 0.70;
  }
  document.getElementById('slider-sensitivity').value = config.sensitivity;
  document.getElementById('val-sensitivity').innerText = `${config.sensitivity.toFixed(2)}x`;
  
  document.getElementById('diag-smooth').innerText = `${config.smoothing} (Interpolated LERP)`;
  document.getElementById('val-mirror').innerText = config.mirror ? 'ON' : 'OFF';

  // Slider events listener
  document.getElementById('slider-cooldown').addEventListener('input', e => {
    config.cooldown = parseInt(e.target.value);
    document.getElementById('val-cooldown').innerText = `${config.cooldown}ms`;
  });

  document.getElementById('slider-size').addEventListener('input', e => {
    config.targetSize = parseInt(e.target.value);
    document.getElementById('val-size').innerText = config.targetSize > 100 ? 'Extra Large' : (config.targetSize < 80 ? 'Small' : 'Standard Large');
  });

  document.getElementById('slider-smoothing').addEventListener('input', e => {
    config.smoothing = parseFloat(e.target.value);
    document.getElementById('val-smoothing').innerText = config.smoothing.toFixed(2);
  });

  document.getElementById('slider-sensitivity').addEventListener('input', e => {
    config.sensitivity = parseFloat(e.target.value);
    document.getElementById('val-sensitivity').innerText = `${config.sensitivity.toFixed(2)}x`;
  });

  // Toggles mirror
  document.getElementById('btn-toggle-mirror').addEventListener('click', () => {
    config.mirror = !config.mirror;
    document.getElementById('val-mirror').innerText = config.mirror ? 'ON' : 'OFF';
  });

  // Toggle enhance filter override
  document.getElementById('btn-toggle-filter').addEventListener('click', () => {
    config.nightEnhance = !config.nightEnhance;
    const filterBtn = document.getElementById('btn-toggle-filter');
    const displayVal = document.getElementById('val-gain');
    const overlayCanvas = document.getElementById('camera-overlay-canvas');

    if (config.nightEnhance) {
      filterBtn.classList.add('bg-cyan-950', 'text-cyan-400', 'border-cyan-500/40');
      displayVal.innerText = "Night Contrast Active";
      if (overlayCanvas) overlayCanvas.style.filter = "brightness(1.25) contrast(1.3)";
    } else {
      filterBtn.classList.remove('bg-cyan-950', 'text-cyan-400', 'border-cyan-500/40');
      displayVal.innerText = "Default (Off)";
      if (overlayCanvas) overlayCanvas.style.filter = "none";
    }
  });

  // Reset defaults
  document.getElementById('btn-reset-calibration').addEventListener('click', () => {
    config = {
      mirror: true,
      cooldown: 250,
      targetSize: 90,
      smoothing: 0.35,
      confidenceThreshold: 0.5,
      nightEnhance: false,
      sensitivity: 0.70
    };
    initCalibrationSettings();
    localStorage.removeItem('eco_shot_config');
    createFloatingText(canvas ? canvas.width/2 : 200, canvas ? canvas.height/2 : 200, "RESET DEFAULTS", "#f43f5e");
  });

  // Save Settings
  document.getElementById('btn-save-calibration').addEventListener('click', () => {
    localStorage.setItem('eco_shot_config', JSON.stringify(config));
    
    // Auto sync back camera options if active
    if (mediaPipeHands) {
      mediaPipeHands.setOptions({
        minDetectionConfidence: config.confidenceThreshold,
        minTrackingConfidence: config.confidenceThreshold
      });
    }

    // Slide out
    document.getElementById('calibration-sidebar').classList.add('translate-x-full');
  });
}

// ==========================================
// 13. USER INTERFACES & KEYBOARD EVENTS Bindings
// ==========================================

function setupInterfaceListeners() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');

  // Route screen click handlers
  // Main start transitions
  document.getElementById('btn-start-game').addEventListener('click', () => {
    initAudio();
    state.activeMode = 'normal';
    handleSceneRoute('camera-setup');
  });

  document.getElementById('btn-view-guide').addEventListener('click', () => {
    handleSceneRoute('guide');
  });

  document.getElementById('btn-close-guide').addEventListener('click', () => {
    handleSceneRoute('landing');
  });

  document.getElementById('btn-cam-proceed').addEventListener('click', () => {
    handleSceneRoute('game');
  });

  document.getElementById('btn-cam-back').addEventListener('click', () => {
    stopCameraSource();
    handleSceneRoute('landing');
  });

  // Force mouse fallback immediately if camera unavailable
  document.getElementById('btn-force-mouse-fallback').addEventListener('click', () => {
    state.mouseMode = true;
    handleSceneRoute('game');
  });

  // Open in New Tab support
  const tabBtn = document.getElementById('btn-tab-launch');
  if (tabBtn) {
    tabBtn.addEventListener('click', () => {
      window.open(window.location.href, '_blank');
    });
  }

  const deniedTabBtn = document.getElementById('btn-tab-launch-denied');
  if (deniedTabBtn) {
    deniedTabBtn.addEventListener('click', () => {
      window.open(window.location.href, '_blank');
    });
  }

  // Pause elements
  document.getElementById('btn-game-pause').addEventListener('click', () => {
    togglePause();
  });

  document.getElementById('btn-paused-resume').addEventListener('click', () => {
    togglePause(false);
  });

  document.getElementById('btn-paused-quit').addEventListener('click', () => {
    togglePause(false);
    stopCameraSource();
    handleSceneRoute('landing');
  });

  document.getElementById('btn-game-restart').addEventListener('click', () => {
    if (confirm("Restart current ecological simulation? Progress will be reset.")) {
      startGameCoreEngine();
    }
  });

  // Result menus
  document.getElementById('btn-result-replay').addEventListener('click', () => {
    handleSceneRoute('game');
  });

  document.getElementById('btn-result-home').addEventListener('click', () => {
    stopCameraSource();
    handleSceneRoute('landing');
  });

  // Calibration launcher
  document.getElementById('btn-toggle-hud').addEventListener('click', () => {
    document.getElementById('calibration-sidebar').classList.remove('translate-x-full');
  });

  document.getElementById('btn-calibrate-quick').addEventListener('click', () => {
    document.getElementById('calibration-sidebar').classList.remove('translate-x-full');
  });

  document.getElementById('btn-close-calibration').addEventListener('click', () => {
    document.getElementById('calibration-sidebar').classList.add('translate-x-full');
  });

  // Fullscreen support
  const fullBtn = document.getElementById('btn-fullscreen-landing');
  if (fullBtn) {
    fullBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen permission rejected: ", err);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }

  // MOUSE CONTROLLER EVENTS
  canvas.addEventListener('mousemove', e => {
    if (!state.mouseMode) return;
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', e => {
    if (!state.mouseMode || state.isPaused) return;
    // Trigger direct mouse fire!
    shoot(state.mouseX, state.mouseY);
  });

  // KEYBOARD KEYBOARD FALLBACK COMPLIANCE
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    
    // Space to shoot (keyboard trigger)
    if (e.key === ' ' || key === 'spacebar') {
      if (state.activeScreen === 'game' && !state.isPaused) {
        let cx = state.mouseMode ? state.mouseX : state.trackedAimX;
        let cy = state.mouseMode ? state.mouseY : state.trackedAimY;
        shoot(cx, cy);
      }
      e.preventDefault();
    }
    
    // R key to restart
    if (key === 'r' && state.activeScreen === 'game') {
      startGameCoreEngine();
    }
    
    // P key to pause
    if (key === 'p' && state.activeScreen === 'game') {
      togglePause();
    }
    
    // F key to fullscreen
    if (key === 'f') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
      } else {
        document.exitFullscreen();
      }
    }
  });

  // Window resize listeners
  window.addEventListener('resize', resizeCanvas);
}

// Initializer core
window.addEventListener('DOMContentLoaded', () => {
  setupInterfaceListeners();
  initCalibrationSettings();
  loadHighScores();
});
