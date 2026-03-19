/* ═══════════════════════════════════════════════════════
   JARVIS AI — script.js
   Voice Assistant: Speech Recognition + Speech Synthesis
   ═══════════════════════════════════════════════════════

   HOW IT WORKS:
   1. User clicks the orb → SpeechRecognition starts (microphone)
   2. User speaks → text is captured
   3. processCommand(text) figures out the best reply
   4. speak(reply) uses SpeechSynthesis to say it aloud
   5. UI animations update to show current state
*/

'use strict';

// ═══════════════════════════════════
// SECTION 1: DOM ELEMENT REFERENCES
// ═══════════════════════════════════
const micBtn        = document.getElementById('micBtn');
const micIcon       = document.getElementById('micIcon');
const stopIcon      = document.getElementById('stopIcon');
const statusText    = document.getElementById('statusText');
const transcriptEl  = document.getElementById('transcriptText');
const responseEl    = document.getElementById('responseText');

// ═══════════════════════════════════
// SECTION 2: STATE FLAGS
// ═══════════════════════════════════
let isListening     = false;   // True when mic is active
let isSpeaking      = false;   // True when JARVIS is speaking
let recognition     = null;    // SpeechRecognition instance
let femaleVoice     = null;    // Will hold the selected female voice
let voicesLoaded    = false;   // True once voices are fetched

// ═══════════════════════════════════
// SECTION 3: BROWSER SUPPORT CHECK
// ═══════════════════════════════════

// Check if SpeechRecognition is available (Chrome/Edge only)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  // No support — show a warning and disable the button
  setStatus('⚠ Use Chrome or Edge for voice support');
  responseEl.textContent = 'Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
  micBtn.disabled = true;
  micBtn.style.opacity = '0.4';
  micBtn.style.cursor  = 'not-allowed';
}

// Check SpeechSynthesis
if (!window.speechSynthesis) {
  responseEl.textContent = 'Text-to-speech not supported in this browser.';
}

// ═══════════════════════════════════
// SECTION 4: LOAD VOICES (Female)
// ═══════════════════════════════════

/**
 * Loads available TTS voices and picks the best female voice.
 * This runs automatically — voices load asynchronously in browsers.
 */
function loadVoices() {
  const voices = window.speechSynthesis.getVoices();

  if (voices.length === 0) return; // Not ready yet — will retry via event

  voicesLoaded = true;

  // Priority list for female voice names (covers Chrome, Firefox, Edge, iOS)
  const femaleKeywords = [
    'samantha',   // macOS/iOS — very natural female
    'victoria',   // macOS — clear female
    'karen',      // macOS/iOS — Australian female
    'moira',      // macOS — Irish female
    'fiona',      // macOS — Scottish female
    'tessa',      // macOS — South African female
    'zira',       // Windows 10 — Microsoft Zira (female)
    'hazel',      // Windows — Hazel female
    'susan',
    'female',
    'woman',
    'girl',
  ];

  // Try to find a voice matching female keywords
  for (const keyword of femaleKeywords) {
    const found = voices.find(v =>
      v.name.toLowerCase().includes(keyword)
    );
    if (found) {
      femaleVoice = found;
      console.log('JARVIS: Selected voice →', femaleVoice.name);
      break;
    }
  }

  // If none found, try "en-US" or "en-GB" voices (usually female on most browsers)
  if (!femaleVoice) {
    femaleVoice =
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang === 'en-GB') ||
      voices[0]; // Last resort: first available voice
    console.log('JARVIS: Fallback voice →', femaleVoice?.name);
  }
}

// Load voices on page load
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices(); // Try immediately (some browsers load sync)

// ═══════════════════════════════════
// SECTION 5: SPEECH OUTPUT (TTS)
// ═══════════════════════════════════

/**
 * JARVIS speaks the given text aloud using female voice.
 * @param {string} text - The text to speak
 * @param {function} [onDone] - Optional callback when done speaking
 */
