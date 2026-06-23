/**
 * Planet Suika - Sound Synthesizer (ASMR Web Audio API)
 */
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.25, this.ctx.currentTime); // Keep volume cozy
    this.masterGain.connect(this.ctx.destination);
  }

  playClick() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playDrop() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  playMerge(tier) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Create base chord notes depending on fruit tier
    const baseFreq = 261.63 * Math.pow(1.12, tier); // C4 * scale factor
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]; // Major triad

    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + index * 0.03 + 0.18);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + index * 0.03 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.03 + 0.28);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  playWin() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const scale = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    scale.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  playLose() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 220.00]; // descending sadness
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      if (idx === notes.length - 1) {
        osc.frequency.linearRampToValueAtTime(100, now + idx * 0.12 + 0.45);
      }
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + idx * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.45);
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(now);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  }

  playCollision(sizeFactor) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 160 - sizeFactor * 45; 
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.05);

    const vol = 0.07 * (sizeFactor + 0.3); 
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playSplash() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    
    // Bubble 1 (low bubble sweep)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.12);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.13);

    // Bubble 2 (high bubble sweep, slightly delayed)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(250, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.14);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.15);
  }
}
