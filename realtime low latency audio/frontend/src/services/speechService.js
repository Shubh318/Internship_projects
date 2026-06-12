// Client-side Web Speech API Wrapper (STT & TTS)

let recognition = null;
let isRecognitionActive = false;

/**
 * Initializes and starts Speech-to-Text recognition
 * 
 * @param {string} lang - Language code (e.g., 'en-US', 'hi-IN')
 * @param {function} onTranscript - Callback for text updates: (text, isFinal) => void
 * @param {function} onError - Callback for errors: (error) => void
 */
export function startSpeechRecognition(lang, onTranscript, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('Speech recognition is not supported in this browser.');
    if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
    return null;
  }

  if (recognition) {
    stopSpeechRecognition();
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  isRecognitionActive = true;

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    // Send final transcript if available, otherwise interim transcript
    if (finalTranscript.trim().length > 0) {
      onTranscript(finalTranscript.trim(), true);
    } else if (interimTranscript.trim().length > 0) {
      onTranscript(interimTranscript.trim(), false);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    // Ignore harmless errors like 'no-speech'
    if (event.error !== 'no-speech' && onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    // Automatically restart if recognition was supposed to be active
    if (isRecognitionActive) {
      try {
        recognition.start();
      } catch (err) {
        console.warn('Speech recognition failed to restart:', err);
      }
    }
  };

  try {
    recognition.start();
    console.log(`Speech recognition started in language: ${lang}`);
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    if (onError) onError(error.message);
  }

  return recognition;
}

/**
 * Stops active Speech-to-Text recognition
 */
export function stopSpeechRecognition() {
  isRecognitionActive = false;
  if (recognition) {
    try {
      recognition.stop();
      console.log('Speech recognition stopped.');
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
    recognition = null;
  }
}

/**
 * Converts text into spoken audio using browser speechSynthesis
 * 
 * @param {string} text - Text to speak
 * @param {string} lang - Language code matching the speech (e.g. 'en-US', 'hi-IN')
 * @param {number} rate - Speaking speed (0.5 to 2.0, default 1.0)
 */
export function speakText(text, lang, rate = 1.0) {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel current speaking activity to ensure low latency / immediate updates
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;

  // Retrieve browser voices
  const voices = window.speechSynthesis.getVoices();
  
  // Find a voice matching the target language
  const targetPrefix = lang.split('-')[0].toLowerCase();
  let selectedVoice = voices.find(voice => voice.lang.toLowerCase() === lang.toLowerCase());
  
  if (!selectedVoice) {
    // Try matching by language code prefix (e.g., matching 'hi' in 'hi-IN')
    selectedVoice = voices.find(voice => voice.lang.toLowerCase().startsWith(targetPrefix));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// Warm up voices load on browser start
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

/**
 * Translates text client-side in the browser using the free Google Translate API.
 * Bypasses server network restrictions completely.
 */
export async function translateTextClient(text, sourceLang, targetLang) {
  if (!text || text.trim() === '') return '';
  
  const sl = sourceLang ? sourceLang.split('-')[0].toLowerCase() : 'auto';
  const tl = targetLang ? targetLang.split('-')[0].toLowerCase() : 'en';

  if (sl === tl) return text;

  // 1. Try OpenAI Translator if an API key is available
  const openaiKey = localStorage.getItem('openai_key') || import.meta.env.VITE_OPENAI_API_KEY;
  if (openaiKey && openaiKey.startsWith('sk-')) {
    try {
      console.log(`[Translation] Translating via OpenAI Chat Engine (${sl} -> ${tl})...`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a real-time translator. Translate the given text from language code "${sl}" to language code "${tl}". Return ONLY the final translated text. Do not include any headers, quotation marks, or meta explanations.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translatedText = data.choices?.[0]?.message?.content?.trim();
        if (translatedText) return translatedText;
      } else {
        console.warn('OpenAI Translation failed, using Google Translate fallback.');
      }
    } catch (err) {
      console.error('OpenAI API translation error:', err);
    }
  }

  // 2. Default: Free Google Translate API
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      let translated = '';
      if (data && data[0]) {
        data[0].forEach(segment => {
          if (segment[0]) {
            translated += segment[0];
          }
        });
      }
      if (translated.trim()) return translated.trim();
    }
  } catch (error) {
    console.error('[Google Translate client error]:', error);
  }

  // 3. Secondary Fallback: Free MyMemory Translation API
  try {
    console.log('[Translation] Using MyMemory fallback API...');
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const translated = data.responseData?.translatedText;
      if (translated) return translated.trim();
    }
  } catch (err) {
    console.error('MyMemory API translation error:', err);
  }

  return text; // Return original text on all failures
}

