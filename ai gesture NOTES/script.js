/**
 * Air Writing Notes - Main Script
 * Controls camera access, MediaPipe Hands tracking, gesture heuristics,
 * coordinate smoothing, canvas rendering, and notebook state management.
 */

// --- Global Error Diagnostics (Catch and display all errors in on-screen console) ---
window.addEventListener('error', (event) => {
  const shortSource = event.filename ? event.filename.split('/').pop() : 'unknown';
  logToConsole(`JS Error: ${event.message} (${shortSource}:${event.lineno})`, 'warning');
});
window.addEventListener('unhandledrejection', (event) => {
  logToConsole(`Promise Error: ${event.reason}`, 'warning');
});

// --- Constants & Config ---
const GESTURE_COOLDOWN_MS = 1200; // Cooldown for spaces & deletes (in ms)
const VELOCITY_THRESHOLD = 15;    // Threshold to ignore tiny jittery movements
const MIN_STROKE_POINTS = 5;      // Min points in a stroke to count as valid
const MIN_STROKE_PATH_LENGTH = 20; // Min physical length of strokes in pixels

// Dynamic Recognition Timeouts
const IDLE_RECOGNITION_DELAY = 5000; // 5.0 seconds when hand is hovering/idle in frame
const LEAVE_RECOGNITION_DELAY = 1500; // 1.5 seconds when hand leaves frame (faster finalization)

// Dynamic Smoothing (Velocity-based EMA)
const MIN_SMOOTHING_FACTOR = 0.06; // Strong filter (heavy smoothing) for slow/tremor movements
const MAX_SMOOTHING_FACTOR = 0.38; // High response (less smoothing) for fast strokes
const MAX_SMOOTHING_SPEED = 0.025; // Speed at which MAX_SMOOTHING_FACTOR is fully applied

// --- State Variables ---
let hands = null;
let webcamStream = null;
let animationFrameId = null;
let isTracking = false;
let modelLoaded = false;

// Drawing & Stroke tracking
let currentStroke = [];
let strokeHistory = [];
let lastX = null;
let lastY = null;
let isWriting = false;
let lastStrokeTime = 0; // Timestamp of the last active stroke update
let isHandInFrame = false; // Tracks if a hand is currently detected in frame

// Timers & Cooldowns
let recognitionTimer = null;
let currentTimerDelay = null;
let lastActiveGesture = "None";

// Gesture State Counters & Flags for stable trigger-once classification (bypasses timeout cooldown bugs)
let spaceGestureFrames = 0;
let deleteGestureFrames = 0;
let fontCycleGestureFrames = 0;

let spaceTriggered = false;
let deleteTriggered = false;
let fontCycleTriggered = false;

const ACTION_TRIGGER_FRAMES_LIMIT = 12; // Increased to 12 frames (approx 400ms) for deliberate activations

// Note Editor & History
let actionHistory = []; // Stack of { type: 'word'|'space', value: string }
let lastSuggestions = [];

// Font Styles configurations (10 premium layouts cycled via 3-finger gesture)
const FONT_STYLES = [
  { name: "Modern Sans", family: "'Outfit', sans-serif", size: "1.05rem", lineSpacing: "28px" },
  { name: "Cursive Ink", family: "'Caveat', cursive", size: "1.45rem", lineSpacing: "28px" },
  { name: "Draft Typewriter", family: "'Courier Prime', monospace", size: "1.15rem", lineSpacing: "28px" },
  { name: "Indie Sketch", family: "'Patrick Hand', cursive", size: "1.35rem", lineSpacing: "28px" },
  { name: "Retro Terminal", family: "'JetBrains Mono', monospace", size: "1.05rem", lineSpacing: "28px" },
  { name: "Editorial Serif", family: "'Playfair Display', serif", size: "1.10rem", lineSpacing: "28px" },
  { name: "Architect Script", family: "'Architects Daughter', cursive", size: "1.15rem", lineSpacing: "28px" },
  { name: "Elegant Flourish", family: "'Sacramento', cursive", size: "1.65rem", lineSpacing: "28px" },
  { name: "Vintage Press", family: "'Special Elite', monospace", size: "1.10rem", lineSpacing: "28px" },
  { name: "Bouncy Cursive", family: "'Dancing Script', cursive", size: "1.35rem", lineSpacing: "28px" }
];
let currentFontIndex = 0;
let fontCooldownActive = false;
let fontCooldownTimeout = null;

