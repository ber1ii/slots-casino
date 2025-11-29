import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { slotsAPI } from "../../services/api";
import toast from "react-hot-toast";
import SlotGrid from "./SlotGrid";
import audioManager from "../../utils/audioManager";
import confetti from "canvas-confetti";
import {
  BET_PRESETS,
  GRID_COLS,
  GRID_ROWS,
  SYMBOL_SPRITES,
  PAYOUT_TABLE,
} from "../../config/gameConfig";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

const getGridBeforeChests = (baseGrid, chestTransforms) => {
  const tempGrid = baseGrid.map((row) => row.map((cell) => ({ ...cell })));

  chestTransforms.forEach((transform) => {
    const [cRow, cCol] = transform.chestPosition;

    tempGrid[cRow][cCol] = {
      id: "CHEST",
      uniqueId: transform.chestUniqueId || `chest_${cRow}_${cCol}_anim`,
      name: "Chest",
    };

    transform.originalSymbols.forEach((orig) => {
      const [oRow, oCol] = orig.position;
      tempGrid[oRow][oCol] = {
        id: orig.symbolId,
        uniqueId: orig.uniqueId || `orig_${oRow}_${oCol}_anim`,
        name: orig.symbolName,
      };
    });
  });

  return tempGrid;
};

const countScattersInGrid = (gridToCheck) => {
  if (!gridToCheck) return 0;
  let count = 0;
  gridToCheck.forEach((row) => {
    row.forEach((cell) => {
      if (cell && cell.id === "SCATTER") count++;
    });
  });
  return count;
};

