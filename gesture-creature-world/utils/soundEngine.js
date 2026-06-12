// soundEngine.js - Programmatic audio synthesizer using Web Audio API

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Helper to create oscillator nodes
  createOsc(type, freq, duration, gainStart, gainEnd = 0.001) {
    if (this.isMuted || !this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    return { osc, gainNode };
  }

  playSelect() {
    this.init();
    const sound = this.createOsc('sine', 880, 0.1, 0.1);
    if (!sound) return;
    sound.osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.08);
    sound.osc.start();
    sound.osc.stop(this.ctx.currentTime + 0.1);
  }

  playSpawn() {
    this.init();
    const sound = this.createOsc('triangle', 330, 0.25, 0.15);
    if (!sound) return;
    sound.osc.frequency.setValueAtTime(330, this.ctx.currentTime);
    sound.osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.15);
    sound.osc.start();
    sound.osc.stop(this.ctx.currentTime + 0.25);
  }

  playFeed() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Play a rising, happy arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        const sound = this.createOsc('sine', freq, 0.2, 0.08);
        if (sound) {
          sound.osc.start();
          sound.osc.stop(this.ctx.currentTime + 0.2);
        }
      }, index * 60);
    });
  }

  playShockwave() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Synthesize an explosion sound using filtered noise
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(600, this.ctx.currentTime);
    filterNode.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.5);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 0.5);
  }

  playPortal() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // A rising, resonant sweep
    const now = this.ctx.currentTime;
    const duration = 1.0;
    
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(15, now);
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + duration);
  }

  playSwipe() {
    this.init();
    const sound = this.createOsc('sine', 180, 0.4, 0.15);
    if (!sound) return;
    sound.osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);
    sound.osc.start();
    sound.osc.stop(this.ctx.currentTime + 0.4);
  }

  playSad() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const notes = [392.00, 349.23, 311.13]; // G4, F4, Eb4
    notes.forEach((freq, index) => {
      setTimeout(() => {
        const sound = this.createOsc('triangle', freq, 0.25, 0.1);
        if (sound) {
          sound.osc.start();
          sound.osc.stop(this.ctx.currentTime + 0.25);
        }
      }, index * 120);
    });
  }

  playLevelUp() {
    this.init();
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // A triumphant chime
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5]; // C major scale rise
    notes.forEach((freq, index) => {
      setTimeout(() => {
        const sound = this.createOsc('sine', freq, 0.4, 0.08);
        if (sound) {
          sound.osc.start();
          sound.osc.stop(this.ctx.currentTime + 0.4);
        }
      }, index * 80);
    });
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
