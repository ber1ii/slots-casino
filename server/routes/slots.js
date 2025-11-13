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
        weight: 30,
        tier: 1,
        name: 'Blue Gem',
    },
    GREEN_GEM: {
        id: 'GREEN_GEM',
        symbol: '🟢',
        weight: 28,
        tier: 1,
        name: 'Green Gem'
    },
    PURPLE_GEM: {
        id: 'PURPLE_GEM',
        symbol: '🟣',
        weight: 26,
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
        weight: 12,
        tier: 2, 
        name: 'Ring',
    },
    HOURGLASS: {
        id: 'HOURGLASS',
        symbol: '⏳',
        weight: 10,
        tier: 2,
        name: 'Hourglass',
    },
    CROWN: {
        id: 'CROWN',
        symbol: '👑',
        weight: 9,
        tier: 2,
        name: 'Crown',
    },

    // Multipliers - Rare
    MULTIPLIER_2X: {
        id: 'MULTIPLIER_2X',
        symbol: '⚡',
        weight: 1,
        multiplier: 2,
        name: '2x Multiplier',
    },
    MULTIPLIER_5X: {
        id: 'MULTIPLIER_5X',
        symbol: '🔥',
        weight: 0.5,
        multiplier: 5,
        name: '5x Multiplier'
    },
    MULTIPLIER_10X: {
        id: 'MULTIPLIER_10X',
        symbol: '💎',
        weight: 0.3,
        multiplier: 10,
        name: '10x Multiplier',
    },

    // Scatter - Epic
    SCATTER: {
        id: 'SCATTER',
        symbol: '⭐',
        weight: 0.6,
        name: 'Scatter',
    },
};

// Payout table
const PAYOUTS = {
    6: { tier1: 0.5, tier2: 1 },
    7: { tier1: 0.6, tier2: 1.2 },
    8: { tier1: 1, tier2: 1.5 },
    9: { tier1: 1, tier2: 1.5 },
    10: { tier1: 1, tier2: 2 },
    11: { tier1: 2, tier2: 4 },
    12: { tier1: 2.5, tier2: 5 },
    13: { tier1: 4, tier2: 8 },
    14: { tier1: 4, tier2: 8 },
    15: { tier1: 4, tier2: 8 },
    16: { tier1: 6, tier2: 12 },
    17: { tier1: 6, tier2: 12 },
    18: { tier1: 6, tier2: 12 },
    19: { tier1: 6, tier2: 12 },
    20: { tier1: 6, tier2: 12 },
    21: { tier1: 12, tier2: 24 },
    22: { tier1: 12, tier2: 24 },
    23: { tier1: 12, tier2: 24 },
    24: { tier1: 12, tier2: 24 },
    25: { tier1: 12, tier2: 24 },
    26: { tier1: 25, tier2: 50 },
    27: { tier1: 25, tier2: 50 },
    28: { tier1: 25, tier2: 50 },
    29: { tier1: 25, tier2: 50 },
    30: { tier1: 25, tier2: 50 },
};

const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_CLUSTER_SIZE = 6;
const FREE_SPINS_TRIGGER = 3;
const FREE_SPINS_AMOUNT = 10;
const BUY_BONUS_COST = 100;
let symbolIdCounter = 0;

// Generate weighted symbol randomly
function getRandomSymbol() {
    const symbolArray = Object.values(SYMBOLS);
    const totalWeight = symbolArray.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for(const symbol of symbolArray) {
        random -= symbol.weight;
        if(random <= 0){
            return {
                ...symbol,
                uniqueId: `${symbol.id}_${symbolIdCounter++}`,
            };
        }
    }

    return {
        ...symbolArray[0],
        uniqueId: `${symbolArray[0].id}_${symbolIdCounter++}`,
    };
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
function findClusters(grid) {
  const visited = Array(GRID_ROWS)
    .fill()
    .map(() => Array(GRID_COLS).fill(false));
  const clusters = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!visited[row][col]) {
        const symbol = grid[row][col];

        if (!symbol || !symbol.id) {
          visited[row][col] = true;
          continue;
        }

        // Skip multipliers and scatters for cluster detection
        if (symbol.multiplier !== undefined || symbol.id === 'SCATTER') {
          visited[row][col] = true;
          continue;
        }

        const cluster = bfs(grid, row, col, symbol.id, visited);

        if (cluster.length >= MIN_CLUSTER_SIZE) {
          clusters.push({
            symbol: symbol,
            positions: cluster,
            size: cluster.length,
          });
        }
      }
    }
  }

  return clusters;
}

// BFS Algorithm to find connected symbols
function bfs(grid, startRow, startCol, symbolId, visited) {
  const queue = [[startRow, startCol]];
  const cluster = [];
  visited[startRow][startCol] = true;

  // Keep your 8 directions for diagonal matching
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];

  while (queue.length > 0) {
    const [row, col] = queue.shift();
    cluster.push([row, col]);

    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow;
      const newCol = col + dCol;

      if (
        newRow >= 0 &&
        newRow < GRID_ROWS &&
        newCol >= 0 &&
        newCol < GRID_COLS &&
        !visited[newRow][newCol]
      ) {
        const neighborSymbol = grid[newRow][newCol];

        // NULL CHECK HERE
        if (neighborSymbol && neighborSymbol.id === symbolId) {
          visited[newRow][newCol] = true;
          queue.push([newRow, newCol]);
        }
      }
    }
  }

  return cluster;
}