// --- DOM Elements ---
const webcamElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas-overlay');
const ctx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('camera-loading');
const gestureOverlayIcon = document.getElementById('gesture-overlay-icon');

// Buttons
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnExport = document.getElementById('btn-export');
const btnClearConsole = document.getElementById('btn-clear-console');

// Info & Stats
const cameraBadge = document.getElementById('camera-badge');
const statusBadge = document.getElementById('status-badge');
const statusDesc = document.getElementById('status-desc');
const statGesture = document.getElementById('stat-gesture');
const statConfidence = document.getElementById('stat-confidence');
const suggestionsList = document.getElementById('suggestions-list');
const consoleOutput = document.getElementById('console-output');
const noteEditor = document.getElementById('note-editor');
const charCountSpan = document.getElementById('char-count');
const wordCountSpan = document.getElementById('word-count');
const saveStatusDiv = document.getElementById('save-status');

// Guide Items (for lighting up gestures in guide)
const guideItems = {
  write: document.getElementById('guide-write'),
  space: document.getElementById('guide-space'),
  delete: document.getElementById('guide-delete'),
  pause: document.getElementById('guide-pause'),
  font: document.getElementById('guide-font'),
};

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  logToConsole("Initializing App state...", "system");
  
  // Set canvas size to display size
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load notes from localstorage
  loadNotesFromStorage();

  // Load and apply cached font style
  loadFontFromStorage();

  // Button Listeners
  btnStart.addEventListener('click', startTracking);
  btnStop.addEventListener('click', stopTracking);
  btnUndo.addEventListener('click', triggerUndo);
  btnClear.addEventListener('click', clearNotebook);
  btnExport.addEventListener('click', exportNotes);
  btnClearConsole.addEventListener('click', () => {
    consoleOutput.innerHTML = '';
    logToConsole("Console cleared.", "system");
  });

  // Editor Listener (manual changes)
  noteEditor.addEventListener('input', () => {
    updateCounters();
    saveNotesToStorageManual();
  });

  // Init MediaPipe Hands
  initMediaPipe();
}

/**
 * Initializes the MediaPipe Hands model
 */