function speak(text, onDone) {
  // Safety: cancel anything currently being spoken
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Apply the female voice
  if (femaleVoice) {
    utterance.voice = femaleVoice;
  }

  // Voice settings
  utterance.rate   = 0.95;  // Slightly slower than default (clearer)
  utterance.pitch  = 1.1;   // Slightly higher pitch (more feminine)
  utterance.volume = 1.0;   // Full volume

  // Show response text on screen
  responseEl.textContent = text;

  // When speaking starts → show animations
  utterance.onstart = () => {
    isSpeaking = true;
    document.body.classList.add('speaking');
    document.body.classList.remove('listening');
    setStatus('Speaking...');
    // Swap mic icon to stop icon
    micIcon.style.display  = 'none';
    stopIcon.style.display = 'block';
  };

  // When speaking ends → reset UI
  utterance.onend = () => {
    isSpeaking = false;
    document.body.classList.remove('speaking');
    setStatus('Click the orb to speak');
    micIcon.style.display  = 'block';
    stopIcon.style.display = 'none';
    if (onDone) onDone();
  };

  // Handle error
  utterance.onerror = (e) => {
    console.error('JARVIS TTS error:', e);
    isSpeaking = false;
    document.body.classList.remove('speaking');
    setStatus('Click the orb to speak');
  };

  // Speak!
  window.speechSynthesis.speak(utterance);
}

// ═══════════════════════════════════
// SECTION 6: SPEECH INPUT (MIC)
// ═══════════════════════════════════

/**
 * Toggles listening on/off when the orb is clicked.
 */
function toggleListening() {
  // If JARVIS is speaking, stop it first
  if (isSpeaking) {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    document.body.classList.remove('speaking');
    setStatus('Click the orb to speak');
    micIcon.style.display  = 'block';
    stopIcon.style.display = 'none';
    return;
  }

  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

/**
 * Starts the SpeechRecognition (microphone input).
 */
function startListening() {
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();

  // Settings
  recognition.lang            = 'en-US';     // Recognize English
  recognition.interimResults  = true;        // Show words as they're spoken
  recognition.maxAlternatives = 1;
  recognition.continuous      = false;       // Stop after one sentence

  // ── Event: recognition starts ──
  recognition.onstart = () => {
    isListening = true;
    document.body.classList.add('listening');
    setStatus('Listening...');
    // Show stop icon while listening
    micIcon.style.display  = 'none';
    stopIcon.style.display = 'block';
    // Clear previous transcript
    transcriptEl.textContent = '...';
  };

  // ── Event: user is speaking (interim / final results) ──
  recognition.onresult = (event) => {
    let interimText = '';
    let finalText   = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += text;
      } else {
        interimText += text;
      }
    }

    // Show what user is saying in real time
    transcriptEl.textContent = finalText || interimText || '...';

    // If we have a final result, process it
    if (finalText) {
      stopListening();
      const response = processCommand(finalText.trim().toLowerCase());
      speak(response);
    }
  };

  // ── Event: recognition ends ──
  recognition.onend = () => {
    isListening = false;
    document.body.classList.remove('listening');
    // Only reset if not now speaking
    if (!isSpeaking) {
      setStatus('Click the orb to speak');
      micIcon.style.display  = 'block';
      stopIcon.style.display = 'none';
    }
  };

  // ── Event: error occurred ──
  recognition.onerror = (event) => {
    console.error('JARVIS recognition error:', event.error);
    isListening = false;
    document.body.classList.remove('listening');
    setStatus('Click the orb to speak');
    micIcon.style.display  = 'block';
    stopIcon.style.display = 'none';

    // Friendly error messages
    const errors = {
      'not-allowed'  : 'Microphone access denied. Please allow mic in browser settings.',
      'no-speech'    : 'I did not hear anything. Please try again.',
      'network'      : 'Network error. Please check your internet connection.',
      'audio-capture': 'No microphone found. Please connect a microphone.',
    };
    const msg = errors[event.error] || 'Something went wrong. Please try again.';
    responseEl.textContent = msg;
    speak(msg);
  };

  // Start!
  try {
    recognition.start();
  } catch (e) {
    console.error('Could not start recognition:', e);
  }
}

