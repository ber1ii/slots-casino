const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Symbol definitions with weights
const SYMBOLS = {
  // Tier 1 - Common
  BLUE_GEM: {
    id: "BLUE_GEM",
    symbol: "🔵",
    weight: 30,
    tier: 1,
    name: "Blue Gem",
  },
  GREEN_GEM: {
    id: "GREEN_GEM",
    symbol: "🟢",
    weight: 28,
    tier: 1,
    name: "Green Gem",
  },
  PURPLE_GEM: {
    id: "PURPLE_GEM",
    symbol: "🟣",
    weight: 26,
    tier: 1,
    name: "Purple Gem",
  },
  RED_GEM: {
    id: "RED_GEM",
    symbol: "🔴",
    weight: 24,
    tier: 1,
    name: "Red Gem",
  },

  // Tier 2 - Uncommon
  RING: {
    id: "RING",
    symbol: "💍",
    weight: 14,
    tier: 2,
    name: "Ring",
  },
  HOURGLASS: {
    id: "HOURGLASS",
    symbol: "⏳",
    weight: 12,
    tier: 2,
    name: "Hourglass",
  },
  CROWN: {
    id: "CROWN",
    symbol: "👑",
    weight: 10,
    tier: 2,
    name: "Crown",
  },

  // Multipliers - Rare
  MULTIPLIER_2X: {
    id: "MULTIPLIER_2X",
    symbol: "⚡",
    weight: 1,
    multiplier: 2,
    name: "2x Multiplier",
  },
  MULTIPLIER_5X: {
    id: "MULTIPLIER_5X",
    symbol: "🔥",
    weight: 0.5,
    multiplier: 5,
    name: "5x Multiplier",
  },
  MULTIPLIER_10X: {
    id: "MULTIPLIER_10X",
    symbol: "💎",
    weight: 0.3,
    multiplier: 10,
    name: "10x Multiplier",
  },
  MULTIPLIER_1000X: {
    id: "MULTIPLIER_1000X",
    symbol: "💫",
    weight: 0.025,
    multiplier: 1000,
    name: "1000x Multiplier",
  },

  // Wild - uncommon
  WILD: {
    id: "WILD",
    symbol: "🌟",
    weight: 5.5,
    name: "Wild",
  },

  CHEST: {
    id: "CHEST",
    symbol: "🎁",
    weight: 0.4,
    name: "Chest",
  },

  // Scatter - Epic
  SCATTER: {
    id: "SCATTER",
    symbol: "⭐",
    weight: 0.65,
    name: "Scatter",
  },
  CHEST_OPENED: {
    id: "CHEST_OPENED",
    symbol: "📦",
    weight: 0,
    name: "Opened Chest",
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
const BUY_BONUS_COST = 100;
let symbolIdCounter = 0;

// Generate weighted symbol randomly
function getRandomSymbol(isBoughtBonus = false, excludeChest = false) {
  let symbolArray = Object.values(SYMBOLS);

  if (excludeChest) {
    symbolArray = symbolArray.filter((s) => s.id !== "CHEST");
  }

  const weights = symbolArray.map((s) => {
    if (!isBoughtBonus) return s.weight;

    // Boost scatters, mult, tier 2 and wilds during bonus
    if (s.id === "SCATTER") return s.weight * 3.5;
    if (s.multiplier !== undefined) return s.weight * 5;
    if (s.tier === 2) return s.weight * 1.5;
    if (s.id === "WILD") return s.weight * 1.4;
    if (s.id === "CHEST") return s.weight * 1.75;

    return s.weight * 0.65; // Slightly reduces tier 1
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < symbolArray.length; i++) {
    random -= weights[i];

    if (random <= 0) {
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
function generateGrid(
  isBoughtBonus = false,
  guaranteeWin = false,
  strictNoChest = false
) {
  const grid = [];
  let hasChest = strictNoChest;

  for (let row = 0; row < GRID_ROWS; row++) {
    const rowData = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const symbol = getRandomSymbol(isBoughtBonus, hasChest);

      if (symbol.id === "CHEST") {
        hasChest = true;
      }
      rowData.push(symbol);
    }

    grid.push(rowData);
  }

  // Force a guaranteed big win on first bought bonus spin
  if (guaranteeWin) {
    const targets = [SYMBOLS.CROWN, SYMBOLS.RING, SYMBOLS.HOURGLASS];
    const targetSymbol = targets[Math.floor(Math.random() * targets.length)];

    const targetSize = Math.floor(Math.random() * 3) + 8;

    // Random walk algorithm
    let currentPositions = [];
    const startRow = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
    const startCol = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
    currentPositions.push([startRow, startCol]);

    const visited = new Set([`${startRow},${startCol}`]);

    while (currentPositions.length < targetSize) {
      // Pick random position from existing cluster to grow
      const [r, c] =
        currentPositions[Math.floor(Math.random() * currentPositions.length)];

      // Check neighbors
      const moves = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ];
      const validNeighbors = [];

      moves.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;

        if (
          nr >= 0 &&
          nr < GRID_ROWS &&
          nc >= 0 &&
          nc < GRID_COLS &&
          !visited.has(`${nr},${nc}`)
        ) {
          validNeighbors.push([nr, nc]);
        }
      });

      if (validNeighbors.length > 0) {
        const [nextR, nextC] =
          validNeighbors[Math.floor(Math.random() * validNeighbors.length)];

        visited.add(`${nextR},${nextC}`);
        currentPositions.push([nextR, nextC]);
      } else {
        continue;
      }
    }

    // Apply to grid
    currentPositions.forEach(([row, col]) => {
      grid[row][col] = {
        ...targetSymbol,
        uniqueId: `${targetSymbol.id}_guarantee_${symbolIdCounter++}`,
      };
    });
  }

  return grid;
}

// Process CHEST Transformations
function processChest(grid) {
  const chestPositions = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (grid[row][col].id === "CHEST") {
        chestPositions.push([row, col]);
      }
    }
  }

  if (chestPositions.length === 0) return { grid, chestTransforms: [] };

  const chestRow = chestPositions[0][0];
  const chestCol = chestPositions[0][1];
  const chestTransforms = [];

  chestPositions.forEach(([chestRow, chestCol]) => {
    // Find tier 1 symbols to transform
    const tier1Positions = [];
    const tier2Positions = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (row === chestRow && col === chestCol) continue;

        const symbol = grid[row][col];

        if (
          symbol.id === "WILD" ||
          symbol.id === "SCATTER" ||
          symbol.multiplier
        )
          continue;

        if (symbol.tier === 1) {
          tier1Positions.push([row, col]);
        } else if (symbol.tier === 2) {
          tier2Positions.push([row, col]);
        }
      }
    }

    // Pick 3 symbols (Prefer tier 1 symbols)
    let targetsToTransform = [];
    if (tier1Positions.length >= 3) {
      // Randomly pick 3 tier 1 symbols
      for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * tier1Positions.length);
        targetsToTransform.push(tier1Positions.splice(randomIndex, 1)[0]);
      }
    } else {
      // Not enough tier 1 symbols, use what we have + tier 2
      targetsToTransform = [...tier1Positions];
      const needed = 3 - targetsToTransform.length;

      for (let i = 0; i < needed && tier2Positions.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * tier2Positions.length);
        targetsToTransform.push(tier2Positions.splice(randomIndex, 1)[0]);
      }
    }

    if (targetsToTransform.length === 0) return;

    // Choose 4 cases
    const cases = [
      { scatters: 3, wilds: 0, probability: 0.05 },
      { scatters: 1, wilds: 2, probability: 0.35 },
      { scatters: 2, wilds: 1, probability: 0.15 },
      { scatters: 0, wilds: 3, probability: 0.45 },
    ];

    const totalProb = cases.reduce((sum, c) => sum + c.probability, 0);
    let random = Math.random() * totalProb;

    let chosenCase = cases[0];
    for (const c of cases) {
      random -= c.probability;
      if (random <= 0) {
        chosenCase = c;
        break;
      }
    }

    const originalSymbols = targetsToTransform.map(([row, col]) => ({
      position: [row, col],
      symbolId: grid[row][col].id,
      symbolName: grid[row][col].name,
      uniqueId: grid[row][col].uniqueId,
    }));

    const newSymbolsKeys = [];

    for (let i = 0; i < chosenCase.scatters; i++) {
      newSymbolsKeys.push("SCATTER");
    }
    for (let i = 0; i < chosenCase.wilds; i++) {
      newSymbolsKeys.push("WILD");
    }

    const resultingSymbols = [];

    // Apply transformations
    targetsToTransform.forEach(([row, col], idx) => {
      if (newSymbolsKeys[idx]) {
        const newSym = {
          ...SYMBOLS[newSymbolsKeys[idx]],
          uniqueId: `${newSymbolsKeys[idx]}_transformed_${symbolIdCounter++}`,
        };
        grid[row][col] = newSym;
        resultingSymbols.push(newSym);
      }
    });

    chestTransforms.push({
      chestPosition: [chestRow, chestCol],
      chestUniqueId: grid[chestRow][chestCol].uniqueId,
      transformed: targetsToTransform,
      originalSymbols,
      resultingSymbols,
      case: chosenCase,
    });
  });

  grid[chestRow][chestCol] = {
    ...SYMBOLS.CHEST_OPENED,
    uniqueId: grid[chestRow][chestCol].uniqueId,
  };

  return { grid, chestTransforms };
}

