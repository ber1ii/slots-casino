// audioManager.js
class AudioManager {
  constructor() {
    this.sounds = {
      // Music (Loops)
      ambient: new Audio("/sounds/ambient.mp3"),
      bonusAmbient: new Audio("/sounds/bonusAmbient.mp3"),
      anticipation: new Audio("/sounds/anticipation.mp3"),
      reelSpin: new Audio("/sounds/reelSpin.mp3"),

      // SFX (One-shots)
      spinStart: new Audio("/sounds/spinStart.mp3"),
      reelStop: new Audio("/sounds/reelStop.mp3"),
      click: new Audio("/sounds/click.mp3"),
      bigWin: new Audio("/sounds/bigWin.mp3"),
      clusterWin: new Audio("/sounds/smallWin.mp3"),
      smallWin: new Audio("/sounds/smallWin.mp3"),
      scatterLand: new Audio("/sounds/scatterLand.mp3"),
      cascade: new Audio("/sounds/cascade.mp3"),
      coinCount: new Audio("/sounds/coinCount.mp3"),
      error: new Audio("/sounds/error.mp3"),
      buyBonus: new Audio("/sounds/buyBonus.mp3"),
    };

    // Loops
    this.sounds.ambient.loop = true;
    this.sounds.bonusAmbient.loop = true;
    this.sounds.anticipation.loop = true;
    this.sounds.reelSpin.loop = true;

    // Volume
    this.sounds.ambient.volume = 0.3;
    this.sounds.bonusAmbient.volume = 0.3;
    this.sounds.anticipation.volume = 0.4;
    this.sounds.reelSpin.volume = 0.4;
    this.sounds.spinStart.volume = 0.5;
    this.sounds.reelStop.volume = 0.5;
    this.sounds.scatterLand.volume = 0.7;
    this.sounds.bigWin.volume = 0.6;
    this.sounds.error.volume = 0.5;
    this.sounds.buyBonus.volume = 0.6;
    this.sounds.click.volume = 0.3;

    this.enabled = true;
    this.currentMusic = null;

    this.lastPlayed = {};
  }

  toggle() {
    this.enabled = !this.enabled;
    
    if(!this.enabled) {
      this.stopAll();
    } else {
      if(this.currentMusic) {
        this.currentMusic.play().catch(() => {});
      } else {
        this.playAmbient();
      }
    }
    return this.enabled;
  }

  playAmbient() {
    if(!this.enabled) return;
    
    this.stopMusic();
    this.currentMusic = this.sounds.ambient;
    this.sounds.ambient.play().catch((e) => console.log("Autoplay blocked:", e));
  }

  playBonusAmbient() {
    if (!this.enabled) return;
    this.stopMusic();

    this.currentMusic = this.sounds.bonusAmbient;
    this.sounds.bonusAmbient.play().catch(() => {});
  }

  stopMusic() {
    this.sounds.ambient.pause();
    this.sounds.ambient.currentTime = 0;
    this.sounds.bonusAmbient.pause();
    this.sounds.bonusAmbient.currentTime = 0;
  }

  // Spin Logic handlers
  startSpinSequence() {
    if(!this.enabled) return;

    this.sounds.spinStart.currentTime = 0;
    this.sounds.spinStart.play().catch(() => {});

    this.sounds.reelSpin.currentTime = 0;
    this.sounds.reelSpin.play().catch(() => {});
  }

  stopSpinLoop() {
    this.sounds.reelSpin.pause();
    this.sounds.reelSpin.currentTime = 0;
  }

  // Animation handlers
  startAnticipation() {
    if(!this.enabled) return;
    if(this.currentMusic) this.currentMusic.volume = 0.15;

    this.sounds.anticipation.currentTime = 0;
    this.sounds.anticipation.play().catch(() => {});
  }

  stopAnticipation() {
    this.sounds.anticipation.pause();
    this.sounds.anticipation.currentTime = 0;

    if(this.currentMusic) this.currentMusic.volume = 0.3;
  }

  // One Shot SFX Handlers
  play(soundName) {
    if(!this.enabled) return;
    const sound = this.sounds[soundName];
    if(!sound) return;

    const now = Date.now();
    const lastTime = this.lastPlayed[soundName] || 0;

    const throttleTime = soundName === 'reelStop' ? 150 : 80;
    if(now - lastTime < throttleTime) {
      return;
    }
    this.lastPlayed[soundName] = now;

    if(soundName === 'error') {
      sound.pause();
      sound.currentTime = 0;
    }

    if(['coinCount', 'click', 'cascade'].includes(soundName)) {
      const clone = sound.cloneNode();
      clone.volume = sound.volume;
      clone.play().catch(() => {});
    } else {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  stopAll() {
    Object.values(this.sounds).forEach((s) => {
      s.pause();
      s.currentTime = 0;
    });
  }
}

export default new AudioManager();