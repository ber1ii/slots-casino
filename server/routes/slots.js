const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Symbol definitions with weights
const SYMBOLS = {
    // Tier 1 - Common
    BLUE_GEM: {
        id: 'BLUE_GEM',
        symbol: '🔵',
        weight: 24,
        tier: 1,
        name: 'Blue Gem',
    },
    GREEN_GEM: {
        id: 'GREEN_GEM',
        symbol: '🟢',
        weight: 24,
        tier: 1,
        name: 'Green Gem'
    },
    PURPLE_GEM: {
        id: 'PURPLE_GEM',
        symbol: '🟣',
        weight: 24,
        tier: 1,
        name: 'Purple Gem'
    },
    RED_GEM: {
        id: 'RED_GEM',
        symbol: '🔴',
        weight: 24,
        tier: 1,
        name: 'Red Gem',
    },

    // Tier 2 - Uncommon
    RING: {
        id: 'RING',
        symbol: '💍',
        weight: 14,
        tier: 2, 
        name: 'Ring',
    },
    HOURGLASS: {
        id: 'HOURGLASS',
        symbol: '⏳',
        weight: 12,
        tier: 2,
        name: 'Hourglass',
    },
    CROWN: {
        id: 'CROWN',
        symbol: '👑',
        weight: 10,
        tier: 2,
        name: 'Crown',
    },

    // Multipliers - Rare
    MULTIPLIER_2X: {
        id: 'MULTIPLIER_2X',
        symbol: '⚡',
        weight: 3,
        multiplier: 2,
        name: '2x Multiplier',
    },
    MULTIPLIER_5X: {
        id: 'MULTIPLIER_5X',
        symbol: '🔥',
        weight: 2,
        multiplier: 5,
        name: '5x Multiplier'
    },
    MULTIPLIER_10X: {
        id: 'MULTIPLIER_10X',
        symbol: '💎',
        weight: 1,
        multiplier: 10,
        name: '10x Multiplier',
    },

    // Scatter - Epic
    SCATTER: {
        id: 'SCATTER',
        symbol: '⭐',
        weight: 1,
        name: 'Scatter',
    },
};

// Payout table
const PAYOUTS = {
    8: { tier1: 0.5, tier2: 1 },
    9: { tier1: 0.8, tier2: 1.5 },
    10: { tier1: 1, tier2: 2 },
    11: { tier1: 1.5, tier2: 3 },
    12: { tier1: 2, tier2: 4 },
    13: { tier1: 3, tier2: 6 },
    14: { tier1: 3, tier2: 6 },
    15: { tier1: 3, tier2: 6 },
    16: { tier1: 5, tier2: 10 },
    17: { tier1: 5, tier2: 10 },
    18: { tier1: 5, tier2: 10 },
    19: { tier1: 5, tier2: 10 },
    20: { tier1: 5, tier2: 10 },
    21: { tier1: 10, tier2: 20 },
    22: { tier1: 10, tier2: 20 },
    23: { tier1: 10, tier2: 20 },
    24: { tier1: 10, tier2: 20 },
    25: { tier1: 10, tier2: 20 },
    26: { tier1: 20, tier2: 50 },
    27: { tier1: 20, tier2: 50 },
    28: { tier1: 20, tier2: 50 },
    29: { tier1: 20, tier2: 50 },
    30: { tier1: 20, tier2: 50 },
};

const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_CLUSTER_SIZE = 8;
const FREE_SPINS_TRIGGER = 3;
const FREE_SPINS_AMOUNT = 10;
const BUY_BONUS_COST = 100;

// Generate weighted symbol randomly
function getRandomSymbol() {
    const symbolArray = Object.values(SYMBOLS);
    const totalWeight = symbolArray.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for(const symbol of symbolArray) {
        random -= symbol.weight;
        if(random <= 0) return symbol;
    }

    return symbolArray[0];
}

// Generate 6x5 grid
function generateGrid() {
    const grid = [];
    for(let row = 0; row < GRID_ROWS; row++) {
        const rowData = [];
        for(let col = 0; col < GRID_COLS; col++) {
            rowData.push(getRandomSymbol());
        }

        grid.push(rowData);
    }

    return grid;
}

// Find clusters using BFS