// Find clusters using BFS
function findClusters(grid) {
  const visited = Array(GRID_ROWS)
    .fill()
    .map(() => Array(GRID_COLS).fill(false));
  const clusters = [];

  const processCluster = (row, col, symbolId) => {
    const cluster = bfs(grid, row, col, symbolId, visited);

    if (cluster.positions.length >= MIN_CLUSTER_SIZE) {
      clusters.push({
        symbol: grid[row][col],
        positions: cluster.positions,
        size: cluster.positions.length,
        tier: cluster.maxTier,
      });
    }
  };

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (visited[row][col]) continue;

      const symbol = grid[row][col];
      if (!symbol || !symbol.id) {
        visited[row][col] = true;
        continue;
      }

      if (symbol.id === "CHEST_OPENED") {
        visited[row][col] = true;
        clusters.push({
          symbol: symbol,
          positions: [[row, col]],
          size: 1,
          tier: 1,
        });
        continue;
      }

      if (
        symbol.multiplier !== undefined ||
        symbol.id === "SCATTER" ||
        symbol.id === "CHEST"
      ) {
        visited[row][col] = true;
        continue;
      }

      if (symbol.id === "WILD") continue;

      processCluster(row, col, symbol.id);
    }
  }

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (visited[row][col]) continue;

      const symbol = grid[row][col];

      if (symbol && symbol.id === "WILD") {
        processCluster(row, col, "WILD");
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

        if (!neighborSymbol) continue;

        // Match if same symbol OR if neighbor is WILD
        if (neighborSymbol.id === symbolId || neighborSymbol.id === "WILD") {
          visited[newRow][newCol] = true;
          queue.push([newRow, newCol]);

          // Track highest tier in cluster
          if (neighborSymbol.tier && neighborSymbol.tier > maxTier) {
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
  if (cluster.symbol.id === "CHEST_OPENED") return 0;

  const size = cluster.size;
  const tier = cluster.tier || cluster.symbol.tier;

  if (!PAYOUTS[size]) return 0;

  const multiplier = tier === 1 ? PAYOUTS[size].tier1 : PAYOUTS[size].tier2;

  return betAmount * multiplier;
}

// Count scatters on grid
function countScatters(grid) {
  let count = 0;

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (grid[row][col].id === "SCATTER") {
        count++;
      }
    }
  }

  return count;
}

