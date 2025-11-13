// Map backend symbol IDs to sprites
export const SYMBOL_SPRITES = {
    BLUE_GEM: '/sprites/blue_planet.png',
    GREEN_GEM: '/sprites/green_planet.png',
    PURPLE_GEM: '/sprites/purple_planet.png',
    RED_GEM: '/sprites/red_planet.png',
    RING: '/sprites/ring.png',
    HOURGLASS: '/sprites/hourglass.png',
    CROWN: '/sprites/crown.png',
    MULTIPLIER_2X: '/sprites/multiplier-2x.png',
    MULTIPLIER_5X: '/sprites/multiplier-5x.png',
    MULTIPLIER_10X: '/sprites/multiplier-10x.png',
    SCATTER: '/sprites/scatter.png',
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
