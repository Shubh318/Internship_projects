# Air Writing Notes App

A web-based, gesture-controlled smart notes application that lets you write characters, words, and cursive text in the air using your **index finger**. It tracks your fingertip movement, displays a real-time neon drawing path, and translates the handwriting strokes into digital text inside a modern notebook editor. 

The application utilizes **MediaPipe Hands** for computer vision and features a futuristic, glassmorphic dark-mode interface with a complete interactive gesture console.

---

## Features

- **☝️ Real-Time Air Writing**: Lift only your index finger to draw. Coordinate trajectory smoothing is applied using a moving average to eliminate hand jitter.
- **✊ Fist Gesture (Space)**: Close your hand into a fist to insert a space. Includes gesture transition resets for rapid consecutive spacing.
- **✌️ Two-Finger Gesture (Delete/Undo)**: Extend your index and middle fingers to trigger an undo action, removing the last word or space added.
- **🖐️ Open Palm (Pause)**: Present your open palm to temporarily suspend tracking, allowing you to reposition your hand without writing.
- **✨ Intelligent Auto-Recognition**: Pausing for 1.2 seconds after writing will automatically convert your air-writing strokes into text.
- **💡 Word Suggestions & Correction**: Displays spelling and semantic alternatives in clickable pills, allowing you to instantly replace low-confidence words.
- **📝 Modern Digital Notebook**: Styled as a lined digital paper pad with automatic character/word counters, undo/clear actions, auto-save (`localStorage`), and TXT export.
- **💻 Responsive & Glassmorphic UI**: Beautiful dark theme using frosted-glass panels, custom scrollbars, and active state guides that light up dynamically based on your hand gestures.

---

## File Structure

```
├── index.html       # Web structure, MediaPipe bindings, and UI layout
├── style.css        # Glassmorphic visual style, neon animations, and lined notebook layout
├── script.js        # Camera loops, coordinate mapping, gesture classifiers, and state storage
├── recognizer.js    # Handwriting recognition API wrapper and mock fallback dictionary
└── README.md        # Technical guide and instructions (this file)
```

---

## How to Run the Project

Since this is a client-side web application built with HTML, CSS, and JS, you do not need to install complex dependencies.

### Step 1: Clone or Open the Workspace
Ensure all 4 project files (`index.html`, `style.css`, `script.js`, `recognizer.js`) are placed in the same folder.

### Step 2: Serve the Application
Because browser security policies (CORS and camera permissions) are strict, opening `index.html` as a local file (`file:///...`) might disable webcam streaming or MediaPipe resources in some browsers. It is recommended to run the app using a local HTTP server:

- **Option A: VS Code Live Server**
  Right-click `index.html` and select **Open with Live Server**.
- **Option B: Node.js (http-server)**
  Run the following commands in your terminal:
  ```bash
  npm install -g http-server
  http-server .
  ```
  Then open the provided address (e.g., `http://localhost:8080`) in your browser.
- **Option C: Python**
  Run this command inside the project directory:
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000` in your web browser.

### Step 3: Grant Camera Permissions
Upon clicking the **Start Camera** button, allow the browser to access your webcam. The hand tracking system will download its WASM model files and start automatically.

---

## Technical Details

### 1. Mirrored Coordinate Correction
To make writing feel natural, the webcam video is horizontally flipped using CSS (`transform: scaleX(-1)`). The canvas overlay is also flipped in the same way. 

To prevent the strokes from being processed backwards (mirror-writing) by the recognition system, the coordinates are un-mirrored before sending them to the API:
```javascript
const unmirroredX = canvasWidth - x_canvas;
```
This ensures that when you move your finger from left to right, the API correctly receives increasing coordinates (natural reading direction).

### 2. Gesture Rules (Heuristics)
Gestures are detected by comparing the Y coordinate of each fingertip (Landmarks `8`, `12`, `16`, `20`) with its corresponding PIP joint (Landmarks `6`, `10`, `14`, `18`).
- **Index Up Only (`write`)**: Only index finger tip is higher than its PIP joint.
- **Two Fingers Up (`delete`/`undo`)**: Both Index and Middle tips are higher than their PIP joints.
- **Open Palm (`pause`)**: Index, Middle, Ring, and Pinky finger tips are all higher than their PIP joints.
- **Fist (`space`)**: All fingers are curled down (tips lower than PIP joints).

### 3. Stroke Smoothing
Raw coordinates from MediaPipe can contain jitter. A standard exponential moving average (EMA) filter is used to smooth the coordinates:
$$\text{smoothed} = \alpha \cdot \text{raw} + (1 - \alpha) \cdot \text{last\_smoothed}$$
Here, $\alpha = 0.35$. The filter state is reset whenever a new stroke begins to prevent starting points from rubber-banding from old positions.

---

## Connecting a Custom Handwriting Recognition Model

The application is structured modularly. By default, `recognizer.js` queries a public Google Input Tools handwriting service. If you lose connection or if the API limits requests, the system automatically falls back to a deterministic offline mock dictionary.

To connect your own model, open [recognizer.js](file:///x:/internship%20devlopment/Antigravity_dev/ai%20gesture%20NOTES/recognizer.js) and locate the designated integration block:

```javascript
// ---------------------------------------------------------------------------
// ACTUAL ML/OCR MODEL INTEGRATION POINT
// ---------------------------------------------------------------------------
// If you wish to connect a local TensorFlow.js, ONNX model, or a custom Python
// backend, you can replace the fetch block below with your own model inference.
// ---------------------------------------------------------------------------
```

### Alternatives for Integration

#### 1. On-Device TensorFlow.js or ONNX
You can import a pre-trained character/word recognition model on the client side and pass the canvas context or normalized stroke trajectory array to it:
```javascript
const model = await tf.loadLayersModel('path/to/model.json');
const prediction = model.predict(tensor);
```

#### 2. Self-Hosted Python Backend (Flask / FastAPI)
You can run a local Python script running PyTorch, OpenCV, or Google's ML Kit Digital Ink library, and direct the fetch request to your server:
```javascript
const response = await fetch("http://localhost:5000/predict", {
  method: "POST",
  body: JSON.stringify({ strokes: inkData })
});
```

---

## Future Improvements

1. **Custom Model Deployment**: Integrate a lightweight TensorFlow.js model directly into `recognizer.js` to eliminate external network requests.
2. **Multi-Hand Tracking**: Enable writing with the right hand while using the left hand to trigger secondary gestures simultaneously.
3. **Advanced Editing Gestures**: Implement shapes/drawings for carriage returns (e.g., drawing a downward arrow to trigger a new line) or strike-out gestures (drawing a line over a word to delete it).
4. **Drawing Canvas Mode**: Add a toggle button to allow switching between "Handwriting to Digital Text" and "Draw Canvas Mode" where raw drawings can be exported as PNGs.