/**
 * Stops the SpeechRecognition gracefully.
 */
function stopListening() {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
    recognition = null;
  }
  isListening = false;
  document.body.classList.remove('listening');
}

// ═══════════════════════════════════
// SECTION 7: COMMAND PROCESSOR
// ═══════════════════════════════════

/**
 * Takes user's spoken text and returns JARVIS's response.
 * This is the "brain" — no API needed, all local logic.
 *
 * @param {string} query - User's spoken text (lowercase)
 * @returns {string} - JARVIS's response text
 */
function processCommand(query) {
  console.log('JARVIS processing:', query);

  // ── GREETINGS ──────────────────────────────────────────
  if (match(query, ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'])) {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! I am JARVIS, your AI assistant. How can I help you today?";
    if (hour < 17) return "Good afternoon! JARVIS online and ready. How may I assist you?";
    return "Good evening! I am JARVIS. What can I do for you tonight?";
  }

  // ── TIME ───────────────────────────────────────────────
  if (match(query, ['time', 'what time', 'current time', 'tell me the time'])) {
    const now = new Date();
    const hours   = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm    = hours >= 12 ? 'PM' : 'AM';
    const h12     = hours % 12 || 12;
    return `The current time is ${h12}:${minutes} ${ampm}.`;
  }

  // ── DATE ───────────────────────────────────────────────
  if (match(query, ['date', 'today', "what's the date", 'current date', 'day today'])) {
    const now  = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', opts);
    return `Today is ${dateStr}.`;
  }

  // ── DAY OF WEEK ────────────────────────────────────────
  if (match(query, ['what day', 'which day', 'day of the week'])) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return `Today is ${days[new Date().getDay()]}.`;
  }

  // ── WHO ARE YOU ────────────────────────────────────────
  if (match(query, ['who are you', 'what are you', 'introduce yourself', 'your name', 'what is your name'])) {
    return "I am JARVIS — Just A Rather Very Intelligent System. I am your personal AI voice assistant, designed to help you with information, tasks, and queries. How may I serve you?";
  }

  // ── HOW ARE YOU ────────────────────────────────────────
  if (match(query, ['how are you', 'how do you do', 'how are you doing', 'are you okay', 'you good'])) {
    return "I am functioning at optimal performance, thank you for asking! All systems are online and ready. How are you doing today?";
  }

  // ── WHAT CAN YOU DO ────────────────────────────────────
  if (match(query, ['what can you do', 'your features', 'help', 'capabilities', 'commands'])) {
    return "I can tell you the time and date, answer general questions, open websites, tell jokes, perform calculations, and much more. Just speak to me and I will assist you!";
  }

  // ── OPEN WEBSITES ──────────────────────────────────────
  if (match(query, ['open google', 'go to google', 'launch google'])) {
    setTimeout(() => window.open('https://www.google.com', '_blank'), 1500);
    return "Opening Google for you right away.";
  }
  if (match(query, ['open youtube', 'go to youtube', 'launch youtube'])) {
    setTimeout(() => window.open('https://www.youtube.com', '_blank'), 1500);
    return "Opening YouTube. Enjoy your videos!";
  }
  if (match(query, ['open github', 'go to github'])) {
    setTimeout(() => window.open('https://www.github.com', '_blank'), 1500);
    return "Opening GitHub for you.";
  }
  if (match(query, ['open instagram', 'go to instagram'])) {
    setTimeout(() => window.open('https://www.instagram.com', '_blank'), 1500);
    return "Opening Instagram.";
  }
  if (match(query, ['open twitter', 'go to twitter', 'open x'])) {
    setTimeout(() => window.open('https://www.x.com', '_blank'), 1500);
    return "Opening Twitter, also known as X.";
  }
  if (match(query, ['open whatsapp'])) {
    setTimeout(() => window.open('https://web.whatsapp.com', '_blank'), 1500);
    return "Opening WhatsApp Web.";
  }
  if (match(query, ['open chatgpt', 'open chat gpt'])) {
    setTimeout(() => window.open('https://chat.openai.com', '_blank'), 1500);
    return "Opening ChatGPT.";
  }

  // ── SEARCH GOOGLE ──────────────────────────────────────
  if (match(query, ['search for', 'google', 'search'])) {
    const q = query
      .replace('search for', '')
      .replace('google', '')
      .replace('search', '')
      .trim();
    if (q) {
      setTimeout(() => window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank'), 1500);
      return `Searching Google for "${q}".`;
    }
    return "What would you like me to search for?";
  }

  // ── JOKES ──────────────────────────────────────────────
  if (match(query, ['joke', 'funny', 'make me laugh', 'tell me a joke', 'say something funny'])) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs!",
      "I asked my computer to sing me a song. It said sorry, I cannot, dot exe.",
      "Why was the math book sad? Because it had too many problems!",
      "What do you call a fish without eyes? A fsh.",
      "Why do scientists rarely tell jokes? Because all the good ones argon.",
      "I told my WiFi password to a joke. Now it is spread all over the network.",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── MATHEMATICS ───────────────────────────────────────
  if (match(query, ['calculate', 'what is', 'how much is', 'plus', 'minus', 'times', 'divided'])) {
    // Try to evaluate simple math expressions
    try {
      // Clean up spoken math
      const expr = query
        .replace('what is', '').replace('calculate', '').replace('how much is', '')
        .replace('plus', '+').replace('minus', '-').replace('times', '*')
        .replace('multiplied by', '*').replace('divided by', '/').replace('x', '*')
        .replace(/[^0-9+\-*/.()\s]/g, '').trim();

      if (expr) {
        // Safe eval using Function constructor
        const result = new Function(`"use strict"; return (${expr})`)();
        if (!isNaN(result)) {
          return `The answer to ${expr} is ${result}.`;
        }
      }
    } catch (e) {
      // Couldn't parse — fall through to default
    }
  }

  // ── WEATHER (placeholder — needs API for real) ─────────
  if (match(query, ['weather', 'temperature', 'is it raining', 'forecast'])) {
    return "I am sorry, I currently do not have access to live weather data. You can check weather by asking me to open Google, or saying search for weather.";
  }

  // ── NEWS ───────────────────────────────────────────────
  if (match(query, ['news', 'latest news', 'headlines'])) {
    setTimeout(() => window.open('https://news.google.com', '_blank'), 1500);
    return "Opening Google News for the latest headlines.";
  }

  // ── PLAY MUSIC ─────────────────────────────────────────
  if (match(query, ['play music', 'play song', 'play some music', 'i want music'])) {
    setTimeout(() => window.open('https://music.youtube.com', '_blank'), 1500);
    return "Opening YouTube Music for you. Enjoy!";
  }

  // ── THANK YOU ──────────────────────────────────────────
  if (match(query, ['thank you', 'thanks', 'thank you jarvis', 'thanks jarvis'])) {
    return "You are most welcome! It is always a pleasure to assist you. Is there anything else I can do for you?";
  }

  // ── BYE / GOODBYE ─────────────────────────────────────
  if (match(query, ['bye', 'goodbye', 'good night', 'see you', 'exit', 'shut down', 'close'])) {
    return "Goodbye! Take care. I will be here whenever you need me. Have a wonderful day!";
  }

  // ── WHO CREATED YOU / MADE YOU ─────────────────────────
  if (match(query, ['who made you', 'who created you', 'who built you', 'who is your creator', 'who programmed you'])) {
    return "I was built as a voice-powered AI assistant using HTML, CSS, and JavaScript with the Web Speech API. My creator designed me to be helpful, smart, and always ready to assist!";
  }

  // ── MY NAME / REMEMBER ME ─────────────────────────────
  if (match(query, ['my name is', 'i am', 'call me'])) {
    const name = query
      .replace('my name is', '').replace('i am', '').replace('call me', '').trim();
    if (name) {
      return `Nice to meet you, ${capitalize(name)}! I will remember that. How can I assist you today, ${capitalize(name)}?`;
    }
  }

  // ── REPEAT / SAY AGAIN ─────────────────────────────────
  if (match(query, ['repeat', 'say again', 'what did you say', 'say that again'])) {
    return responseEl.textContent || "I did not say anything yet. Please ask me a question!";
  }

  // ── MOTIVATIONAL QUOTE ─────────────────────────────────
  if (match(query, ['motivate me', 'motivation', 'inspire me', 'quote', 'give me a quote'])) {
    const quotes = [
      "The only way to do great work is to love what you do. — Steve Jobs",
      "Believe you can and you are halfway there. — Theodore Roosevelt",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill",
      "In the middle of every difficulty lies opportunity. — Albert Einstein",
      "Dream big and dare to fail. — Norman Vaughan",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // ── WHAT IS ... (wiki-style) ────────────────────────────
  if (match(query, ['what is', 'define', 'meaning of', 'tell me about'])) {
    const topic = query
      .replace('what is', '').replace('define', '').replace('meaning of', '').replace('tell me about', '').trim();
    if (topic) {
      setTimeout(() => window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`, '_blank'), 1500);
      return `Let me look that up. Opening Wikipedia for "${topic}".`;
    }
  }

  // ── ALARM / REMINDER (placeholder) ────────────────────
  if (match(query, ['set alarm', 'set reminder', 'remind me'])) {
    return "I am sorry, alarm and reminder features require additional setup. You can use your device's built-in clock app for now.";
  }

  // ── DEFAULT: Unknown query ─────────────────────────────
  const unknownResponses = [
    `I heard you say: "${query}". I am not sure how to help with that yet, but I am always learning!`,
    `I understood "${query}", but that is beyond my current capabilities. Try asking me the time, a joke, or to open a website!`,
    `Interesting question! For "${query}", I would suggest searching Google. Want me to open it for you?`,
  ];
  return unknownResponses[Math.floor(Math.random() * unknownResponses.length)];
}

// ═══════════════════════════════════
// SECTION 8: HELPER FUNCTIONS
// ═══════════════════════════════════

/**
 * Checks if a query contains any of the given keywords/phrases.
 * @param {string} query    - The user's spoken text (lowercase)
 * @param {string[]} words  - Array of keywords to match against
 * @returns {boolean}
 */
function match(query, words) {
  return words.some(word => query.includes(word));
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Updates the status text shown below the orb.
 * @param {string} text
 */
function setStatus(text) {
  statusText.textContent = text;
}

// ═══════════════════════════════════
// SECTION 9: QUICK COMMAND (chips)
// ═══════════════════════════════════

/**
 * Called when user clicks one of the hint chips.
 * Simulates the command as if spoken.
 * @param {string} command
 */
function simulateCommand(command) {
  // Show the command in transcript
  transcriptEl.textContent = command;

  // Process and speak
  const response = processCommand(command.trim().toLowerCase());
  speak(response);
}

// ═══════════════════════════════════
// SECTION 10: STARTUP GREETING
// ═══════════════════════════════════

/**
 * JARVIS greets the user when the page loads.
 * Waits 1 second to allow voices to load first.
 */
window.addEventListener('load', () => {
  // Slight delay ensures voices are loaded before speaking
  setTimeout(() => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12)      greeting = "Good morning! JARVIS is online and ready to assist you.";
    else if (hour < 17) greeting = "Good afternoon! JARVIS systems are fully operational. How may I assist?";
    else                greeting = "Good evening! JARVIS is at your service. How can I help you tonight?";
    speak(greeting);
  }, 1200);
});
