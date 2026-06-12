import dotenv from 'dotenv';

dotenv.config();

/**
 * Translates text from source language to target language.
 * Defaults to the free Google Translate API.
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Code of the source language (e.g. 'en', 'hi')
 * @param {string} targetLang - Code of the target language (e.g. 'en', 'hi')
 * @returns {Promise<string>} The translated text
 */
export async function translateText(text, sourceLang, targetLang) {
  if (!text || text.trim() === '') return '';

  // Standardize language codes (e.g., 'en-US' -> 'en', 'hi-IN' -> 'hi')
  const sl = sourceLang ? sourceLang.split('-')[0].toLowerCase() : 'auto';
  const tl = targetLang ? targetLang.split('-')[0].toLowerCase() : 'en';

  if (sl === tl) {
    return text;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Translation endpoint status: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract translated segments from the response array structure
    let translatedText = '';
    if (data && data[0]) {
      data[0].forEach(segment => {
        if (segment[0]) {
          translatedText += segment[0];
        }
      });
    }

    return translatedText.trim() || text;
  } catch (error) {
    console.error('Translation service exception:', error);
    // Return the original text as a fallback to avoid crashing calls
    return text;
  }
}