function initMediaPipe() {
  try {
    if (typeof Hands === 'undefined') {
      logToConsole("MediaPipe Hands library not loaded! 'Hands' is undefined.", "warning");
      return;
    }

    hands = new Hands({
      locateFile: (file) => {
        // Force standard WASM binaries instead of SIMD to guarantee compatibility across all browsers/CPUs
        let targetFile = file;
        if (file.includes('simd')) {
          targetFile = file.replace('simd_', '');
        }
        // Use absolute URL to resolve correctly inside Web Workers/Blobs
        const absoluteUrl = `${window.location.origin}/lib/mediapipe/${targetFile}`;
        return absoluteUrl;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // Lite model for faster processing (higher framerate)
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    hands.onResults(onHandResults);
    logToConsole("MediaPipe Hands initialized locally.", "success");
  } catch (err) {
    logToConsole("Failed to initialize MediaPipe Hands: " + err.message, "warning");
  }
}

// --- Camera & Loop Controls ---

async function startTracking() {
  if (isTracking) return;

  logToConsole("Requesting camera permissions...", "info");
  loadingOverlay.style.display = "flex";
  btnStart.disabled = true;

  try {
    // Basic bulletproof constraint to prevent any resolution/facingMode rejection
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    // 1. Attach listener BEFORE setting srcObject to avoid race conditions
    webcamElement.onloadedmetadata = () => {
      // Set explicit resolution on video element for MediaPipe processing
      webcamElement.width = 640;
      webcamElement.height = 480;

      webcamElement.play().then(() => {
        if (!isTracking) {
          isTracking = true;
          btnStop.disabled = false;
          logToConsole("Camera active. Processing frames...", "info");
          tick();
        }
      }).catch(err => {
        logToConsole(`Failed to start video play: ${err.message}`, "warning");
      });
    };

    webcamElement.srcObject = webcamStream;

    // 2. Safety check: if readyState is already loaded, play directly
    if (webcamElement.readyState >= 2) {
      webcamElement.width = 640;
      webcamElement.height = 480;
      webcamElement.play().then(() => {
        if (!isTracking) {
          isTracking = true;
          btnStop.disabled = false;
          logToConsole("Camera active (direct play). Processing frames...", "info");
          tick();
        }
      }).catch(() => {});
    }

  } catch (error) {
    logToConsole(`Camera access denied: ${error.message}`, "warning");
    btnStart.disabled = false;
    loadingOverlay.style.display = "none";
  }
}

function stopTracking() {
  if (!isTracking) return;

  isTracking = false;
  isProcessingFrame = false; // Reset the frame gate lock
  btnStart.disabled = false;
  btnStop.disabled = true;
  loadingOverlay.style.display = "none";
  gestureOverlayIcon.style.display = "none";

  // Stop video stream tracks
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream.srcObject = null;
  }

  // Cancel animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Reset local drawing state
  currentStroke = [];
  strokeHistory = [];
  resetSmoothing();
  clearCanvas();

  cameraBadge.className = "badge badge-error";
  cameraBadge.textContent = "Offline";

  updateStatusUI("Idle", "Camera not active", "None");
  logToConsole("Motion canvas tracking stopped.", "info");
}

let isProcessingFrame = false;
let nonWriteFramesCount = 0; // Debounce frames for ending writing mode

function tick() {
  if (!isTracking) return;

  // Process frames via requestAnimationFrame
  if (webcamElement.readyState === webcamElement.HAVE_ENOUGH_DATA) {
    // Only send the frame if the previous one has completed processing (prevents flooding worker queue)
    if (hands && !isProcessingFrame) {
      isProcessingFrame = true;
      hands.send({ image: webcamElement }).then(() => {
        isProcessingFrame = false;
      }).catch(err => {
        isProcessingFrame = false;
        console.error("MediaPipe hands send error:", err);
        logToConsole("Hands processing error: " + err.message, "warning");
      });
    }
  }

  animationFrameId = requestAnimationFrame(tick);
}

// --- MediaPipe Results Handler ---

function onHandResults(results) {
  // Hide initial loading panel once model returns its first frame
  if (!modelLoaded) {
    modelLoaded = true;
    loadingOverlay.style.display = "none";
    cameraBadge.className = "badge badge-success";
    cameraBadge.textContent = "Active";
    logToConsole("Hand tracking model loaded successfully!", "success");
  }

  // Make sure canvas resolution matches display sizes before drawing
  resizeCanvas();

  // Clear previous frame details
  clearCanvas();

  const handDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
  isHandInFrame = handDetected;
  
  if (!handDetected) {
    // No hand detected
    gestureOverlayIcon.style.display = "none";
    updateActiveGuideLight("None");
    updateStatusUI("Tracking", "No hand in frame", "None");
    
    // Reset all action gesture states when hand leaves frame
    resetActionStates();
    
    // Debounce hand-loss too before terminating stroke
    if (isWriting) {
      nonWriteFramesCount++;
      if (nonWriteFramesCount >= 5) {
        endStroke();
      }
    }
    
    // Start/maintain the timer to recognize handwriting if we have strokes
    startRecognitionTimer();
    return;
  }

  // We got a hand! Draw hand markers on canvas
  const landmarks = results.multiHandLandmarks[0];
  drawHandSkeleton(landmarks);

  // Analyze finger orientations to classify gesture
  const gesture = classifyGesture(landmarks);
  
  // Highlight currently detected gesture in the guide box
  updateActiveGuideLight(gesture);

  // Clear or maintain cooldown triggers based on gesture change
  handleGestureTransitions(gesture);

  // Perform action based on gesture
  if (gesture === "write") {
    isWriting = true;
    nonWriteFramesCount = 0; // Reset debounce frame counter
    lastStrokeTime = Date.now(); // Record writing timestamp
    
    // Reset all action gesture states since user is actively writing
    resetActionStates();
    
    // Stop the recognition timer since user is actively writing
    clearRecognitionTimer();
    
    const rawTip = landmarks[8];
    
    // Smooth coordinate trail
    const smoothed = smoothCoordinates(rawTip.x, rawTip.y);
    const canvasX = smoothed.x * canvasElement.width;
    const canvasY = smoothed.y * canvasElement.height;
    
    // Update floating tracking indicator
    updateGestureIndicator(canvasX, canvasY, "☝️");

    // Draw active circle
    drawFingertipGlow(canvasX, canvasY);

    // Record point with 5px dead-zone filter to prevent jitter clustering
    let shouldAddPoint = true;
    if (currentStroke.length > 0) {
      const lastPt = currentStroke[currentStroke.length - 1];
      const dx = canvasX - lastPt.x;
      const dy = canvasY - lastPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) { // Ignore wiggles smaller than 5 pixels (increased for more stability)
        shouldAddPoint = false;
      }
    }

    if (shouldAddPoint) {
      currentStroke.push({
        x: canvasX,
        y: canvasY,
        t: Date.now()
      });
    }

    updateStatusUI("Writing", "Writing in air...", "Write");
  } else {
    // If we were writing and transition to non-write, debounce before calling endStroke()
    if (isWriting) {
      nonWriteFramesCount++;
      if (nonWriteFramesCount >= 5) { // Needs 5 consecutive non-write frames to end
        endStroke();
      }
    }

    // Process space/delete/pause triggers with stable debounce state machine
    const isWritingCooldown = (Date.now() - lastStrokeTime) < 800;

    if (gesture === "space" && !isWritingCooldown) {
      // Reset other action states
      deleteGestureFrames = 0; deleteTriggered = false;
      fontCycleGestureFrames = 0; fontCycleTriggered = false;
      
      if (!spaceTriggered) {
        spaceGestureFrames++;
        updateStatusUI("Gesture Detected", `Fist: Holding space (${spaceGestureFrames}/${ACTION_TRIGGER_FRAMES_LIMIT})`, "Space");
        if (spaceGestureFrames >= ACTION_TRIGGER_FRAMES_LIMIT) {
          triggerSpaceGestureDirect(); // Trigger action directly
          spaceTriggered = true;
        }
      } else {
        updateStatusUI("Gesture Active", "Fist: Space triggered (release hand)", "Space");
      }
      startRecognitionTimer();
    } 
    else if (gesture === "delete" && !isWritingCooldown) {
      // Reset other action states
      spaceGestureFrames = 0; spaceTriggered = false;
      fontCycleGestureFrames = 0; fontCycleTriggered = false;
      
      if (!deleteTriggered) {
        deleteGestureFrames++;
        updateStatusUI("Gesture Detected", `Two Fingers: Holding delete (${deleteGestureFrames}/${ACTION_TRIGGER_FRAMES_LIMIT})`, "Delete");
        if (deleteGestureFrames >= ACTION_TRIGGER_FRAMES_LIMIT) {
          triggerDeleteGestureDirect(); // Trigger action directly
          deleteTriggered = true;
        }
      } else {
        updateStatusUI("Gesture Active", "Two Fingers: Delete triggered (release hand)", "Delete");
      }
      startRecognitionTimer();
    } 
    else if (gesture === "font_cycle" && !isWritingCooldown) {
      // Reset other action states
      spaceGestureFrames = 0; spaceTriggered = false;
      deleteGestureFrames = 0; deleteTriggered = false;
      
      if (!fontCycleTriggered) {
        fontCycleGestureFrames++;
        updateStatusUI("Gesture Detected", `Three Fingers: Holding font cycle (${fontCycleGestureFrames}/${ACTION_TRIGGER_FRAMES_LIMIT})`, "Font Cycle");
        if (fontCycleGestureFrames >= ACTION_TRIGGER_FRAMES_LIMIT) {
          triggerFontCycleGestureDirect(); // Trigger action directly
          fontCycleTriggered = true;
        }
      } else {
        updateStatusUI("Gesture Active", "Three Fingers: Font changed (release hand)", "Font Cycle");
      }
      startRecognitionTimer();
    } 
    else if (gesture === "pause") {
      // Reset all action states
      resetActionStates();
      
      updateStatusUI("Paused", "Open Palm: Tracking suspended", "Pause");
      const palmCenter = landmarks[9];
      updateGestureIndicator(palmCenter.x * canvasElement.width, palmCenter.y * canvasElement.height, "🖐️");
      
      // Trigger recognition immediately if there are strokes
      if (strokeHistory.length > 0) {
        triggerHandwritingRecognition();
      } else {
        startRecognitionTimer();
      }
    } 
    else {
      // Reset all action states when gesture is undefined/None or during writing cooldown
      resetActionStates();
      
      updateStatusUI("Tracking", isWritingCooldown ? "Awaiting handwriting (stabilizing)" : "Awaiting handwriting or gesture", "None");
      startRecognitionTimer();
    }
  }

  // Draw current and historic strokes on canvas
  drawStrokes();
}

// --- Gesture Classification Logic ---

/**
 * Heuristics to determine finger extensions
 * TIP y coordinate < PIP y coordinate = Finger UP (in canvas Y goes downwards)
 */
function classifyGesture(landmarks) {
  // Index fingertip (8) vs index PIP joint (6)
  const isIndexUp = landmarks[8].y < landmarks[6].y;
  // Middle fingertip (12) vs middle PIP joint (10)
  const isMiddleUp = landmarks[12].y < landmarks[10].y;
  // Ring fingertip (16) vs ring PIP joint (14)
  const isRingUp = landmarks[16].y < landmarks[14].y;
  // Pinky fingertip (20) vs pinky PIP joint (18)
  const isPinkyUp = landmarks[20].y < landmarks[18].y;

  // 1. Three Fingers Up = Font Cycle (Index + Middle + Ring UP, Pinky DOWN)
  if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
    return "font_cycle";
  }

  // 2. Open Palm = Pause (All 4 UP)
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return "pause";
  }

  // 3. Index Finger Up Only = Write
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "write";
  }

  // 4. Index + Middle Fingers Up = Delete
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    return "delete";
  }

  // 5. Fist = Space (All folded down)
  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return "space";
  }

  return "None";
}