const SlotGame = () => {
  const { user, updateUser } = useAuth();
  const [grid, setGrid] = useState([]);
  const [betAmount, setBetAmount] = useState(0.2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isReelSpinning, setIsReelSpinning] = useState(false);
  const [winningPositions, setWinningPositions] = useState([]);
  const [isCascading, setIsCascading] = useState(false);
  const [showTotalWin, setShowTotalWin] = useState(false);
  const [totalWinAmount, setTotalWinAmount] = useState(0);

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showBuyBonusModal, setShowBuyBonusModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showPayoutTable, setShowPayoutTable] = useState(false);

  const [isBoughtBonusActive, setIsBoughtBonusActive] = useState(false);
  const [accumulatedBonusMultiplier, setAccumulatedBonusMultiplier] =
    useState(1);
  const [isFirstBoughtSpin, setIsFirstBoughtSpin] = useState(false);

  const [bonusTotalWin, setBonusTotalWin] = useState(0);
  const [currentDisplayMultiplier, setCurrentDisplayMultiplier] = useState(1);

  const [chestTransformPositions, setChestTransformPositions] = useState([]);
  const [chestPositions, setChestPositions] = useState([]);

  const cascadeTimeoutRef = useRef(null);
  const totalWinTimeoutRef = useRef(null);
  const skipSignalRef = useRef(false);
  const reelFinishedResolver = useRef(null);
  const keyList = Object.keys(SYMBOL_SPRITES);

  // Calculate total scatters for the Highlight logic
  const totalScatters = useMemo(() => countScattersInGrid(grid), [grid]);

  useEffect(() => {
    const preloadImages = () => {
      Object.values(SYMBOL_SPRITES).forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };
    preloadImages();
  }, []);

  useEffect(() => {
    const tryPlay = () => {
      if (!isBoughtBonusActive) {
        audioManager.playAmbient();
      }
    };

    const unlockAudio = () => {
      tryPlay();
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    tryPlay();

    return () => {
      audioManager.stopAll();
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    initializeGrid();
    return () => {
      if (cascadeTimeoutRef.current) clearTimeout(cascadeTimeoutRef.current);
      if (totalWinTimeoutRef.current) clearTimeout(totalWinTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isSpinning) {
        if (isReelSpinning && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          skipSignalRef.current = true;
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "enter":
          e.preventDefault();
          handleSpin();
          break;
        case "a":
          toggleAutoplay();
          break;
        case "m":
          handleMaxBet();
          break;
        case "b":
          setShowBuyBonusModal(true);
          break;
        case "arrowup":
          e.preventDefault();
          increaseBet();
          break;
        case "arrowdown":
          e.preventDefault();
          decreaseBet();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isSpinning, betAmount, isAutoPlaying, isReelSpinning]);

  useEffect(() => {
    const shouldAutoSpin =
      !isSpinning &&
      ((isAutoPlaying &&
        !isBoughtBonusActive &&
        (user?.balance >= betAmount || user?.freeSpins > 0)) ||
        (isBoughtBonusActive && user?.freeSpins > 0));

    if (shouldAutoSpin) {
      const timer = setTimeout(() => {
        handleSpin();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    isAutoPlaying,
    isBoughtBonusActive,
    isSpinning,
    user?.freeSpins,
    user?.balance,
    betAmount,
  ]);

  const initializeGrid = () => {
    const initialGrid = Array(GRID_ROWS)
      .fill(null)
      .map((_, rowIndex) =>
        Array(GRID_COLS)
          .fill(null)
          .map((_, colIndex) => ({
            id: keyList[Math.floor(Math.random() * keyList.length)],
            name: "initial",
            uniqueId: `init_${rowIndex}_${colIndex}`,
          }))
      );
    setGrid(initialGrid);
  };

  const waitForAnimationOrSkip = async (minDurationMs) => {
    let finishResolve;
    const finishPromise = new Promise((resolve) => {
      finishResolve = resolve;
    });

    reelFinishedResolver.current = finishResolve;
    const startTime = Date.now();

    while (Date.now() - startTime < minDurationMs) {
      if (skipSignalRef.current) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!skipSignalRef.current) {
      await finishPromise;
    }

    return false;
  };

  const handleSpin = async () => {
    if (!isBoughtBonusActive) {
      audioManager.playAmbient();
    }

    if (isSpinning) return;

    if (user.balance < betAmount && user.freeSpins === 0) {
      toast.error("Insufficient balance!");
      setIsAutoPlaying(false);
      audioManager.play("error");
      return;
    }

    setIsSpinning(true);
    setIsReelSpinning(true);
    setWinningPositions([]);
    skipSignalRef.current = false;
    setChestTransformPositions([]);
    setChestPositions([]);

    if (!isBoughtBonusActive) {
      setShowTotalWin(false);
      setCurrentDisplayMultiplier(1);
      setAccumulatedBonusMultiplier(1);
    } else {
      setCurrentDisplayMultiplier(accumulatedBonusMultiplier);
    }

    audioManager.startSpinSequence();

    try {
      const startTime = Date.now();

      // API call
      const spinResult = await slotsAPI.spin(
        betAmount,
        isBoughtBonusActive,
        isFirstBoughtSpin,
        accumulatedBonusMultiplier
      );

      const res = { data: spinResult.data };
      const initialChestTransforms = res.data.initialChestTransforms || [];

      // Duration Logic
      const BASE_DURATION = 2000;
      const EXTRA_BUFFER = 500;
      const lastColIndex = GRID_COLS - 1;
      const COLUMN_DELAY_STEP = 300;

      const calculatedDuration =
        BASE_DURATION + lastColIndex * COLUMN_DELAY_STEP + EXTRA_BUFFER;

      let initialVisualGrid = res.data.initialGrid || res.data.finalGrid;
      setGrid(initialVisualGrid);

      if (isFirstBoughtSpin) {
        setIsFirstBoughtSpin(false);
      }

      if (res.data.bonusMultiplier !== undefined) {
        setAccumulatedBonusMultiplier(res.data.bonusMultiplier);
      }

      const intermediateBalace = res.data.newBalance - res.data.totalWin;

      updateUser({
        balance: intermediateBalace,
      });

      const wasSkipped = await waitForAnimationOrSkip(calculatedDuration);

      audioManager.stopSpinLoop();

      if (wasSkipped) {
        audioManager.stopSpinLoop();

        if (reelFinishedResolver.current) reelFinishedResolver.current();
      }

      setIsReelSpinning(false);

      if (isBoughtBonusActive && res.data.totalWin > 0) {
        setBonusTotalWin((prev) => prev + res.data.totalWin);
      }

      let gridForcasCades = initialVisualGrid;

      // Handle Chests
      if (initialChestTransforms.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await handleChestSequence(initialChestTransforms, initialVisualGrid);

        gridForcasCades = getGridBeforeChests(
          initialVisualGrid,
          initialChestTransforms
        );
      }

      // Handle Cascades
      if (res.data.cascades && res.data.cascades.length > 0) {
        await processCascades(res.data.cascades, gridForcasCades);
      }

      updateUser({
        balance: res.data.newBalance,
        freeSpins: res.data.freeSpinsRemaining,
      });

      if (!isBoughtBonusActive) {
        addTransaction({
          bet: betAmount,
          win: res.data.totalWin,
          balance: res.data.newBalance,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      // Handle Win Display
      if (res.data.totalWin > 0 && !isBoughtBonusActive) {
        setTotalWinAmount(res.data.totalWin);
        setShowTotalWin(true);

        if (res.data.totalWin > betAmount * 100) {
          audioManager.play("bigWin");
        } else {
          audioManager.play("clusterWin");
        }

        triggerConfetti();

        totalWinTimeoutRef.current = setTimeout(() => {
          setShowTotalWin(false);
        }, 4000);
      } else if (res.data.totalWin > 0 && isBoughtBonusActive) {
        toast.success(`💰 Spin Win: $${res.data.totalWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      // Wait for bonus celebration
      if (
        isBoughtBonusActive &&
        res.data.freeSpinsRemaining === 0 &&
        res.data.triggeredFreeSpins === 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const finalTotalWin = bonusTotalWin + res.data.totalWin;

        addTransaction({
          bet: "BONUS",
          win: finalTotalWin,
          balance: res.data.newBalance,
          timestamp: new Date().toLocaleTimeString(),
          isBonus: true,
        });

        if (finalTotalWin > 0) {
          setTotalWinAmount(finalTotalWin);
          setShowTotalWin(true);
          audioManager.play("bigWin");
          triggerConfetti();

          await new Promise((resolve) => setTimeout(resolve, 5000));

          setShowTotalWin(false);
          setBonusTotalWin(0);

          setIsBoughtBonusActive(false);
          setAccumulatedBonusMultiplier(1);
          setCurrentDisplayMultiplier(1);
          audioManager.playAmbient();
        } else {
          toast.success("Bonus round completed!");
          setBonusTotalWin(0);

          setIsBoughtBonusActive(false);
          setAccumulatedBonusMultiplier(1);
          setCurrentDisplayMultiplier(1);
          audioManager.playAmbient();
        }
      }

      if (res.data.triggeredFreeSpins > 0) {
        toast.success(`🎉 BONUS! ${res.data.triggeredFreeSpins} Free Spins!`, {
          duration: 5000,
          icon: "🎰",
        });
        audioManager.playBonusAmbient();

        if (!isBoughtBonusActive) {
          setIsBoughtBonusActive(true);
          setAccumulatedBonusMultiplier(1);
          setCurrentDisplayMultiplier(1);
          setBonusTotalWin(0);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Spin failed");
      console.error("Spin error:", err);
      setIsAutoPlaying(false);
      setIsReelSpinning(false);
      audioManager.stopSpinLoop();
    } finally {
      setIsSpinning(false);
      if (!isBoughtBonusActive) {
        setCurrentDisplayMultiplier(1);
      }
    }
  };

  const handleChestSequence = async (chestTransforms, gridBeforeChests) => {
    setGrid(gridBeforeChests);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Highlight chests
    const allChestPositions = chestTransforms.map((t) => t.chestPosition);
    setChestPositions(allChestPositions);

    toast.success("🎁 CHEST APPEARED!", { duration: 2000 });
    audioManager.play("chest");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setChestPositions([]);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 2. For each chest, highlight original symbols, then transform
    for (const transform of chestTransforms) {
      const originalPositions = transform.originalSymbols.map(
        (s) => s.position
      );

      setChestTransformPositions(originalPositions);
      toast.success("TRANSFORMING...", { duration: 1500 });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) => [...row]);
        let scatterAdded = false;

        transform.resultingSymbols.forEach((resulstingSym, idx) => {
          const [row, col] = transform.transformed[idx];
          newGrid[row][col] = resulstingSym;

          if (resulstingSym.id === "SCATTER") scatterAdded = true;
        });

        if (scatterAdded) {
          audioManager.play("scatterLand");
        }

        const [cRow, cCol] = transform.chestPosition;
        newGrid[cRow][cCol] = {
          ...newGrid[cRow][cCol],
          id: "CHEST_OPENED",
          name: "Opened Chest",
        };

        return newGrid;
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      setChestTransformPositions([]);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const processCascades = async (cascades, startingGrid) => {
    let currentGridState = startingGrid;

    for (let i = 0; i < cascades.length; i++) {
      const cascade = cascades[i];
      const nextGrid = cascade.nextGridState;

      if (!isBoughtBonusActive) {
        setCurrentDisplayMultiplier(cascade.progressiveMult);
      }

      if (isBoughtBonusActive) {
        if (cascade.bonusMultiplier) {
          setCurrentDisplayMultiplier(cascade.bonusMultiplier);
        }
      } else {
        setCurrentDisplayMultiplier(cascade.progressiveMult);
      }

      setGrid(cascade.grid);

      let droppedGrid = nextGrid;
      if (cascade.chestTransforms && cascade.chestTransforms.length > 0) {
        droppedGrid = getGridBeforeChests(nextGrid, cascade.chestTransforms);
      }

      const prevScatterCount = countScattersInGrid(cascade.grid);
      const droppedScatterCount = countScattersInGrid(droppedGrid);
      const shouldPlayScatterSound = droppedScatterCount > prevScatterCount;

      currentGridState = cascade.grid;
      await sleep(400);

      const allWinningPositions = cascade.clusters.flatMap((cluster) => {
        if (cluster.symbol === "📦" || cluster.symbol === "CHEST_OPENED") {
          return [];
        }
        return cluster.positions;
      });
      setWinningPositions(allWinningPositions);

      if (cascade.cascadeWin > 0) {
        audioManager.play("cascade");
        toast.success(`💰 +$${cascade.cascadeWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      await sleep(600);

      setIsCascading(true);
      setWinningPositions([]);

      let gridToDisplay = nextGrid;
      if (cascade.chestTransforms && cascade.chestTransforms.length > 0) {
        gridToDisplay = getGridBeforeChests(nextGrid, cascade.chestTransforms);
      }

      setGrid(gridToDisplay);

      if (shouldPlayScatterSound) {
        audioManager.play("scatterLand");
      }

      await sleep(450);

      setIsCascading(false);

      if (cascade.chestTransforms && cascade.chestTransforms.length > 0) {
        await handleChestSequence(cascade.chestTransforms, gridToDisplay);

        const postChestGrid = gridToDisplay.map((row) => [...row]);
        cascade.chestTransforms.forEach((t) => {
          const [r, c] = t.chestPosition;
          postChestGrid[r][c] = {
            id: "CHEST_OPENED",
            name: "Opened Chest",
            uniqueId: `chest_open_${r}_${c}_${Date.now()}`,
          };
          t.resultingSymbols.forEach((sym, idx) => {
            const [tr, tc] = t.transformed[idx];
            postChestGrid[tr][tc] = sym;
          });
        });
        currentGridState = postChestGrid;
      } else {
        currentGridState = gridToDisplay;
      }
    }
    if (!isBoughtBonusActive) {
      setCurrentDisplayMultiplier(1);
    }

    await sleep(300);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#a855f7", "#ec4899", "#8b5cf6"],
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#a855f7", "#ec4899", "#8b5cf6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  const handleBuyBonus = async () => {
    const bonusCost = betAmount * 100;

    if (user.balance < bonusCost) {
      toast.error("Insufficient balance!");
      return;
    }

    try {
      const res = await slotsAPI.buyBonus(betAmount);
      updateUser({
        balance: res.data.newBalance,
        freeSpins: res.data.totalFreeSpins,
      });

      audioManager.play("buyBonus");
      audioManager.playBonusAmbient();

      setIsBoughtBonusActive(true);
      setAccumulatedBonusMultiplier(1);
      setCurrentDisplayMultiplier(1);
      setIsFirstBoughtSpin(true);
      setBonusTotalWin(0);

      toast.success("🎰 BONUS PURCHASED! Starting...", { duration: 3000 });
      setShowBuyBonusModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to buy bonus");
    }
  };

  const handleMaxBet = () => {
    audioManager.play("click");
    setBetAmount(100);
    toast.success("Max bet selected: $100");
  };

  const increaseBet = () => {
    const currentIndex = BET_PRESETS.indexOf(betAmount);
    if (currentIndex < BET_PRESETS.length - 1) {
      setBetAmount(BET_PRESETS[currentIndex + 1]);
      audioManager.play("click");
    }
  };

  const decreaseBet = () => {
    const currentIndex = BET_PRESETS.indexOf(betAmount);
    if (currentIndex > 0) {
      setBetAmount(BET_PRESETS[currentIndex - 1]);
      audioManager.play("click");
    }
  };

  const toggleAutoplay = () => {
    setIsAutoPlaying(!isAutoPlaying);
    toast.success(isAutoPlaying ? "Autoplay stopped" : "Autoplay started");
    audioManager.play("click");
  };

  const addTransaction = (transaction) => {
    setTransactionHistory((prev) => [transaction, ...prev].slice(0, 10));
  };

  return (
    <div className="relative min-h-[100dvh] pb-4 flex flex-col justify-between">
      {/* Modals */}
      {showBuyBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900/95 border-2 border-purple-500 rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-3xl font-bold text-white mb-4">
              💎 Buy Bonus Round
            </h2>
            <p className="text-gray-300 mb-6">
              Purchase 10 free spins for ${(betAmount * 100).toFixed(2)}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleBuyBonus}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowBuyBonusModal(false);
                  audioManager.play("click");
                }}
                className="flex-1 px-6 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout table modal*/}
      {showPayoutTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900/95 border-2 border-purple-500 rounded-2xl p-8 max-w-3xl w-full my-8">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              💰 Payout Table
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xl font-bold text-purple-400 mb-3">
                  Tier 1 Symbols
                </h3>
                <div className="space-y-2">
                  {Object.entries(PAYOUT_TABLE).map(([size, payouts]) => (
                    <div
                      key={size}
                      className="flex justify-between text-sm text-gray-300"
                    >
                      <span>{size} symbols:</span>
                      <span className="text-green-400">{payouts.tier1}x</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-pink-400 mb-3">
                  Tier 2 Symbols
                </h3>
                <div className="space-y-2">
                  {Object.entries(PAYOUT_TABLE).map(([size, payouts]) => (
                    <div
                      key={size}
                      className="flex justify-between text-sm text-gray-300"
                    >
                      <span>{size} symbols:</span>
                      <span className="text-green-400">{payouts.tier2}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-purple-900/30 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-2">
                Special Symbols
              </h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>
                  🌟 <strong>WILD</strong> - Connects any adjacent symbols
                </li>
                <li>
                  ⚡ <strong>2x MULT</strong> - Doubles wins
                </li>
                <li>
                  🔥 <strong>5x MULT</strong> - 5x wins
                </li>
                <li>
                  💎 <strong>10x MULT</strong> - 10x wins
                </li>
                <li>
                  💫 <strong>1000x MULT</strong> - 1000x wins (ULTRA RARE)
                </li>
                <li>
                  ⭐ <strong>SCATTER</strong> - 3+ triggers 10 free spins
                </li>
                <li>
                  🎁 <strong>CHEST</strong> - Transforms 3 symbols into
                  wilds/scatters
                </li>
              </ul>
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              Minimum cluster size:{" "}
              <strong className="text-white">6 symbols</strong>
            </p>
            <button
              onClick={() => {
                setShowPayoutTable(false);
                audioManager.play("click");
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Total Win Splash */}
      {showTotalWin &&
        createPortal(
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <div className="text-center animate-bounce">
              <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]">
                💰 ${totalWinAmount.toFixed(2)} 💰
              </div>
              <div className="text-3xl md:text-5xl font-bold text-white mt-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                TOTAL WIN!
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Floating Multiplier Tracker (Mobile Responsive) */}
      {createPortal(
        <div className="fixed top-4 right-4 z-[90] lg:bottom-8 lg:right-auto lg:left-8 lg:top-auto pointer-events-none">
          <div
            className={`rounded-2xl p-3 lg:p-6 shadow-2xl transition-all duration-300 scale-75 lg:scale-100 origin-top-right ${
              isBoughtBonusActive
                ? "bg-gradient-to-br from-yellow-500 to-orange-600 border-4 border-yellow-300 animate-pulse"
                : currentDisplayMultiplier > 1
                ? "bg-gradient-to-br from-blue-500 to-cyan-600 border-4 border-cyan-300 animate-pulse"
                : "bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-600"
            }`}
          >
            <div className="text-center">
              <div className="text-[10px] lg:text-sm font-bold text-white uppercase tracking-wider mb-1">
                {isBoughtBonusActive ? "Bonus Multiplier" : "Multiplier"}
              </div>
              <div className="text-3xl lg:text-5xl font-black text-white drop-shadow-lg">
                {currentDisplayMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bonus Win Tracker */}
      {isBoughtBonusActive &&
        bonusTotalWin > 0 &&
        createPortal(
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[90]">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 border-4 border-green-300 rounded-2xl p-6 shadow-2xl">
              <div className="text-center">
                <div className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Bonus Total Win
                </div>
                <div className="text-4xl font-black text-white drop-shadow-lg">
                  ${bonusTotalWin.toFixed(2)}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 px-2 lg:px-4 w-full max-w-[1600px] mx-auto mt-2 lg:mt-10">
        {/* LEFT PANEL */}
        <div className="order-2 lg:order-1 flex flex-row lg:flex-col gap-2 lg:gap-6 text-white w-full lg:w-64 justify-between lg:justify-start">
          {/* Balance / Spins */}
          <div className="flex-1 bg-gray-900/80 backdrop-blur-md rounded-xl p-3 lg:p-6 border border-purple-500/30 flex lg:flex-col items-center justify-between gap-2">
            <div className="text-center lg:text-left">
              <span className="text-[10px] lg:text-sm text-purple-300 font-semibold uppercase tracking-wider block">
                Balance
              </span>
              <div className="text-lg lg:text-3xl font-bold text-purple-400">
                ${(user?.balance ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="w-px h-8 bg-purple-500/30 lg:hidden"></div>

            <div className="text-center lg:text-left">
              <span className="text-[10px] lg:text-sm text-purple-300 font-semibold uppercase tracking-wider block">
                Spins
              </span>
              <div className="text-lg lg:text-3xl font-bold text-pink-400">
                {user?.freeSpins ?? 0}
              </div>
            </div>
          </div>

          {/* Hide History on Mobile */}
          <div className="hidden lg:block bg-gray-900/80 backdrop-blur-md rounded-xl p-4 border border-purple-500/30 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-purple-300 mb-3">
              📜 Last 10 Spins
            </h3>
            {transactionHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No spins</p>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((tx, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-400 border-b border-gray-700 pb-1"
                  >
                    Win:{" "}
                    <span className="text-green-400">${tx.win.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE: THE GRID */}
        <div className="order-1 lg:order-2 relative w-full max-w-[500px] lg:max-w-[900px] aspect-[6/5] flex flex-col items-center justify-center">
          <SlotGrid
            grid={grid}
            winningPositions={winningPositions}
            isRolling={isReelSpinning}
            isCascading={isCascading}
            chestTransformPositions={chestTransformPositions}
            chestPositions={chestPositions}
            totalScatters={totalScatters}
            onLastReelStop={() => {
              if (reelFinishedResolver.current) reelFinishedResolver.current();
            }}
          />

          {/* Skip Button (Mobile Overlay) */}
          <AnimatePresence>
            {isReelSpinning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-4 z-50 whitespace-nowrap"
                onClick={() => {
                  skipSignalRef.current = true;
                }}
              >
                <div className="bg-purple-900/90 backdrop-blur-md border border-purple-400 text-purple-100 px-6 py-3 rounded-full shadow-lg font-bold uppercase tracking-widest text-sm active:scale-95 transition-transform">
                  TAP TO SKIP
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="order-3 flex flex-col gap-3 lg:gap-6 w-full lg:w-64 pb-safe-area">
          {/* Bet Selector */}
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-3 lg:p-6 border border-purple-500/30">
            <div className="flex justify-between items-center mb-2 lg:mb-4">
              <h3 className="text-sm lg:text-lg font-bold text-purple-300">
                Bet
              </h3>
              <div className="text-xl lg:text-4xl font-bold text-purple-400">
                ${betAmount.toFixed(2)}
              </div>
            </div>

            <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-2 pb-2 lg:pb-0 scrollbar-hide">
              {BET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setBetAmount(preset);
                    audioManager.play("click");
                  }}
                  disabled={isSpinning}
                  className={`min-w-[60px] px-3 py-2 rounded-lg font-semibold transition-all text-sm ${
                    betAmount === preset
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN ACTIONS */}
          <div className="flex gap-2 h-16 lg:h-auto">
            <button
              onClick={toggleAutoplay}
              disabled={isSpinning || isBoughtBonusActive}
              className={`w-1/3 rounded-xl font-bold text-xs lg:text-xl border-2 flex flex-col items-center justify-center ${
                isAutoPlaying
                  ? "bg-red-900/50 border-red-500"
                  : "bg-blue-900/50 border-cyan-500"
              }`}
            >
              <span>{isAutoPlaying ? "STOP" : "AUTO"}</span>
            </button>

            <button
              onClick={handleSpin}
              disabled={
                !(
                  (user?.balance >= betAmount || user?.freeSpins > 0) &&
                  !isSpinning
                )
              }
              className="w-2/3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-2xl lg:text-3xl rounded-xl border-b-4 border-indigo-900 shadow-lg active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
            >
              SPIN
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setShowBuyBonusModal(true);
                audioManager.play("click");
              }}
              className="py-3 px-2 bg-pink-900/40 border border-pink-500/50 rounded-lg text-xs font-bold text-pink-100"
            >
              BUY BONUS
            </button>
            <button
              onClick={() => {
                setShowPayoutTable(true);
                audioManager.play("click");
              }}
              className="py-3 px-2 bg-blue-900/40 border border-blue-500/50 rounded-lg text-xs font-bold text-blue-100"
            >
              PAYTABLE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotGame;
