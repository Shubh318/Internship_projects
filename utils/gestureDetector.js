// gestureDetector.js - MediaPipe Hand Landmarker and rule-based classifier

class GestureDetector {
  constructor() {
    this.handLandmarker = null;
    this.runningMode = "VIDEO";
    this.webcamRunning = false;
    this.lastVideoTime = -1;
    this.activeHand = null; // Stores parsed landmarks of the first hand
    
    // Gestures state
    this.currentGesture = "None";
    this.pinchData = { isPinching: false, x: 0, y: 0 };
    this.swipeEvent = null; // 'left', 'right', or null
    this.verticalMoveEvent = null; // 'up', 'down', or null
    
    // Position history for swiping
    this.historyBuffer = [];
    this.bufferSize = 8;
    this.swipeCooldown = 0; // Frames to wait after a swipe to avoid double triggers
    this.verticalCooldown = 0;
    
    // Fallback status
    this.isFallbackMode = true;
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mouseClicked = false;
    this.activeKeys = {};
  }

  async init(statusCallback) {
    statusCallback("Loading resolver...");
    try {
      const { FilesetResolver, HandLandmarker } = await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs"
      );

      statusCallback("Fetching model...");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: this.runningMode,
        numHands: 1
      });

      statusCallback("Ready!");
      this.isFallbackMode = false;
      return true;
    } catch (error) {
      console.error("Failed to load MediaPipe, falling back to mouse controls.", error);
      statusCallback("Failed! Using Mouse Fallback");
      this.isFallbackMode = true;
      return false;
    }
  }

  // Update tracking on webcam feed
  detect(videoElement, canvasElement) {
    if (!this.handLandmarker || !videoElement || videoElement.paused || videoElement.ended) {
      this.activeHand = null;
      return null;
    }

    const canvasCtx = canvasElement.getContext('2d');
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    let startTimeMs = performance.now();
    const isNewFrame = this.lastVideoTime !== videoElement.currentTime;
    const isCurrentTimeStuck = videoElement.currentTime === 0;

    if (videoElement.readyState >= 2 && (isNewFrame || isCurrentTimeStuck)) {
      this.lastVideoTime = videoElement.currentTime;
      const detections = this.handLandmarker.detectForVideo(videoElement, startTimeMs);
      
      if (detections.landmarks && detections.landmarks.length > 0) {
        this.activeHand = detections.landmarks[0];
        this.isFallbackMode = false;
        
        // Draw hand skeleton
        this.drawSkeleton(canvasCtx, this.activeHand, canvasElement.width, canvasElement.height);
      } else {
        this.activeHand = null;
      }
    }

    this.processGestures(canvasElement.width, canvasElement.height);
    return this.activeHand;
  }

  drawSkeleton(ctx, landmarks, width, height) {
    ctx.save();
    
    // Draw joints
    ctx.fillStyle = '#00d2ff';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00d2ff';
    for (const lm of landmarks) {
      const x = lm.x * width;
      const y = lm.y * height;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], [0, 17] // Pinky
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    for (const conn of connections) {
      const p1 = landmarks[conn[0]];
      const p2 = landmarks[conn[1]];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  processGestures(width, height) {
    this.swipeEvent = null;
    this.verticalMoveEvent = null;

    if (this.swipeCooldown > 0) this.swipeCooldown--;
    if (this.verticalCooldown > 0) this.verticalCooldown--;

    if (this.isFallbackMode || !this.activeHand) {
      this.processFallbackGestures();
      return;
    }

    const lm = this.activeHand;

    // Helper: Distance between two landmarks
    const dist = (p1, p2) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };

    // Calculate pinch coordinates and distance (Thumb 4 and Index 8)
    const pinchDist = dist(lm[4], lm[8]);
    const isPinching = pinchDist < 0.045;
    
    const indexTipX = (1 - lm[8].x) * window.innerWidth; // Mirrored coordinate mapping
    const indexTipY = lm[8].y * window.innerHeight;
    const thumbTipX = (1 - lm[4].x) * window.innerWidth;
    const thumbTipY = lm[4].y * window.innerHeight;

    this.pinchData = {
      isPinching: isPinching,
      x: (indexTipX + thumbTipX) / 2,
      y: (indexTipY + thumbTipY) / 2
    };

    // Finger open/closed checks
    // y value increases going down in screen space
    const isIndexOpen = lm[8].y < lm[6].y;
    const isMiddleOpen = lm[12].y < lm[10].y;
    const isRingOpen = lm[16].y < lm[14].y;
    const isPinkyOpen = lm[20].y < lm[18].y;
    
    // Thumb is open if it is extended outward laterally relative to index knuckle
    const thumbBaseDist = dist(lm[4], lm[5]);
    const isThumbOpen = thumbBaseDist > 0.12;

    // Count open fingers
    let openCount = 0;
    if (isIndexOpen) openCount++;
    if (isMiddleOpen) openCount++;
    if (isRingOpen) openCount++;
    if (isPinkyOpen) openCount++;

    // Track wrist history for Swipe detection
    const wrist = lm[0];
    this.historyBuffer.push({ x: wrist.x, y: wrist.y, time: Date.now() });
    if (this.historyBuffer.length > this.bufferSize) {
      this.historyBuffer.shift();
    }

    // Swipe classification (Horizontal motion)
    if (this.historyBuffer.length >= 5 && this.swipeCooldown === 0) {
      const oldest = this.historyBuffer[0];
      const latest = this.historyBuffer[this.historyBuffer.length - 1];
      const dx = latest.x - oldest.x; // normalized x
      const dt = latest.time - oldest.time;

      if (dt < 400) { // must happen fast
        if (dx > 0.12) {
          this.swipeEvent = 'left'; // Camera is mirrored: moving hand right (higher x value) is Swipe Left on screen
          this.swipeCooldown = 30; // Cooldown 30 frames
        } else if (dx < -0.12) {
          this.swipeEvent = 'right';
          this.swipeCooldown = 30;
        }
      }
    }

    // Vertical Move classification (Up / Down)
    if (this.historyBuffer.length >= 5 && this.verticalCooldown === 0) {
      const oldest = this.historyBuffer[0];
      const latest = this.historyBuffer[this.historyBuffer.length - 1];
      const dy = latest.y - oldest.y;
      const dt = latest.time - oldest.time;

      if (dt < 400) {
        if (dy < -0.12) {
          this.verticalMoveEvent = 'up'; // hand moves up (decreasing y coordinate)
          this.verticalCooldown = 30;
        } else if (dy > 0.12) {
          this.verticalMoveEvent = 'down'; // hand moves down
          this.verticalCooldown = 30;
        }
      }
    }

    // Gesture classifications
    if (isPinching) {
      this.currentGesture = "Pinch";
    } else if (openCount === 4 && isThumbOpen) {
      this.currentGesture = "Open Palm";
    } else if (openCount === 0 && !isThumbOpen) {
      this.currentGesture = "Closed Fist";
    } else if (isIndexOpen && openCount === 1 && !isMiddleOpen) {
      this.currentGesture = "One Finger";
    } else if (isIndexOpen && isMiddleOpen && openCount === 2) {
      this.currentGesture = "Two Fingers";
    } else if (isThumbOpen && openCount === 0) {
      // Check if thumb is pointing up or down
      const thumbTip = lm[4];
      const thumbKnuckle = lm[2];
      if (thumbTip.y < thumbKnuckle.y - 0.04) {
        this.currentGesture = "Thumb Up";
      } else if (thumbTip.y > thumbKnuckle.y + 0.04) {
        this.currentGesture = "Thumb Down";
      } else {
        this.currentGesture = "None";
      }
    } else {
      this.currentGesture = "None";
    }
  }

  processFallbackGestures() {
    // Determine target positions based on mouse coordinates
    const isPinching = this.mouseClicked || this.activeKeys['KeyP'];
    this.pinchData = {
      isPinching: isPinching,
      x: this.mousePos.x,
      y: this.mousePos.y
    };

    // Hotkey triggers
    if (this.activeKeys['KeyF'] || this.activeKeys['Digit3']) {
      this.currentGesture = "Closed Fist";
    } else if (this.activeKeys['KeyO'] || this.activeKeys['Digit2'] || this.activeKeys['Space']) {
      this.currentGesture = "Open Palm";
    } else if (this.activeKeys['KeyT'] || this.activeKeys['Digit6']) {
      this.currentGesture = "Thumb Up";
    } else if (this.activeKeys['KeyG'] || this.activeKeys['Digit7']) {
      this.currentGesture = "Thumb Down";
    } else if (this.activeKeys['KeyV'] || this.activeKeys['Digit5']) {
      this.currentGesture = "Two Fingers";
    } else if (isPinching) {
      this.currentGesture = "Pinch";
    } else {
      // Default: Mouse movement simulates pointing (One Finger)
      this.currentGesture = "One Finger";
    }

    // Arrow keys or A/D simulate swipe
    if (this.activeKeys['ArrowLeft'] || this.activeKeys['KeyA']) {
      this.swipeEvent = 'left';
      delete this.activeKeys['ArrowLeft'];
      delete this.activeKeys['KeyA'];
    } else if (this.activeKeys['ArrowRight'] || this.activeKeys['KeyD']) {
      this.swipeEvent = 'right';
      delete this.activeKeys['ArrowRight'];
      delete this.activeKeys['KeyD'];
    }

    // W/S or ArrowUp/Down simulate hand up/down
    if (this.activeKeys['ArrowUp'] || this.activeKeys['KeyW']) {
      this.verticalMoveEvent = 'up';
      delete this.activeKeys['ArrowUp'];
      delete this.activeKeys['KeyW'];
    } else if (this.activeKeys['ArrowDown'] || this.activeKeys['KeyS']) {
      this.verticalMoveEvent = 'down';
      delete this.activeKeys['ArrowDown'];
      delete this.activeKeys['KeyS'];
    }
  }

  getPointerPosition() {
    if (this.isFallbackMode || !this.activeHand) {
      return this.mousePos;
    }
    
    // Mirrored camera coordinates
    return {
      x: (1 - this.activeHand[8].x) * window.innerWidth,
      y: this.activeHand[8].y * window.innerHeight
    };
  }

  getPalmPosition() {
    if (this.isFallbackMode || !this.activeHand) {
      return this.mousePos;
    }

    // Midpoint of palm (landmarks 0 wrist, 5 index knuckle, 17 pinky knuckle)
    const lm = this.activeHand;
    const px = (lm[0].x + lm[5].x + lm[17].x) / 3;
    const py = (lm[0].y + lm[5].y + lm[17].y) / 3;

    return {
      x: (1 - px) * window.innerWidth,
      y: py * window.innerHeight
    };
  }

  setupFallbackListeners() {
    window.addEventListener('mousemove', (e) => {
      this.mousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousedown', () => {
      this.mouseClicked = true;
    });

    window.addEventListener('mouseup', () => {
      this.mouseClicked = false;
    });

    window.addEventListener('keydown', (e) => {
      this.activeKeys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      delete this.activeKeys[e.code];
    });
  }
}

export const gestureDetector = new GestureDetector();
export default gestureDetector;
