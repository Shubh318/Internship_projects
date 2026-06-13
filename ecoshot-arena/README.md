# EcoShot Arena — Gesture Controlled Environmental Shooting Game

EcoShot Arena is a premium, highly responsive real-time environmental awareness shooter designed for interactive public screens (such as mall LED displays, hackathons, exhibitions, and college kiosks). Players use advanced hand gestures captured by a webcam to aim sand-throw and laser-gun weapons at garbage targets, purifying the ecosystem while defending nature and wildlife.

---

## 🎮 Game Controls & Hand Gestures

EcoShot Arena uses **MediaPipe Hands** to enable contactless, low-latency control:

1. **Aim / Gun Shape (👉)**: Hold your index finger forward while folding your middle, ring, and pinky fingers. Move your hand to position the neon green crosshair smoothly across the screen.
2. **Fire Laser (👍)**: Raise your thumb upwards inside the camera scope to instantly trigger the laser weapon and fire an eco-cleansing energy blast.
3. **Idle Position (👎)**: Keep your thumb folded/down for neutral posture (does not trigger shots).
4. **Pause Simulator (🤚)**: Show a wide-open palm (all five fingers extended) to pause the active game or resume instantly.
5. **Reload Shield (✊)**: Close all fingers into a tight fist to trigger a Recycle Shield, protecting you from the next penalty.
6. **Recalibrate Origin (👌)**: Touch your thumb tip to your index tip (OK sign) to instantly center coordinates.

---

## 🕹️ Mouse & Keyboard Fallback (Exhibition Guarantee)

To guarantee the game always works in any public environment (e.g., poor lighting, webcam permissions blocked, or restricted user distance):

* **Mouse Fallback Mode**: If camera permissions fail or a client clicks "Fallback Mode", standard mouse movement controls the crosshair, and **left-clicks** trigger shots.
* **Keyboard Shortcuts**:
  * `Spacebar` ➔ Manual Shoot (Fallback trigger)
  * `R` ➔ Complete Simulation Restart
  * `P` ➔ Toggle Pause Setup
  * `F` ➔ Fullscreen LED Mode Toggle

---

## 🚀 How to Run & Setup

### Instant Offline Run
Simply open `/index.html` directly in any modern desktop browser (Chrome, Edge, or Safari).
* The game automatically loads TailwindCSS and MediaPipe via CDN networks.
* Ensure you accept **Camera Permissions** when prompted.

---

## 🏬 Public Mall LED Setup Best Practices

For large-scale interactive setups, please follow these deployment tips:

1. **Physical Spacing**: Position the camera at eye level, roughly $1.5\text{m}$ to $2.0\text{m}$ ($5\text{ft}$ to $7.5\text{ft}$) in front of the active standing zone.
2. **Lighting**: Ensure the standing area is brightly lit. Avoid placing high-intensity spotlights or sunbeams directly behind the player's back inside the camera scope.
3. **Target Sizing**: Press the **Calibrate / Gear** icon on the HUD to adjust target sizes (up to 130px) for high-pixel-density outdoor screens.
4. **FPS & Latency**: Keep the browser window framed in Fullscreen mode (`F` shortcut key) to maximize frame rendering efficiency.

---

## 🎨 Creative Theme & Aesthetic Design

The simulator utilizes a polished, high-contrast visual HUD built around glassmorphism and neon glows:
* **Dark Navy Slate Canvas** representing toxic global settings before cleansing.
* **Viper Green Laser Paths** shooting directly from bottom indicators to target positions on impact.
* **Nature Warnings**: Accidental hits on nature targets (e.g., Birds, Trees) trigger a crimson warning flash with direct educational guidelines.
* **Progressive Environment Transformation**: As the score increases, background fumes clear, yielding turquoise rays and sunlight circles.
* **Synthesized Audio Engine**: All sound effects (shoots, hits, combos, warnings, and boss arrivals) are synthesized dynamically via the browser's native **Web Audio API** — no static files required.
