class AudioManager {
  constructor() {
    this.sounds = {
      ambient: new Audio('/sounds/ambient.mp3'),
      spinStart: new Audio('/sounds/spin-start.mp3'),
      click: new Audio('/sounds/click.mp3'),
      bigWin: new Audio('/sounds/big-win.mp3'),
      clusterWin: new Audio('/sounds/cluster-win.mp3'),
      bonus: new Audio('/sounds/bonus.mp3'),
    };

    this.sounds.ambient.loop = true;
    this.sounds.ambient.volume = 0.1;

    this.sounds.spinStart.volume = 0.15;
    this.sounds.click.volume = 0.7;
    this.sounds.bigWin.volume = 0.4;
    this.sounds.clusterWin.volume = 0.25;
    this.sounds.bonus.volume = 0.3;

    this.enabled = true;
    this.ambientPlaying = false;
    this.ambientUnlocked = false;
  }

  toggle() {
    this.enabled = !this.enabled;

    if (!this.enabled) {
      this.stopAmbient();
    } else {
      this.playAmbient();
    }

    return this.enabled;
  }

  playAmbient() {
    if (this.enabled && !this.ambientPlaying) {
      this.sounds.ambient.play()
        .then(() => {
          this.ambientPlaying = true;
          this.ambientUnlocked = true;
        })
      .catch(() => {

      });
    }
  }

  stopAmbient() {
    this.sounds.ambient.pause();
    this.ambientPlaying = false;
  }

  play(soundName) {
    if (!this.enabled) return;

    // Unlock ambient on first user interaction
    if(!this.ambientUnlocked) {
      this.ambientUnlocked = true;
      if(!this.ambientPlaying) {
        this.playAmbient();
      }
    }

    const sound = this.sounds[soundName];
    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  playSpinStart() {
    if (!this.enabled) return;

    const sound = this.sounds.spinStart;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  stopAll() {
    Object.values(this.sounds).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.ambientPlaying = false;
  }
}

export default new AudioManager();