/**
 * Handle gesture transitions. 
 * If user transitions away from a gesture, immediately reset its cooldown so they can double-pump gestures
 */
function handleGestureTransitions(currentGesture) {
  if (currentGesture !== lastActiveGesture) {
    lastActiveGesture = currentGesture;
  }
}

// --- Cooldown Action Triggers ---

// --- Action Triggers (Direct Execution gated by frame counters) ---
async function triggerSpaceGestureDirect() {
  if (strokeHistory.length > 0) {
    logToConsole("Space gesture: recognizing current drawing first...", "system");
    await triggerHandwritingRecognition();
  }
  actionHistory.push({ type: 'space', value: ' ' });
  updateTextFromHistory();
  logToConsole("Gesture triggers: space added.", "gesture");
}

function triggerDeleteGestureDirect() {
  if (strokeHistory.length > 0 || currentStroke.length > 0) {
    strokeHistory = [];
    currentStroke = [];
    clearCanvas();
    clearRecognitionTimer();
    statusBadge.className = "badge badge-normal";
    statusDesc.textContent = "Drawing cleared";
    logToConsole("Gesture triggers: cleared active drawing canvas.", "gesture");
  } else {
    const undone = performUndo();
    if (undone) {
      logToConsole(`Gesture triggers: undo completed (${undone.type === 'word' ? 'removed "' + undone.value + '"' : 'removed space'}).`, "gesture");
    } else {
      logToConsole("Gesture triggers: undo attempted but history is empty.", "warning");
    }
  }
}

