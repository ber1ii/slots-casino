// Map backend symbol IDs to sprites
export const SYMBOL_SPRITES = {
  BLUE_GEM: "/sprites/blue_planet.png",
  GREEN_GEM: "/sprites/green_planet.png",
  PURPLE_GEM: "/sprites/purple_planet.png",
  RED_GEM: "/sprites/red_planet.png",
  RING: "/sprites/ring.png",
  HOURGLASS: "/sprites/hourglass.png",
  CROWN: "/sprites/crown.png",
  MULTIPLIER_2X: "/sprites/multiplier-2x.png",
  MULTIPLIER_5X: "/sprites/multiplier-5x.png",
  MULTIPLIER_10X: "/sprites/multiplier-10x.png",
  MULTIPLIER_1000X: "/sprites/multiplier-1000x.png",
  WILD: "/sprites/wild.png",
  CHEST: "/sprites/chest.png",
  SCATTER: "/sprites/scatter.png",
  CHEST_OPENED: "/sprites/chest.png",
};

export const PROFILE_SPRITES = {
  DANTE: "/sprites/dante.png",
  DEAN: "/sprites/dean.png",
  DEXTER: "/sprites/dexter.png",
  HEISENBERG: "/sprites/heisenberg.png",
  FUENTES: "/sprites/fuentes.png",
  VERGIL: "/sprites/vergil.png",
  GOJO: "/sprites/gojo.png",
  GUTS: "/sprites/guts.png",
  KENJAKU: "/sprites/kenjaku.png",
  TONY: "/sprites/soprano.png",
  THORFINN: "/sprites/thorfinn.png",
};

// Bet presets
export const BET_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

// Grid dimensions
export const GRID_ROWS = 5;
export const GRID_COLS = 6;

// Animation duration (ms)
export const ANIMATION_SPEEDS = {
  SPIN_START: 500,
  SPIN_DURATION: 2000,
  CASCADE_DELAY: 800,
  WIN_HIGHLIGHT: 1000,
};

// Win thresholds -> If Bet * Mult < Win
export const BIG_WIN_MULTIPLIER = 10;
export const MEGA_WIN_MULTIPLIER = 25;

export const PAYOUT_TABLE = {
  6: { tier1: 0.5, tier2: 1 },
  7: { tier1: 0.6, tier2: 1.2 },
  8: { tier1: 1, tier2: 2 },
  9: { tier1: 1.2, tier2: 2.5 },
  10: { tier1: 2, tier2: 4 },
  11: { tier1: 2.2, tier2: 4.4 },
  12: { tier1: 2.5, tier2: 5 },
  13: { tier1: 3, tier2: 6 },
  14: { tier1: 3.5, tier2: 7 },
  15: { tier1: 4, tier2: 8 },
  16: { tier1: 5, tier2: 10 },
  17: { tier1: 6, tier2: 12 },
  18: { tier1: 7, tier2: 14 },
  19: { tier1: 8, tier2: 16 },
  20: { tier1: 9, tier2: 18 },
  21: { tier1: 10, tier2: 20 },
  22: { tier1: 12, tier2: 24 },
  23: { tier1: 14, tier2: 28 },
  24: { tier1: 16, tier2: 32 },
  25: { tier1: 18, tier2: 36 },
  26: { tier1: 20, tier2: 40 },
  27: { tier1: 25, tier2: 50 },
  28: { tier1: 30, tier2: 60 },
  29: { tier1: 40, tier2: 80 },
  30: { tier1: 50, tier2: 100 },
};
