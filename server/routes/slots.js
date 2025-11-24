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
    MULTIPLIER_1000X: {
        id: 'MULTIPLIER_1000X',
        symbol: '💫',
        weight: 0.03,
        multiplier: 1000,
        name: '1000x Multiplier',
    },

    // Wild - uncommon
    WILD: {
      id: 'WILD',
      symbol: '🌟',
      weight: 5.5,
      name: 'Wild',
    },

    CHEST: {
      id: 'CHEST',
      symbol: '🎁',
      weight: 2,
      name: 'Chest'
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

const GRID_ROWS = 5;
const GRID_COLS = 6;
const MIN_CLUSTER_SIZE = 6;
const FREE_SPINS_TRIGGER = 3;
const FREE_SPINS_AMOUNT = 10;
const RETRIGGER_AMOUNT = 5;
const BUY_BONUS_COST = 100;
let symbolIdCounter = 0;

// Generate weighted symbol randomly
function getRandomSymbol(isBoughtBonus = false) {
    const symbolArray = Object.values(SYMBOLS);

    const weights = symbolArray.map((s) => {
      if(!isBoughtBonus) return s.weight;

      // Boost scatters, mult, tier 2 and wilds during bonus
      if(s.id === 'SCATTER') return s.weight * 3.5;
      if(s.multiplier !== undefined) return s.weight * 5;
      if(s.tier === 2) return s.weight * 1.75;
      if(s.id === 'WILD') return s.weight * 1.5;
      if(s.id === 'CHEST') return s.weight * 2;

      return s.weight * 0.5; // Slightly reduces tier 1
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for(let i = 0; i < symbolArray.length; i++) {
      random -= weights[i];

      if(random <= 0) {
        return {
          ...symbolArray[i],
          uniqueId: `${symbolArray[i].id}_${symbolIdCounter++}`,
        };
      }
    }

    return {
      ...symbolArray[0],
      uniqueId: `${symbolArray[0].id}_${symbolIdCounter++}`,
    };
}

// Generate 6x5 grid
function generateGrid(isBoughtBonus = false, guaranteeWin = false) {
    const grid = [];
    for(let row = 0; row < GRID_ROWS; row++) {
        const rowData = [];
        for(let col = 0; col < GRID_COLS; col++) {
            rowData.push(getRandomSymbol());
        }

        grid.push(rowData);
    }

    // Force a guaranteed big win on first bought bonus spin
    if(guaranteeWin) {
      const targetSymbol = SYMBOLS.CROWN;
      const positions = [
        [0,0],[0,1],[0,2],
        [1,0],[1,1],[1,2],
        [3,0],[3,1],[3,2],
      ];

      positions.forEach(([row, col]) => {
        grid[row][col] = {
          ...targetSymbol,
          uniqueId: `${targetSymbol.id}_${symbolIdCounter++}`,
        };
      });
    }

    return grid;
}

// Process CHEST Transformations
function processChest(grid) {
  const chestPositions = [];

  for(let row = 0; row < GRID_ROWS; row++) {
    for(let col = 0; col < GRID_COLS; col++) {
      if(gird[row][col].id === 'CHEST') {
        chestPositions.push([row, col]);
      }
    }
  }

  if(chestPositions.length === 0) return { grid, chestTransforms: [] };

  const chestTransforms = [];

  chestPositions.forEach(([chestRow, chestCol]) => {
    // Find tier 1 symbols to transform
    const tier1Positions = [];
    const tier2Positions = [];

    for(let row = 0; row < GRID_ROWS; row++) {
      for(let col = 0; col < GRID_COLS; col++) {
        const symbol = grid[row][col];

        if(symbol.tier === 1) {
          tier1Positions.push([row, col]);
        } else if(symbol.tier === 2) {
          tier2.positions.push([row, col]);
        }
      }
    }

    // Pick 3 symbols (Prefer tier 1 symbols)
    let targetsToTransform = [];
    if(tier1Positions.length >= 3) {
      // Randomly pick 3 tier 1 symbols
      for(let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * tier1Positions.length);
        targetsToTransform.push(tier1Positions.splice(randomIndex, 1)[0]);
      }
    } else {
      // Not enough tier 1 symbols, use what we have + tier 2
      targetsToTransform = [...tier1Positions];
      const needed = 3 - targetsToTransform.length;

      for(let i =0; i < needed && tier2Positions.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * tier2Positions.length);
        targetsToTransform.push(tier2Positions.splice(randomIndex, 1)[0]);
      }
    }

    // Choose 4 cases
    const cases = [
      { scatters: 3, wilds: 0 },
      { scatters: 1, wilds: 2 },
      { scatters: 2, wilds: 1 },
      { scatters: 0, wilds: 3 },
    ];

    const chosenCase = cases[Math.floor(Math.random() * cases.length)];

    const newSymbols = [];

    for(let i = 0; i < chosenCase.scatters; i++) {
      newSymbols.push('SCATTER');
    }
    for(let i = 0; i < chosenCase.wilds; i++) {
      newSymbols.push('WILD');
    }

    // Apply transformations
    targetsToTransform.forEach(([row, col], idx) => {
      if(newSymbols[idx]) {
        grid[row][col] = {
          ...SYMBOLS[newSymbols[idx]],
          uniqueId: `${newSymbols[idx]}_${symbolIdCounter++}`,
        };
      }
    });

    grid[chestRow][chestCol] = getRandomSymbol();

    chestTransforms.push({
      chestPosition: [chestRow, chestCol],
      transformed: targetsToTransform,
      case: chosenCase,
    });
  });

  return { grid, chestTransforms };
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
        if (symbol.multiplier !== undefined || symbol.id === 'SCATTER' || symbol.id === 'WILD' || symbol.id === 'CHEST') {
          visited[row][col] = true;
          continue;
        }

        const cluster = bfs(grid, row, col, symbol.id, visited);

        if (cluster.positions.length >= MIN_CLUSTER_SIZE) {
          clusters.push({
            symbol: symbol,
            positions: cluster.positions,
            size: cluster.positions.length,
            tier: cluster.maxTier,
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
  const positions = [];
  visited[startRow][startCol] = true;
  let maxTier = grid[startRow][startCol].tier || 1;

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
    positions.push([row, col]);

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

        if(!neighborSymbol) continue;

        // Match if same symbol OR if neighbor is WILD
        if (
          neighborSymbol.id === symbolId ||
          neighborSymbol.id === 'WILD'
        ) {
          visited[newRow][newCol] =true;
          queue.push([newRow, newCol]);

          // Track highest tier in cluster
          if(neighborSymbol.tier && neighborSymbol.tier > maxTier) {
            maxTier = neighborSymbol.tier;
          }
        }
      }
    }
  }

  return { positions, maxTier };
}

// Calculate payout for clusters
function calculateClusterPayout(cluster, betAmount) {
    const size = cluster.size;
    const tier = cluster.tier || cluster.symbol.tier;

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

function getWildPositions(grid) {
  const wilds = [];

  for(let row = 0; row < GRID_ROWS; row++) {
    for(let col = 0; col < GRID_COLS; col++) {
      if(grid[row][col].id === 'WILD') {
        wilds.push([row, col]);
      }
    }
  }

  return wilds;
}

// Remove winning symbols and drop new ones - FIXED VERSION
function cascadeGrid(grid, clusters, isBoughtBonus = false, stickyWilds = []) {
  const toRemove = new Set();

  clusters.forEach((cluster) => {
    cluster.positions.forEach(([row, col]) => {
      const isSticky = stickyWilds.some(
        ([sRow, sCol]) => sRow === row && sCol === col
      );
      if(!isSticky) {
        toRemove.add(`${row},${col}`);
      }
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
      survivingSymbols.unshift(getRandomSymbol(isBoughtBonus));
    }

    for (let row = 0; row < GRID_ROWS; row++) {
      newGrid[row][col] = survivingSymbols[row];
    }
  }

  // Restore sticky wilds
  stickyWilds.forEach(([row, col]) => {
    newGrid[row][col] = {
      ...SYMBOLS.WILD,
      uniqueId: `WILD_STICKY_${row}_${col}`,
    };
  });

  // SAFETY CHECK: Verify no nulls exist
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!newGrid[row][col]) {
        console.error(`NULL at [${row}][${col}] after cascade!`);
        newGrid[row][col] = getRandomSymbol(isBoughtBonus);
      }
    }
  }

  return newGrid;
}
// Process complete spin with cascading
function processSpin(betAmount, isBoughtBonus = false, guaranteeWin = false, bonusMultiplier = 1) {
  let grid = generateGrid(isBoughtBonus, guaranteeWin);

  const { grid: processGrid, chestTransforms } = processChest(grid);
  grid = processGrid;

  let totalWin = 0;
  const cascades = [];
  let currentBonusMultiplier = bonusMultiplier;
  let stickyWilds = isBoughtBonus ? getWildPositions(grid) : [];

  const scatterCount = countScatters(grid);
  const triggeredFreeSpins =
    scatterCount >= FREE_SPINS_TRIGGER ? FREE_SPINS_AMOUNT : 0;
  const retriggeredFreeSpins =
    isBoughtBonus && scatterCount >= FREE_SPINS_TRIGGER
      ? RETRIGGER_AMOUNT
      : 0;

  let cascadeCount = 0;
  let hasWins = true;

  while (hasWins) {
    const clusters = findClusters(grid);

    if (clusters.length === 0) {
      hasWins = false;
      break;
    }

    // Progressive cascade multiplier
    const progressiveMult = cascadeCount + 1;

    let cascadeWin = 0;
    clusters.forEach((cluster) => {
      cascadeWin += calculateClusterPayout(cluster, betAmount);
    });

    cascadeWin *= progressiveMult;

    const multipliers = getMultipliers(grid);
    
    // During bought bonus: accumulate multipliers and appli to EACH cascade
    if(isBoughtBonus && multipliers.length > 0) {
      const cascadeMultiplier = multipliers.reduce((acc, m) => acc * m, 1);
      accumulatedMultiplier *= cascadeMultiplier;
      cascadeWin *= accumulatedMultiplier;
    } else if(!isBoughtBonus && multipliers.length > 0) {
      // Normal mode
      const cascadeMultiplier = multipliers.reduce((acc, m) => acc * m, 1);
      cascadeWin *= cascadeMultiplier
    }

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
      progressiveMult,
      bonusMultiplier: isBoughtBonus ? currentBonusMultiplier : null,
    });

    totalWin += cascadeWin;

    // NOW cascade for next iteration
    grid = cascadeGrid(grid, clusters, isBoughtBonus, stickyWilds);
    cascadeCount++;

    if (cascadeCount > 50) break;
  }

  return {
    finalGrid: grid,
    totalWin,
    cascades,
    scatterCount,
    triggeredFreeSpins,
    retriggeredFreeSpins,
    chestTransforms,
    bonusMultiplier: currentBonusMultiplier,
    stickyWilds,
    isBoughtBonus,
  };
}

// Spin endpoint
router.post('/spin', authMiddleware, async (req, res) => {
    try {
        const { betAmount, isBoughtBonusSpin, isFirstBoughtSpin, bonusMultiplier } = req.body;

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

        const isBoughtBonus = isBoughtBonusSpin === true;
        const guaranteeWin = isFirstBoughtSpin === true;
        const currentBonusMultiplier = bonusMultiplier || 1;

        // Process spin
        const result = processSpin(betAmount, isBoughtBonus, guaranteeWin, currentBonusMultiplier);

        // Add winnings
        user.balance += result.totalWin;

        // Add free spins if triggered
        if(result.triggeredFreeSpins > 0) {
            user.freeSpins += result.triggeredFreeSpins;
        }

        if(result.retriggeredFreeSpins > 0) {
          user.freeSpins += result.retriggeredFreeSpins;
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
            isBoughtBonus: true,
        });
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;