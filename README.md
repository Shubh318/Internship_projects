# Gesture Creature World - Luminara

Gesture Creature World is an interactive, browser-based digital creature simulation and game inspired by physical developer prototypes and creative coding demos. In this experience, you play as a Spirit Guardian using your physical hand movements via a webcam stream to interact with, heal, and guide elemental creatures in the magical digital forest of **Luminara**.

Built using vanilla JavaScript, HTML5 Canvas, MediaPipe Tasks-Vision (Hand Landmarker), and the Web Audio API, the application runs entirely locally in your browser at 60 FPS, with full fallback mouse and keyboard support when camera permissions are denied or disabled.

---

## Core Features

- **Real-Time Hand Landmark Tracking:** Integrates MediaPipe Tasks-Vision Hand Landmarker directly from a CDN with WebAssembly (WASM) to analyze 21 hand joints.
- **Procedural 2D Vector Animations:** Creatures (dragons, blobs, spirits, butterflies, cats, birds, bugs, lions, elephants, dinosaurs) are rendered dynamically with procedural vector pathways, blinking eyes, flapping wings, squishing bodies, and glowing particle tails.
- **Web Audio API Synth Engine:** Dynamic audio synthesized procedurally to avoid loading broken sound assets. Includes level-up chimes, shockwaves, chirps, portal hums, and feeding sounds.
- **5 Theme Environments:** Luminara Forest (green vines), Aqua Cave (underwater rays & bubbles), Crystal Valley (sparkling amethyst gems), Sky Island (parallax island silhouettes & clouds), and Lava Zone (molten volcanic magma).
- **10 Story Mode Stages:**
  1. *Awakening Forest:* Wake sleeping elements with One Finger Up.
  2. *Spirit Gathering:* Attract 5 creatures into a circle using Open Palm.
  3. *Storm Escape:* Survive a rain of dark crimson hazards; swipe to change worlds.
  4. *Healing Ritual:* Cure toxic sick elementals with Thumb Up.
  5. *Portal Opening:* Pinch and drag 3 crystal anchors to their slots.
  6. *Guardian Creature:* Guide a giant wind bird to absorb golden mana spores.
  7. *The Sun Lion:* Calm down a massive agitated Solar Lion using Open Palm and feeding.
  8. *The Thunder Elephant:* Detonate stone block obstacles in the heavy elephant's path using Closed Fist shockwaves.
  9. *The Primal Dinosaur:* Avoid or distract a colossal T-Rex by spelling Sleep/Hide (Hand Down) to freeze and decoy.
  10. *Luminara Reborn:* A final celebration where all elementals and legendary guardians gather to dance.
- **Free Play Mode:** A sandbox to spawn, select, feed, and interact with the elements.
- **Fallback Mouse & Keyboard Support:** Fully playable using clicks, drags, mouse tracking, and custom keyboard hotkeys.

---

## Gesture Controls Table

Below is the dictionary of gestures recognized by the game, alongside their fallback controls:

| Gesture / Input | Action in Game | Fallback Keyboard/Mouse Control |
| :--- | :--- | :--- |
| **One Finger Up** (☝️) | Steer/move selected creature towards your index tip | Move cursor (Hover) |
| **Open Palm** (✋) | Summon and attract all creatures to follow/orbit your hand | Hold **Spacebar** or **Key O** |
| **Closed Fist** (✊) | Trigger a kinetic shockwave and scatter all creatures | Hold **Key F** |
| **Pinch** (🤏) | Grab, pick up, and drag the nearest creature or crystal | Click and Drag (Hold Left Mouse Button) |
| **Two Fingers Up** (✌️) | Switch the currently selected creature (Free Play) | Press **Key V** |
| **Thumb Up** (👍) | Feed and heal selected creatures (Increases happiness) | Press **Key T** |
| **Thumb Down** (👎) | Angers/aggresses selected creatures (Decreases happiness) | Press **Key G** |
| **Swipe Left/Right** (↔️) | Transition to previous/next environment theme | Press **Arrow Left / Right** or **A / D** |
| **Hand Up/Down** (↕️) | Trigger jump (up) or put creatures to sleep/hide (down) | Press **Arrow Up / Down** or **W / S** |

---

## Technical Stack

- **Structure:** HTML5, Semantic Elements
- **Styling:** Vanilla CSS, CSS Custom Properties (Variables), Glassmorphic Backdrops (`backdrop-filter`), Responsive CSS Grid / Flexbox Layouts.
- **Canvas Rendering:** HTML5 Canvas 2D Context, trigonometric curves, and velocity-based physical steering algorithms.
- **Machine Learning Engine:** MediaPipe Tasks-Vision (`@mediapipe/tasks-vision` v0.10.8) loaded via jsDelivr CDN.
- **Audio Synthesizer:** Browser `AudioContext`, custom wave oscillators (Sine, Sawtooth, Triangle), gain node envelope ramps, and Biquad bandpass filters.

---

## Installation & Local Development

To run this project locally, you only need to serve the directory using a simple web server (as MediaPipe's WASM loader requires web protocols rather than opening direct `file://` structures).

### 1. Using Python SimpleHTTPServer (Pre-installed on most systems)
Open your terminal/command prompt, navigate to the project directory, and run:
```bash
python -m http.server 8000
```
Then visit: `http://localhost:8000` in your web browser.

### 2. Using Live Server (VS Code Extension)
Right-click on `index.html` and choose **"Open with Live Server"**.

### 3. Using Node.js (via `http-server` NPM package)
Run:
```bash
npx http-server
```

### 4. Using NPM Scripts (Recommended Node workflow)
Run either of these commands in the project root to start the server:
```bash
npm start
# or
npm run dev
```
This serves the project locally at `http://localhost:8080`.

---

## Deployment Steps

Because MediaPipe requires secure contexts for webcam stream access, your deployed version **must** be served over HTTPS.

### Deploying to Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` inside the project folder:
   ```bash
   vercel
   ```
3. Follow the terminal prompts. Vercel will build and deploy the app instantly, providing an `https://...` link.

### Deploying to Netlify
1. Drag and drop the folder contents into the Netlify Drop dashboard: `https://app.netlify.com/drop`
2. Or use the Netlify CLI:
   ```bash
   netlify deploy --prod
   ```

---

## Browser Permissions & Trouble Shooting

1. **Webcam Access:** Make sure to click "Allow" when your browser requests camera access.
2. **Secure Context Error:** If you get a "Camera access blocked" banner, double-check that you are accessing the page via `localhost` or an `https://` site. Modern browsers do not allow webcam streams on plain HTTP pages.
3. **Audio Blocked:** Browsers block audio until a user interaction occurs. Click anywhere on the screen (such as the "Awaken World" button) to activate the Web Audio context.
