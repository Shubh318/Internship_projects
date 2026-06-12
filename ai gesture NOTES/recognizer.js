/**
 * Air Writing Notes - Handwriting Recognition Module
 * 
 * This module manages the connection to the handwriting recognition backend.
 * By default, it uses the Google Input Tools Handwriting API (an unofficial public endpoint).
 * It is designed to be modular: you can easily swap out the fetch call inside
 * `recognizeHandwriting` with a local TensorFlow.js model, ONNX model, or a custom OCR API.
 */

// A simple dictionary of fallback words for offline/demo mode, categorized by drawing characteristics
const OFFLINE_DICTIONARY = [
  "cat", "hello", "world", "notes", "air", "write", "gesture", "yes", "no", "ok", 
  "cool", "smart", "hand", "draw", "app", "test", "demo", "clear", "space", "undo"
];

/**
 * Recognizes handwriting from raw stroke coordinates.
 * 
 * @param {Array} strokes - Array of strokes, where each stroke is an array of points: { x: number, y: number, t: number }
 * @param {number} canvasWidth - Width of the writing canvas (for normalization)
 * @param {number} canvasHeight - Height of the writing canvas (for normalization)
 * @returns {Promise<Object>} Resolves to { text: string, suggestions: string[], confidence: number, isFallback: boolean }
 */
async function recognizeHandwriting(strokes, canvasWidth, canvasHeight) {
  if (!strokes || strokes.length === 0) {
    return { text: "", suggestions: [], confidence: 0, isFallback: false };
  }

  // Format the strokes into the ink format expected by Google Input Tools:
  // [ [ [x1, x2, ...], [y1, y2, ...], [t1, t2, ...] ], [ [x1, x2, ...], [y1, y2, ...], [t1, t2, ...] ] ]
  const ink = strokes.map(stroke => {
    const xs = [];
    const ys = [];
    const ts = [];
    stroke.forEach(pt => {
      xs.push(Math.round(pt.x));
      ys.push(Math.round(pt.y));
      ts.push(Math.round(pt.t));
    });
    return [xs, ys, ts];
  });

  const payload = {
    device: navigator.userAgent,
    options: "enable_pre_space",
    requests: [
      {
        writing_guide: {
          writing_area_width: Math.round(canvasWidth),
          writing_area_height: Math.round(canvasHeight)
        },
        ink: ink,
        language: "en"
      }
    ]
  };

  // ---------------------------------------------------------------------------
  // ACTUAL ML/OCR MODEL INTEGRATION POINT
  // ---------------------------------------------------------------------------
  // If you wish to connect a local TensorFlow.js, ONNX model, or a custom Python
  // backend, you can replace the fetch block below with your own model inference.
  // ---------------------------------------------------------------------------
  try {
    const response = await fetch("https://inputtools.google.com/request?itc=en-t-i0-handwrit&app=translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if response is successful and contains predictions
    if (data && data[0] === "SUCCESS" && data[1] && data[1][0]) {
      const resultBlock = data[1][0];
      const suggestions = resultBlock[1]; // Array of string suggestions: e.g. ["cat", "cut", "cot"]
      
      if (suggestions && suggestions.length > 0) {
        const topText = suggestions[0];
        
        // Calculate a simulated confidence score since the API doesn't return numeric confidences.
        // We estimate confidence based on whether the suggestions align closely.
        const confidence = suggestions.length > 3 ? 0.92 : 0.85;

        return {
          text: topText,
          suggestions: suggestions.slice(0, 5), // Return top 5 suggestions
          confidence: confidence,
          isFallback: false
        };
      }
    }
    
    throw new Error("No predictions found in response");
  } catch (error) {
    console.warn("Handwriting API request failed, activating offline/demo fallback:", error);
    return recognizeFallback(strokes);
  }
}

/**
 * Fallback offline handwriting recognizer.
 * Analyzes basic stroke metrics to guess a word from a mock dictionary,
 * demonstrating how the flow works even without an internet connection.
 * 
 * @param {Array} strokes - The raw stroke data
 * @returns {Object} A mock recognition result
 */
function recognizeFallback(strokes) {
  // Count total points drawn
  let totalPoints = 0;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  strokes.forEach(stroke => {
    totalPoints += stroke.length;
    stroke.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = width / (height || 1);

  // Generate a hash/index based on drawing stats so the same drawing yields the same word
  const hash = Math.round(totalPoints + aspectRatio * 10 + strokes.length * 5) % OFFLINE_DICTIONARY.length;
  const baseWord = OFFLINE_DICTIONARY[hash];

  // Generate some phonetic/spelling suggestions similar to the base word
  const suggestions = [
    baseWord,
    baseWord + "s",
    baseWord.slice(0, -1) + "y",
    baseWord.replace(/[aeiou]/, "o")
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3); // Unique suggestions

  return {
    text: baseWord,
    suggestions: suggestions,
    confidence: 0.65, // Mark low confidence for demo/fallback recognition
    isFallback: true
  };
}