function triggerFontCycleGestureDirect() {
  if (strokeHistory.length > 0) {
    logToConsole("Gesture: Font cycle ignored while drawing is on canvas.", "info");
    return;
  }
  currentFontIndex = (currentFontIndex + 1) % FONT_STYLES.length;
  applyFontStyle();
  logToConsole(`Gesture triggers: font style changed to "${FONT_STYLES[currentFontIndex].name}".`, "gesture");
}

function resetActionStates() {
  spaceGestureFrames = 0;
  spaceTriggered = false;
  deleteGestureFrames = 0;
  deleteTriggered = false;
  fontCycleGestureFrames = 0;
  fontCycleTriggered = false;
}

// --- Stroke Management & Timing ---

function endStroke() {
  isWriting = false;
  resetSmoothing();
  lastStrokeTime = Date.now();

  if (currentStroke.length > 0) {
    // Only accept stroke if it contains enough data
    const len = calculatePathLength(currentStroke);
    if (currentStroke.length >= MIN_STROKE_POINTS && len >= MIN_STROKE_PATH_LENGTH) {
      strokeHistory.push([...currentStroke]);
      logToConsole(`Stroke completed. Total strokes: ${strokeHistory.length}`, "info");
    } else {
      logToConsole("Ignored accidental/too short stroke.", "info");
    }
    currentStroke = [];
  }
}

function startRecognitionTimer(forceDelay = null) {
  if (strokeHistory.length === 0) return;

  // Determine target delay
  let targetDelay = IDLE_RECOGNITION_DELAY;
  if (forceDelay !== null) {
    targetDelay = forceDelay;
  } else if (!isHandInFrame) {
    targetDelay = LEAVE_RECOGNITION_DELAY;
  }

  // If timer is already running with a longer delay, clear it to reschedule
  if (recognitionTimer && currentTimerDelay !== targetDelay) {
    if (targetDelay < currentTimerDelay) {
      clearRecognitionTimer();
    }
  }

  if (!recognitionTimer) {
    currentTimerDelay = targetDelay;
    recognitionTimer = setTimeout(() => {
      triggerHandwritingRecognition();
    }, targetDelay);

    statusBadge.className = "badge badge-active";
    if (targetDelay === LEAVE_RECOGNITION_DELAY) {
      statusDesc.textContent = "Hand left frame: recognizing text...";
    } else {
      statusDesc.textContent = "Writing paused: awaiting input...";
    }
  }
}