// Calculate payout for clusters
function calculateClusterPayout(cluster, betAmount) {
    const size = cluster.size;
    const tier = cluster.symbol.tier;

    if(!PAYOUTS[size]) return 0;

    const multiplier = tier === 1 ? PAYOUTS[size].tier1 : PAYOUTS[size].tier2;

    return betAmount * multiplier;
}

// Count scatters on grid
function countScatters(grid) {
    let count = 0;

    for(let row = 0; row < GRID_ROWS; row++) {
        for(let col = 0; col < GRID_COLS; col++) {
            if(grid[row][col].id === 'SCATTER') {
                count++;
            }
        }
    }

    return count;
}

// Get all multipliers on grid
function getMultipliers(grid) {
    const multipliers = [];

    for(let row = 0; row < GRID_ROWS; row++) {
        for(let col = 0; col < GRID_COLS; col++) {
            const symbol = grid[row][col];

            if(symbol.multiplier !== undefined) {
                multipliers.push(symbol.multiplier);
            }
        }
    }

    return multipliers;
}

// Remove winning symbols and drop new ones - FIXED VERSION
function cascadeGrid(grid, clusters) {
  const toRemove = new Set();

  clusters.forEach((cluster) => {
    cluster.positions.forEach(([row, col]) => {
      toRemove.add(`${row},${col}`);
    });
  });

  const newGrid = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    newGrid.push(new Array(GRID_COLS).fill(null));
  }

  for (let col = 0; col < GRID_COLS; col++) {
    const survivingSymbols = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      if (!toRemove.has(`${row},${col}`)) {
        survivingSymbols.push(grid[row][col]);
      }
    }

    const newSymbolsNeeded = GRID_ROWS - survivingSymbols.length;

    for (let i = 0; i < newSymbolsNeeded; i++) {
      survivingSymbols.unshift(getRandomSymbol());
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      newGrid[row][col] = survivingSymbols[row];
    }
  }

  // SAFETY CHECK: Verify no nulls exist
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!newGrid[row][col]) {
        console.error(`NULL at [${row}][${col}] after cascade!`);
        newGrid[row][col] = getRandomSymbol(); // Emergency fill
      }
    }
  }

  return newGrid;
}
// Process complete spin with cascading
function processSpin(betAmount) {
  let grid = generateGrid();
  let totalWin = 0;
  const cascades = [];
  let globalMultipliers = [];

  const scatterCount = countScatters(grid);
  const triggeredFreeSpins =
    scatterCount >= FREE_SPINS_TRIGGER ? FREE_SPINS_AMOUNT : 0;

  let cascadeCount = 0;
  let hasWins = true;

  while (hasWins) {
    const clusters = findClusters(grid);

    if (clusters.length === 0) {
      hasWins = false;
      break;
    }

    let cascadeWin = 0;
    clusters.forEach((cluster) => {
      cascadeWin += calculateClusterPayout(cluster, betAmount);
    });

    const multipliers = getMultipliers(grid);
    globalMultipliers.push(...multipliers);

    // Store grid BEFORE cascade (where clusters were found)
    cascades.push({
      cascadeNumber: cascadeCount + 1,
      grid: grid.map(row => [...row]),
      clusters: clusters.map((c) => ({
        symbol: c.symbol.symbol,
        size: c.size,
        positions: c.positions,
      })),
      cascadeWin,
      multipliers,
    });

    totalWin += cascadeWin;

    // NOW cascade for next iteration
    grid = cascadeGrid(grid, clusters);
    cascadeCount++;

    if (cascadeCount > 50) break;
  }

  if (globalMultipliers.length > 0) {
    const totalMultiplier = globalMultipliers.reduce((acc, m) => acc * m, 1);
    totalWin *= totalMultiplier;
  }

  return {
    finalGrid: grid,
    totalWin,
    cascades,
    scatterCount,
    triggeredFreeSpins,
    multipliers: globalMultipliers,
  };
}

// Spin endpoint
router.post('/spin', authMiddleware, async (req, res) => {
    try {
        const { betAmount } = req.body;

        if(!betAmount || betAmount <= 0) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }

        if(betAmount < 0.2 || betAmount > 100) {
            return res
                .status(400)
                .json({ error: 'Bet must be between 0.2 and 100' });
        }

        const user = await User.findById(req.userId);

        // Check if using free spin
        const isFreeSpin = user.freeSpins > 0;

        if(!isFreeSpin && user.balance < betAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct bet or free spin
        if(isFreeSpin) {
            user.freeSpins -= 1;
        } else {
            user.balance -= betAmount;
        }

        // Process spin
        const result = processSpin(betAmount);

        // Add winnings
        user.balance += result.totalWin;

        // Add free spins if triggered
        if(result.triggeredFreeSpins > 0) {
            user.freeSpins += result.triggeredFreeSpins;
        }

        await user.save();

        res.json({
            ...result,
            newBalance: user.balance,
            freeSpinsRemaining: user.freeSpins,
            wasFreeSpin: isFreeSpin,
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

// Buy bonus endpoint
router.post('/buy-bonus', authMiddleware, async(req, res) => {
    try {
        const { betAmount } = req.body;

        if(!betAmount || betAmount <= 0) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }

        const cost = betAmount * BUY_BONUS_COST;
        const user = await User.findById(req.userId);

        if(user.balance < cost) {
            return res.status(400).json({
                error: `Insufficient balance. Need ${cost} to buy bonus`,
            });
        }

        user.balance -= cost;
        user.freeSpins += FREE_SPINS_AMOUNT;
        await user.save();

        res.json({
            success: true,
            freeSpinsAdded: FREE_SPINS_AMOUNT,
            cost,
            newBalance: user.balance,
            totalFreeSpins: user.freeSpins,
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;