// Get all multipliers on grid
function getMultipliers(grid) {
  const multipliers = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const symbol = grid[row][col];

      if (symbol.multiplier !== undefined) {
        multipliers.push(symbol.multiplier);
      }
    }
  }

  return multipliers;
}

// Remove winning symbols and drop new ones
function cascadeGrid(
  grid,
  clusters,
  isBoughtBonus = false,
  strictNoChest = false
) {
  const toRemove = new Set();

  clusters.forEach((cluster) => {
    cluster.positions.forEach(([row, col]) => {
      toRemove.add(`${row},${col}`);
    });
  });

  let hasChestOnGrid = strictNoChest;
  if (!hasChestOnGrid) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (!toRemove.has(`${row},${col}`)) {
          // Check for unopened chests
          if (grid[row][col] && grid[row][col].id === "CHEST") {
            hasChestOnGrid = true;
          }
        }
      }
    }
  }

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
      const newSymbol = getRandomSymbol(isBoughtBonus, hasChestOnGrid);

      if (newSymbol.id === "CHEST") {
        hasChestOnGrid = true;
      }

      survivingSymbols.unshift(newSymbol);
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
        newGrid[row][col] = getRandomSymbol(isBoughtBonus);
      }
    }
  }

  return newGrid;
}
// Process complete spin with cascading
function processSpin(
  betAmount,
  isBoughtBonus = false,
  guaranteeWin = false,
  bonusMultiplier = 1
) {
  let chestHasAppearedInSpin = false;

  let grid = generateGrid(isBoughtBonus, guaranteeWin, false);

  const initialGrid = grid.map((row) => row.map((cell) => ({ ...cell })));

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (grid[r][c].id === "CHEST") chestHasAppearedInSpin = true;
    }
  }

  const { grid: processGrid, chestTransforms: initialChestTransforms } =
    processChest(grid);
  grid = processGrid;

  let totalWin = 0;
  const cascades = [];
  let currentBonusMultiplier = bonusMultiplier;

  let cascadeCount = 0;
  let hasWins = true;

  while (hasWins) {
    const clusters = findClusters(grid);

    if (clusters.length === 0) {
      hasWins = false;
      break;
    }

    // Progressive cascade multiplier
    const progressiveMult = !isBoughtBonus ? cascadeCount + 1 : 1;

    let cascadeWin = 0;
    clusters.forEach((cluster) => {
      cascadeWin += calculateClusterPayout(cluster, betAmount);
    });

    cascadeWin *= progressiveMult;

    const multipliers = getMultipliers(grid);

    // During BONUS, ADD multipliers to accumulator
    if (isBoughtBonus && multipliers.length > 0) {
      const sumOfMultipliers = multipliers.reduce((sum, m) => sum + m, 0);
      currentBonusMultiplier += sumOfMultipliers;
    }

    // Apply bonus mult to each cascade win
    if (isBoughtBonus) {
      cascadeWin *= currentBonusMultiplier;
    } else if (multipliers.length > 0) {
      // Normal mode: multiply cascade win
      const cascadeMultiplier = multipliers.reduce((acc, m) => acc * m, 1);
      cascadeWin *= cascadeMultiplier;
    }

    const currentStepGrid = grid.map((row) => [...row]);

    totalWin += cascadeWin;

    grid = cascadeGrid(grid, clusters, isBoughtBonus, chestHasAppearedInSpin);

    if (!chestHasAppearedInSpin) {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (grid[r][c].id === "CHEST") {
            chestHasAppearedInSpin = true;
          }
        }
      }
    }

    const {
      grid: gridAfterChestCheck,
      chestTransforms: cascadeChestTransforms,
    } = processChest(grid);

    if (cascadeChestTransforms.length > 0) {
      grid = gridAfterChestCheck;
    }

    cascades.push({
      cascadeNumber: cascadeCount + 1,
      grid: currentStepGrid,
      nextGridState: grid,
      clusters: clusters.map((c) => ({
        symbol: c.symbol.symbol,
        size: c.size,
        positions: c.positions,
      })),
      cascadeWin,
      multipliers,
      progressiveMult,
      bonusMultiplier: isBoughtBonus ? currentBonusMultiplier : null,
      chestTransforms: cascadeChestTransforms,
    });

    cascadeCount++;

    if (cascadeCount > 50) break;
  }

  const scatterCount = countScatters(grid);
  let triggeredFreeSpins = 0;

  if (scatterCount >= FREE_SPINS_TRIGGER) {
    triggeredFreeSpins = FREE_SPINS_AMOUNT;

    if (scatterCount > FREE_SPINS_TRIGGER) {
      const extraScatters = scatterCount - FREE_SPINS_TRIGGER;
      triggeredFreeSpins += extraScatters * 5;
    }
  }

  return {
    finalGrid: grid,
    initialGrid,
    totalWin,
    cascades,
    scatterCount,
    triggeredFreeSpins,
    initialChestTransforms,
    bonusMultiplier: currentBonusMultiplier,
    isBoughtBonus,
  };
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((e) => e.msg),
    });
  }
  next();
};