function clearRecognitionTimer() {
  if (recognitionTimer) {
    clearTimeout(recognitionTimer);
    recognitionTimer = null;
    currentTimerDelay = null;
  }
}

/**
 * Initiates the Handwriting Recognition process using recognizer.js module
 */
async function triggerHandwritingRecognition() {
  clearRecognitionTimer();
  
  if (strokeHistory.length === 0) return;

  logToConsole("Recognizing word...", "system");
  updateStatusUI("Recognizing", "Contacting recognition model...", "None");

  // Capture variables locally
  const recognitionStrokes = [...strokeHistory];
  strokeHistory = []; // Clear canvas queue immediately so user can start next word

  try {
    // Un-mirror the X coordinates before sending to recognizer.
    // The canvas is CSS-mirrored, so we drew them mirrored. Un-mirroring them makes it natural left-to-right!
    const unmirroredStrokes = recognitionStrokes.map(stroke => 
      stroke.map(pt => ({
        x: canvasElement.width - pt.x, // Un-mirror horizontally
        y: pt.y,
        t: pt.t
      }))
    );

    const result = await recognizeHandwriting(unmirroredStrokes, canvasElement.width, canvasElement.height);

    if (result && result.text) {
      // Add word action
      actionHistory.push({ type: 'word', value: result.text });
      updateTextFromHistory();

      // Display stats
      statConfidence.textContent = Math.round(result.confidence * 100) + "%";
      
      // Save alternatives
      lastSuggestions = result.suggestions || [];
      renderSuggestions();

      const sourceMode = result.isFallback ? "Offline Fallback Model" : "Google IME Model";
      logToConsole(`Recognized word: "${result.text}" (Confidence: ${Math.round(result.confidence * 100)}% via ${sourceMode})`, "success");
      
      updateStatusUI("Tracking", `Word added: "${result.text}"`, "None");
    } else {
      logToConsole("Recognition returned no text", "warning");
      updateStatusUI("Tracking", "No text recognized", "None");
    }
  } catch (err) {
    logToConsole(`Recognition failed: ${err.message}`, "warning");
    updateStatusUI("Tracking", "Recognition failed", "None");
  }

  clearCanvas();
}

// --- Coordinate Smoothing ---

function smoothCoordinates(rawX, rawY) {
  if (lastX === null || lastY === null) {
    lastX = rawX;
    lastY = rawY;
    return { x: lastX, y: lastY };
  }

  // Calculate velocity (distance in normalized coordinate space)
  const dx = rawX - lastX;
  const dy = rawY - lastY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Dynamic smoothing factor:
  // If dist is small (slow/tremor), factor is close to MIN_SMOOTHING_FACTOR (heavy smoothing).
  // If dist is large (fast strokes), factor scales up to MAX_SMOOTHING_FACTOR (low smoothing).
  let factor = MIN_SMOOTHING_FACTOR + (dist / MAX_SMOOTHING_SPEED) * (MAX_SMOOTHING_FACTOR - MIN_SMOOTHING_FACTOR);
  factor = Math.max(MIN_SMOOTHING_FACTOR, Math.min(MAX_SMOOTHING_FACTOR, factor));

  lastX = lastX + factor * (rawX - lastX);
  lastY = lastY + factor * (rawY - lastY);
  return { x: lastX, y: lastY };
}

function resetSmoothing() {
  lastX = null;
  lastY = null;
}

// --- Canvas Drawing Routines ---

function clearCanvas() {
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

function resizeCanvas() {
  const displayWidth = canvasElement.clientWidth;
  const displayHeight = canvasElement.clientHeight;

  if (canvasElement.width !== displayWidth || canvasElement.height !== displayHeight) {
    canvasElement.width = displayWidth;
    canvasElement.height = displayHeight;
    clearCanvas();
  }
}

/**
 * Draws the hands landmarks skeleton using MediaPipe drawing_utils
 */
function drawHandSkeleton(landmarks) {
  if (window.drawConnectors && window.drawLandmarks) {
    // Draws mirrored hand nodes because canvas is CSS scaleX(-1)
    window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
      color: '#3b82f6',
      lineWidth: 3
    });
    window.drawLandmarks(ctx, landmarks, {
      color: '#a855f7',
      lineWidth: 1,
      radius: 4
    });
  }
}

