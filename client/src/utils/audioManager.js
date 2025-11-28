// audioManager.js
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

    // Ambient settings
    this.sounds.ambient.loop = true;
    this.sounds.ambient.volume = 0.08;

    // SFX settings
    this.sounds.spinStart.volume = 0.06;
    this.sounds.click.volume = 0.25;
    this.sounds.bigWin.volume = 0.25;
    this.sounds.clusterWin.volume = 0.12;
    this.sounds.bonus.volume = 0.3;

    this.enabled = true;
    this.isAmbientPlaying = false;
    
    // Bind the interaction handler context
    this.handleInteraction = this.handleInteraction.bind(this);
    
    // Attach listeners immediately on load
    this.attachInteractionListeners();
  }

  attachInteractionListeners() {
    // These events cover mouse clicks and keyboard presses
    ['click', 'keydown', 'touchstart'].forEach((event) => {
      document.addEventListener(event, this.handleInteraction, { once: true });
    });
  }

  handleInteraction() {
    ['click', 'keydown', 'touchstart'].forEach((event) => {
      document.removeEventListener(event, this.handleInteraction);
    });
  }

  toggle() {
    this.enabled = !this.enabled;

    if (!this.enabled) {
      this.stopAll();
    } else {
      this.playAmbient();
    }

    return this.enabled;
  }

  playAmbient() {
    if (!this.enabled) return;
    
    if (this.isAmbientPlaying) return;

    const playPromise = this.sounds.ambient.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isAmbientPlaying = true;
        })
        .catch((error) => {
          console.log("Autoplay prevented. Waiting for interaction.");
          this.isAmbientPlaying = false;
          this.attachInteractionListeners();
        });
    }
  }

  stopAmbient() {
    this.sounds.ambient.pause();
    this.isAmbientPlaying = false;
  }

  play(soundName) {
    if (!this.enabled) return;
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

  stopSpinStart() {
    this.sounds.spinStart.pause();
    this.sounds.spinStart.currentTime = 0;
  }

  stopAll() {
    Object.values(this.sounds).forEach((sound) => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.isAmbientPlaying = false;
  }
}

export default new AudioManager();