// Spin endpoint
router.post(
  "/spin",
  authMiddleware,
  [
    body("betAmount")
      .isFloat({ min: 0.2, max: 100 })
      .withMessage("Bet must be between 0.20 and 100.00"),
    body("isBoughtBonusSpin").optional().isBoolean(),
    body("isFirstBoughtSpin").optional().isBoolean(),
    body("bonusMultiplier").optional().isFloat({ min: 1 }),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        betAmount,
        isBoughtBonusSpin,
        isFirstBoughtSpin,
        bonusMultiplier,
      } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if using free spin
      const isFreeSpin = user.freeSpins > 0;

      if (!isFreeSpin && user.balance < betAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Deduct bet or free spin
      if (isFreeSpin) {
        user.freeSpins -= 1;
      } else {
        user.balance -= betAmount;
      }

      const isBoughtBonus = isBoughtBonusSpin === true;
      const guaranteeWin = isFirstBoughtSpin === true;
      const currentBonusMultiplier = bonusMultiplier || 1;

      // Process spin
      const result = processSpin(
        parseFloat(betAmount),
        isBoughtBonus,
        guaranteeWin,
        parseFloat(currentBonusMultiplier)
      );

      // Add winnings
      user.balance += result.totalWin;

      // Add free spins if triggered
      if (result.triggeredFreeSpins > 0) {
        user.freeSpins += result.triggeredFreeSpins;
      }

      user.totalSpins = (user.totalSpins || 0) + 1;
      user.lastSpinAt = new Date();

      if (!isFreeSpin) {
        user.totalWagered = (user.totalWagered || 0) + betAmount;
      }

      if (result.totalWin > 0) {
        user.totalWins = (user.totalWins || 0) + result.totalWin;

        user.lastWin = result.totalWin;

        if (result.totalWin > (user.highestWin || 0)) {
          user.highestWin = result.totalWin;
        }

        const currentSpinMultiplier = result.totalWin / betAmount;
        if (currentSpinMultiplier > (user.biggestMultiplier || 0)) {
          user.biggestMultiplier = currentSpinMultiplier;
        }
      }

      await user.save();

      res.json({
        ...result,
        newBalance: user.balance,
        freeSpinsRemaining: user.freeSpins,
        wasFreeSpin: isFreeSpin,
      });
    } catch (error) {
      console.error("Spin error:", error);
      res.status(500).json({ error: "Interval server error" });
    }
  }
);

// Buy bonus endpoint
router.post(
  "/buy-bonus",
  authMiddleware,
  [
    body("betAmount")
      .isFloat({ min: 0.2, max: 100 })
      .withMessage("Bet must be between 0.20 and 100.0"),
  ],
  validate,
  async (req, res) => {
    try {
      const { betAmount } = req.body;
      const cost = betAmount * BUY_BONUS_COST;

      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.balance < cost) {
        return res.status(400).json({
          error: `Insufficient balance. Need ${cost} to buy bonus`,
        });
      }

      user.balance -= cost;
      user.totalWagered = (user.totalWagered || 0) + cost;
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
    } catch (error) {
      console.error("Buy bonus error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