/**
 * Draw a pulse circles around fingertip to indicate write tracking
 */
function drawFingertipGlow(x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#06b6d4';
  ctx.fill();
  ctx.restore();
}

/**
 * Renders all lines currently in buffer (active and completed history)
 */
function drawStrokes() {
  if (strokeHistory.length === 0 && currentStroke.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // If recognition timer is ticking, color strokes yellow, else cyan
  if (recognitionTimer) {
    ctx.strokeStyle = '#f59e0b'; // Amber yellow (recognizing soon)
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = '#06b6d4'; // Cyan neon tracking
    ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 12;
  }

  // Draw stroke history
  strokeHistory.forEach(stroke => {
    drawSingleStroke(stroke);
  });

  // Draw current active stroke
  if (currentStroke.length > 0) {
    drawSingleStroke(currentStroke);
  }

  ctx.restore();
}

function drawSingleStroke(stroke) {
  if (stroke.length < 2) return;
  
  if (stroke.length === 2) {
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    ctx.lineTo(stroke[1].x, stroke[1].y);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);
  
  let i;
  for (i = 1; i < stroke.length - 1; i++) {
    const xc = (stroke[i].x + stroke[i + 1].x) / 2;
    const yc = (stroke[i].y + stroke[i + 1].y) / 2;
    ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, xc, yc);
  }
  ctx.lineTo(stroke[i].x, stroke[i].y);
  ctx.stroke();
}

// --- Text Editor State Controls ---

function triggerUndo() {
  const undone = performUndo();
  if (undone) {
    logToConsole(`Undo completed: removed last ${undone.type}.`, "system");
  } else {
    logToConsole("Nothing to undo.", "info");
  }
}

function performUndo() {
  if (actionHistory.length === 0) return null;

  const undoneAction = actionHistory.pop();
  updateTextFromHistory();
  return undoneAction;
}

function clearNotebook() {
  if (confirm("Are you sure you want to clear all notes?")) {
    actionHistory = [];
    updateTextFromHistory();
    lastSuggestions = [];
    renderSuggestions();
    statConfidence.textContent = "0%";
    logToConsole("Notebook cleared.", "system");
  }
}

function updateTextFromHistory() {
  let noteText = "";
  
  actionHistory.forEach((action, index) => {
    if (action.type === 'word') {
      noteText += action.value;
    } else if (action.type === 'space') {
      noteText += " ";
    }
  });

  noteEditor.value = noteText;
  updateCounters();
  saveNotesToStorage();
}

function updateCounters() {
  const text = noteEditor.value;
  charCountSpan.textContent = text.length;
  
  // Count words
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  wordCountSpan.textContent = words;
}

/**
 * Clicking suggestions replaces the last recognized word with the suggestion
 */
function selectSuggestion(word) {
  // Find the last word in our history
  let lastWordIndex = -1;
  for (let i = actionHistory.length - 1; i >= 0; i--) {
    if (actionHistory[i].type === 'word') {
      lastWordIndex = i;
      break;
    }
  }

  if (lastWordIndex !== -1) {
    const oldWord = actionHistory[lastWordIndex].value;
    actionHistory[lastWordIndex].value = word;
    updateTextFromHistory();
    logToConsole(`Replaced last word "${oldWord}" with suggestion "${word}"`, "system");

    // Remove the selected suggestion and move it to the front
    lastSuggestions = [word, ...lastSuggestions.filter(w => w !== word)].slice(0, 5);
    renderSuggestions();
  }
}

function renderSuggestions() {
  suggestionsList.innerHTML = '';

  if (lastSuggestions.length === 0) {
    suggestionsList.innerHTML = '<span class="no-suggestions">No suggestions available. Start writing to see alternatives.</span>';
    return;
  }

  lastSuggestions.forEach(word => {
    const pill = document.createElement('span');
    pill.className = 'suggestion-pill';
    pill.textContent = word;
    pill.addEventListener('click', () => selectSuggestion(word));
    suggestionsList.appendChild(pill);
  });
}

