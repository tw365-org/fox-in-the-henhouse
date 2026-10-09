// Audio Engine for "THE FOX IN THE HENHOUSE"
// Synthesizes procedural horror soundscape using Web Audio API

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.heartbeatInterval = null;
    this.isAlarmPlaying = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Start background ambient drone
    this.startServerHum();
  }

  startServerHum() {
    if (!this.ctx) return;

    // Pink noise buffer for deep cooling fan rush
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Resonant lowpass filter to mimic server room cooling intake
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Sub-bass 60Hz mains hum
    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.ambientGain);

    humOsc.connect(humGain);
    humGain.connect(this.ambientGain);

    this.ambientGain.connect(this.ctx.destination);

    whiteNoise.start();
    humOsc.start();
  }

  playKeyClick() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playGlitchSound() {
    if (!this.ctx) return;
    const count = 5;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120 + Math.random() * 1200, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.06);
      }, i * 35);
    }
  }

  playFoxCry() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // High-pitched eerie chirp/hiss
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);

    // Fast glitch static burst
    this.playGlitchSound();
  }

  playHeartbeat() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  startHeartbeatLoop(bpm = 95) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    const intervalMs = (60 / bpm) * 1000;
    this.heartbeatInterval = setInterval(() => {
      this.playHeartbeat();
      setTimeout(() => this.playHeartbeat(), 220); // Lub-dub
    }, intervalMs);
  }

  stopHeartbeatLoop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  startAlarm() {
    if (!this.ctx || this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    this.alarmOsc = this.ctx.createOscillator();
    this.alarmGain = this.ctx.createGain();
    this.alarmOsc.type = 'sawtooth';

    // Pitch sweep siren
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.2, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
    this.alarmOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

    lfo.connect(this.alarmOsc.frequency);
    this.alarmGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    this.alarmOsc.connect(this.alarmGain);
    this.alarmGain.connect(this.ctx.destination);

    this.alarmOsc.start();
    lfo.start();
    this._alarmLfo = lfo;
  }

  stopAlarm() {
    if (!this.isAlarmPlaying) return;
    if (this.alarmOsc) {
      try {
        this.alarmOsc.stop();
        this._alarmLfo.stop();
      } catch (e) {}
    }
    this.isAlarmPlaying = false;
  }

  speakAnnouncement(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.8;
      utterance.rate = 0.95;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

window.soundEngine = new SoundEngine();
