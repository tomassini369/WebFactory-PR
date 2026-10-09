// @ts-nocheck
// Owner supplied thermal-printer synthesizer; gated by WebFactory preferences.
import { feedback } from "../feedback/feedback";
// Web Audio API Synthesizer for Realistic Thermal Printer Sounds
// No external audio files needed - runs 100% locally with high precision

class SoundEngine {
  isMuted = false;
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.motorOsc = null;
    this.noiseNode = null;
    this.motorGain = null;
    this.isPrintingSoundActive = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPrintingSoundActive) {
      this.stopPrintSound();
    }
    return this.isMuted;
  }

  // Beep for keypad / button clicks
  playButtonBeep(freq = 1200, duration = 0.04) {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  // Realistic thermal printer stepper motor + head buzz
  startPrintSound() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled || this.isPrintingSoundActive) return;
    try {
      this.init();
      if (!this.ctx) return;

      this.isPrintingSoundActive = true;
      const t = this.ctx.currentTime;

      // Master print gain
      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.setValueAtTime(0.01, t);
      this.motorGain.gain.linearRampToValueAtTime(0.12, t + 0.1);
      this.motorGain.connect(this.ctx.destination);

      // 1. High frequency stepper motor pulse
      const motorOsc = this.ctx.createOscillator();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.setValueAtTime(520, t);

      // Tremolo / LFO for stepper motor step rhythm (ch-ch-ch-ch)
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(26, t); // 26 steps per second
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(220, t);
      lfo.connect(lfoGain);
      lfoGain.connect(motorOsc.frequency);
      lfo.start(t);
      this.lfo = lfo;

      // Filter for boxy thermal printer casing
      const biquad = this.ctx.createBiquadFilter();
      biquad.type = 'bandpass';
      biquad.frequency.setValueAtTime(1200, t);
      biquad.Q.setValueAtTime(2.5, t);

      motorOsc.connect(biquad);
      biquad.connect(this.motorGain);
      motorOsc.start(t);
      this.motorOsc = motorOsc;

      // 2. White noise for paper friction rubbing against thermal head
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2400, t);
      noiseFilter.Q.setValueAtTime(1.8, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.035, t);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.motorGain);

      whiteNoise.start(t);
      this.noiseNode = whiteNoise;
    } catch {
      // Audio fallback
    }
  }

  stopPrintSound() {
    if (!this.isPrintingSoundActive) return;
    this.isPrintingSoundActive = false;
    try {
      if (this.motorGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.motorGain.gain.linearRampToValueAtTime(0.001, t + 0.08);
        setTimeout(() => {
          try {
            if (this.motorOsc) {
              this.motorOsc.stop();
              this.motorOsc.disconnect();
              this.motorOsc = null;
            }
            if (this.lfo) {
              this.lfo.stop();
              this.lfo.disconnect();
              this.lfo = null;
            }
            if (this.noiseNode) {
              this.noiseNode.stop();
              this.noiseNode.disconnect();
              this.noiseNode = null;
            }
          } catch {
            // Cleanup safe
          }
        }, 90);
      }
    } catch {
      // Cleanup safe
    }
  }

  // Automatic mechanical cutter blade "CHK-CLACK"
  playCutterSound() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Metallic impact click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);

      // Secondary snap
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1400, t2);
        osc2.frequency.exponentialRampToValueAtTime(200, t2 + 0.05);
        gain2.gain.setValueAtTime(0.15, t2);
        gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.06);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t2);
        osc2.stop(t2 + 0.06);
      }, 50);
    } catch {
      // Safe
    }
  }

  // Paper tear sound "SHKK-RIIIP-CRACKLE"
  playTearSound() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Blade scrape / friction click at start of tear
      const scrapeOsc = this.ctx.createOscillator();
      const scrapeGain = this.ctx.createGain();
      scrapeOsc.type = 'sawtooth';
      scrapeOsc.frequency.setValueAtTime(1800, t);
      scrapeOsc.frequency.exponentialRampToValueAtTime(320, t + 0.06);
      scrapeGain.gain.setValueAtTime(0.12, t);
      scrapeGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      scrapeOsc.connect(scrapeGain);
      scrapeGain.connect(this.ctx.destination);
      scrapeOsc.start(t);
      scrapeOsc.stop(t + 0.07);

      // 2. High-speed granulated paper fiber tearing noise
      const ripDuration = 0.38;
      const bufferSize = Math.floor(this.ctx.sampleRate * ripDuration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const progress = i / bufferSize;
        // Granular bursts representing teeth snapping paper fibers
        const teethMod = Math.sin(progress * 120) * 0.4 + 0.6;
        const envelope = Math.sin(progress * Math.PI) * teethMod;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2200, t);
      bandpass.frequency.linearRampToValueAtTime(4500, t + ripDuration * 0.7);
      bandpass.frequency.linearRampToValueAtTime(1800, t + ripDuration);
      bandpass.Q.setValueAtTime(2.2, t);

      const ripGain = this.ctx.createGain();
      ripGain.gain.setValueAtTime(0.28, t);
      ripGain.gain.linearRampToValueAtTime(0.35, t + 0.12);
      ripGain.gain.exponentialRampToValueAtTime(0.001, t + ripDuration);

      noise.connect(bandpass);
      bandpass.connect(ripGain);
      ripGain.connect(this.ctx.destination);

      noise.start(t);

      // 3. Gentle paper flutter whoosh when detached
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime;
        const flutterSize = Math.floor(this.ctx.sampleRate * 0.18);
        const flutterBuf = this.ctx.createBuffer(1, flutterSize, this.ctx.sampleRate);
        const fData = flutterBuf.getChannelData(0);
        for (let i = 0; i < flutterSize; i++) {
          const p = i / flutterSize;
          fData[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.4;
        }
        const fSource = this.ctx.createBufferSource();
        fSource.buffer = flutterBuf;
        const fFilter = this.ctx.createBiquadFilter();
        fFilter.type = 'lowpass';
        fFilter.frequency.setValueAtTime(900, t2);
        const fGain = this.ctx.createGain();
        fGain.gain.setValueAtTime(0.1, t2);
        fGain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.18);
        fSource.connect(fFilter);
        fFilter.connect(fGain);
        fGain.connect(this.ctx.destination);
        fSource.start(t2);
      }, 160);
    } catch {
      // Safe fallback
    }
  }

  // Success chime
  playSuccessChime() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [587.33, 880, 1174.66]; // D5, A5, D6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.07, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.35);
      });
    } catch {
      // Safe
    }
  }

  // Mechanical latch open "CLIK-THUMP"
  playLatchSound() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.09);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {
      // Safe
    }
  }

  // Mechanical snap close
  playLatchCloseSound() {
    if (this.isMuted || !feedback.getPreferences().soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.06);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Safe
    }
  }
}

export const sound = new SoundEngine();