function exportNotes() {
  const text = noteEditor.value;
  if (!text.trim()) {
    logToConsole("Notebook is empty. Nothing to export.", "warning");
    alert("Notebook is empty. Write something before exporting!");
    return;
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `AirWrite_Notes_${dateStr}.txt`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
  logToConsole("Notes exported as text file successfully.", "success");
}

// --- Local Storage Management ---

function saveNotesToStorage() {
  localStorage.setItem('airwrite_action_history', JSON.stringify(actionHistory));
  triggerSaveFeedback();
}

/**
 * Handle manual textarea updates (re-sync history stack)
 */
function saveNotesToStorageManual() {
  const text = noteEditor.value;
  // If user edits text manually, we clear action stack and treat the whole input as one word block
  actionHistory = [{ type: 'word', value: text }];
  localStorage.setItem('airwrite_action_history', JSON.stringify(actionHistory));
  triggerSaveFeedback();
}

function loadNotesFromStorage() {
  try {
    const stored = localStorage.getItem('airwrite_action_history');
    if (stored) {
      actionHistory = JSON.parse(stored);
      // Re-apply to text box
      updateTextFromHistory();
      logToConsole("Loaded existing notes from browser cache.", "info");
    }
  } catch (err) {
    console.error("Failed to load notes from localStorage:", err);
  }
}

function triggerSaveFeedback() {
  saveStatusDiv.style.opacity = '1';
  setTimeout(() => {
    saveStatusDiv.style.opacity = '0.7';
  }, 1000);
}

// --- UI Utility Functions ---

function updateStatusUI(badgeText, descText, gestureName) {
  // Update state badges
  statusBadge.textContent = badgeText;
  statusDesc.textContent = descText;
  statGesture.textContent = gestureName;

  // Change badge color classes based on state
  statusBadge.className = "badge";
  if (badgeText === "Idle") {
    statusBadge.classList.add("badge-normal");
  } else if (badgeText === "Writing") {
    statusBadge.classList.add("badge-active");
  } else if (badgeText === "Recognizing") {
    statusBadge.classList.add("badge-normal"); // Keep it neutral grey while loading
  } else if (badgeText === "Gesture Detected") {
    statusBadge.classList.add("badge-active");
  } else if (badgeText === "Paused") {
    statusBadge.classList.add("badge-normal");
  } else {
    statusBadge.classList.add("badge-normal");
  }
}

/**
 * Lights up the corresponding gesture box in the guide menu
 */
function updateActiveGuideLight(gesture) {
  // Remove active highlights
  Object.values(guideItems).forEach(el => el.classList.remove('active-gesture'));

  // Highlight active one
  if (gesture === "write") guideItems.write.classList.add('active-gesture');
  else if (gesture === "space") guideItems.space.classList.add('active-gesture');
  else if (gesture === "delete") guideItems.delete.classList.add('active-gesture');
  else if (gesture === "pause") guideItems.pause.classList.add('active-gesture');
  else if (gesture === "font_cycle") guideItems.font.classList.add('active-gesture');
}

/**
 * Updates floating gesture overlay icon on camera
 */
function updateGestureIndicator(x, y, iconEmoji) {
  // Map x, y back to display width/height accounting for mirrored display
  // Since CSS mirrors the video and canvas horizontally, we display the tracking icon overlay
  // by aligning its positions on the parent container (.camera-wrapper).
  
  gestureOverlayIcon.style.display = "flex";
  gestureOverlayIcon.style.left = `${x}px`;
  gestureOverlayIcon.style.top = `${y}px`;
  gestureOverlayIcon.innerHTML = iconEmoji;
}

/**
 * Writes system messages to the on-screen scrollable console
 */
function logToConsole(message, type = 'info') {
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${message}`;
  
  consoleOutput.appendChild(line);
  
  // Keep logs to max 100 entries to prevent memory hogging
  while (consoleOutput.children.length > 100) {
    consoleOutput.removeChild(consoleOutput.firstChild);
  }
  
  // Auto-scroll to bottom
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Helper: computes aggregate coordinate stroke length
function calculatePathLength(stroke) {
  let len = 0;
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i-1].x;
    const dy = stroke[i].y - stroke[i-1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}



function loadFontFromStorage() {
  try {
    const stored = localStorage.getItem('airwrite_active_font_index');
    if (stored !== null) {
      currentFontIndex = parseInt(stored, 10);
      applyFontStyle();
    }
  } catch (err) {
    console.error("Failed to load font from localStorage:", err);
  }
}

function applyFontStyle() {
  const font = FONT_STYLES[currentFontIndex];
  const editor = document.getElementById('note-editor');
  const activeFontSpan = document.getElementById('active-font-name');
  
  if (editor) {
    editor.style.fontFamily = font.family;
    editor.style.fontSize = font.size;
    editor.style.lineHeight = font.lineSpacing;
  }
  if (activeFontSpan) {
    activeFontSpan.textContent = font.name;
  }
}
