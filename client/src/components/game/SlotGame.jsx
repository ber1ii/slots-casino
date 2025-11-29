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

// ... (Helper functions remain the same) ...
const getGridBeforeChests = (baseGrid, chestTransforms) => {
  const tempGrid = baseGrid.map((row) => row.map((cell) => ({ ...cell })));
  chestTransforms.forEach((transform) => {
    const [cRow, cCol] = transform.chestPosition;
    tempGrid[cRow][cCol] = {
      id: "CHEST",
      uniqueId: transform.chestUniqueId,
      name: "Chest",
    };
    transform.originalSymbols.forEach((orig) => {
      const [oRow, oCol] = orig.position;
      tempGrid[oRow][oCol] = {
        id: orig.symbolId,
        uniqueId: orig.uniqueId,
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
  const { user, updateUser, loading } = useAuth();
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

  const totalScatters = useMemo(() => countScattersInGrid(grid), [grid]);

  if (loading) return null;

  // ... (UseEffects remain the same) ...
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
      if (!isBoughtBonusActive) audioManager.playAmbient();
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
    if (grid.length === 0) {
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
    }
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

  const waitForAnimationOrSkip = async (minDurationMs) => {
    let finishResolve;
    const finishPromise = new Promise((resolve) => {
      finishResolve = resolve;
    });
    reelFinishedResolver.current = finishResolve;
    const startTime = Date.now();
    while (Date.now() - startTime < minDurationMs) {
      if (skipSignalRef.current) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!skipSignalRef.current) await finishPromise;
    return false;
  };

  const handleSpin = async () => {
    if (!isBoughtBonusActive) audioManager.playAmbient();
    if (isSpinning) return;
    if (user.balance < betAmount && user.freeSpins === 0) {
      toast.error("Insufficient balance!");
      setIsAutoPlaying(false);
      audioManager.play("error");
      return;
    }

    if (navigator.vibrate) navigator.vibrate(20);

    setIsSpinning(true);
    setIsReelSpinning(true);
    setWinningPositions([]);
    skipSignalRef.current = false;
    setChestTransformPositions([]);
    setChestPositions([]);

    // Reset visual win on new spin if not accumulating
    if (!isBoughtBonusActive) {
      setTotalWinAmount(0);
    }

    if (!isBoughtBonusActive) {
      setShowTotalWin(false);
      setCurrentDisplayMultiplier(1);
      setAccumulatedBonusMultiplier(1);
    } else {
      setCurrentDisplayMultiplier(accumulatedBonusMultiplier);
    }

    audioManager.startSpinSequence();

    try {
      const spinResult = await slotsAPI.spin(
        betAmount,
        isBoughtBonusActive,
        isFirstBoughtSpin,
        accumulatedBonusMultiplier
      );
      const res = { data: spinResult.data };
      const initialChestTransforms = res.data.initialChestTransforms || [];
      const BASE_DURATION = 2000;
      const EXTRA_BUFFER = 500;
      const lastColIndex = GRID_COLS - 1;
      const COLUMN_DELAY_STEP = 300;
      const calculatedDuration =
        BASE_DURATION + lastColIndex * COLUMN_DELAY_STEP + EXTRA_BUFFER;

      let initialVisualGrid = res.data.initialGrid || res.data.finalGrid;
      setGrid(initialVisualGrid);

      if (isFirstBoughtSpin) setIsFirstBoughtSpin(false);
      if (res.data.bonusMultiplier !== undefined)
        setAccumulatedBonusMultiplier(res.data.bonusMultiplier);

      const intermediateBalace = res.data.newBalance - res.data.totalWin;
      updateUser({ balance: intermediateBalace });

      const wasSkipped = await waitForAnimationOrSkip(calculatedDuration);
      audioManager.stopSpinLoop();
      if (wasSkipped) {
        audioManager.stopSpinLoop();
        if (reelFinishedResolver.current) reelFinishedResolver.current();
      }

      setIsReelSpinning(false);

      if (isBoughtBonusActive && res.data.totalWin > 0)
        setBonusTotalWin((prev) => prev + res.data.totalWin);

      let gridForcasCades = initialVisualGrid;
      if (initialChestTransforms.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await handleChestSequence(initialChestTransforms, initialVisualGrid);
        gridForcasCades = getGridBeforeChests(
          initialVisualGrid,
          initialChestTransforms
        );
      }

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

      // Update total win amount for the UI indicator and Splash
      if (res.data.totalWin > 0) {
        setTotalWinAmount(res.data.totalWin);
      }

      if (res.data.totalWin > 0 && !isBoughtBonusActive) {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setShowTotalWin(true);
        if (res.data.totalWin > betAmount * 100) audioManager.play("bigWin");
        else audioManager.play("clusterWin");
        triggerConfetti();
        totalWinTimeoutRef.current = setTimeout(() => {
          setShowTotalWin(false);
        }, 2000);
      } 

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
          await new Promise((resolve) => setTimeout(resolve, 3000));
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
        toast.success(`BONUS! ${res.data.triggeredFreeSpins} Free Spins!`, {
          duration: 5000,
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
      setIsAutoPlaying(false);
      setIsReelSpinning(false);
      audioManager.stopSpinLoop();
    } finally {
      setIsSpinning(false);
      if (!isBoughtBonusActive) setCurrentDisplayMultiplier(1);
    }
  };

  const handleChestSequence = async (chestTransforms, gridBeforeChests) => {
    setGrid(gridBeforeChests);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const allChestPositions = chestTransforms.map((t) => t.chestPosition);
    setChestPositions(allChestPositions);
    audioManager.play("chest");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setChestPositions([]);
    await new Promise((resolve) => setTimeout(resolve, 300));

    for (const transform of chestTransforms) {
      const originalPositions = transform.originalSymbols.map(
        (s) => s.position
      );
      setChestTransformPositions(originalPositions);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) => [...row]);
        let scatterAdded = false;
        transform.resultingSymbols.forEach((resulstingSym, idx) => {
          const [row, col] = transform.transformed[idx];
          newGrid[row][col] = resulstingSym;
          if (resulstingSym.id === "SCATTER") scatterAdded = true;
        });
        if (scatterAdded) audioManager.play("scatterLand");
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
      if (!isBoughtBonusActive)
        setCurrentDisplayMultiplier(cascade.progressiveMult);
      if (isBoughtBonusActive && cascade.bonusMultiplier)
        setCurrentDisplayMultiplier(cascade.bonusMultiplier);
      else setCurrentDisplayMultiplier(cascade.progressiveMult);

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
        if (cluster.symbol.id === "CHEST_OPENED")
          return [];
        return cluster.positions;
      });
      setWinningPositions(allWinningPositions);

      if (cascade.cascadeWin > 0) {
        audioManager.play("cascade");
        toast.success(`+$${cascade.cascadeWin.toFixed(2)}`, {
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
      if (shouldPlayScatterSound) audioManager.play("scatterLand");
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
    if (!isBoughtBonusActive) setCurrentDisplayMultiplier(1);
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
      if (Date.now() < end) requestAnimationFrame(frame);
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
    <div className="relative w-full h-full flex flex-col justify-between p-2 lg:p-4">
      {/* ... (Modals omitted, same as before) ... */}
      {showBuyBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-gray-900/95 border border-purple-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">
              BUY BONUS
            </h2>
            <p className="text-gray-300 mb-6 font-mono text-sm">
              INITIATE 10 FREE SPINS? COST:{" "}
              <span className="text-pink-400 font-bold">
                ${(betAmount * 100).toFixed(2)}
              </span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleBuyBonus}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg uppercase tracking-widest transition-all"
              >
                CONFIRM
              </button>
              <button
                onClick={() => setShowBuyBonusModal(false)}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg uppercase tracking-widest transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayoutTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-gray-900/95 border border-blue-500/50 rounded-2xl p-8 max-w-3xl w-full">
            <h2 className="text-3xl font-black text-white mb-6 text-center">
              PAYTABLE_DATA
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
            <button
              onClick={() => setShowPayoutTable(false)}
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg uppercase tracking-widest"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {showTotalWin &&
        createPortal(
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="text-center animate-bounce">
              <div className="text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">
                ${totalWinAmount.toFixed(2)}
              </div>
              <div className="text-3xl md:text-5xl font-black text-white mt-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] uppercase tracking-[0.2em]">
                TOTAL WIN
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* --- RESPONSIVE LAYOUT CONTAINER --- */}
      {/* UPDATE: items-center -> items-start to align sidebar to top */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-12 px-2 lg:px-4 w-full max-w-[1600px] mx-auto mt-2 lg:mt-8">
        {/* LEFT PANEL */}
        <div className="order-2 lg:order-1 flex flex-row lg:flex-col gap-4 text-white w-full lg:w-72 justify-between lg:justify-start">
          {/* 1. BALANCE CARD */}
          <div className="flex-1 lg:flex-none bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 lg:p-6 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)] flex lg:flex-col items-center justify-between gap-4 relative overflow-hidden group">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
            <div className="text-center lg:text-left w-full relative z-10">
              <span className="text-[10px] lg:text-xs text-purple-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Total Balance
              </span>
              <div className="text-lg lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                ${(user?.balance ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent lg:block hidden"></div>
            <div className="text-center lg:text-left w-full relative z-10">
              <span className="text-[10px] lg:text-xs text-pink-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Free Spins
              </span>
              <div className="text-lg lg:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                {user?.freeSpins ?? 0}
              </div>
            </div>
          </div>

          {/* 2. TRANSACTION HISTORY (Scrollbar Hidden) */}
          <div className="hidden lg:block bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 sticky top-0 bg-gray-900/90 py-2 backdrop-blur-md">
              Log Data
            </h3>
            {transactionHistory.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono">NO DATA...</p>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-xs font-mono border-b border-white/5 pb-1"
                  >
                    <span
                      className={
                        tx.isBonus ? "text-yellow-500" : "text-gray-400"
                      }
                    >
                      {tx.bet === "BONUS" ? "BONUS" : "SPIN"}
                    </span>
                    <span
                      className={
                        tx.win > 0 ? "text-green-400" : "text-gray-600"
                      }
                    >
                      ${tx.win.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. MULTIPLIER CARD (Moved from Portal) */}
          <div
            className={`flex-1 lg:flex-none bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border transition-colors duration-300 ${
              isBoughtBonusActive
                ? "border-orange-500/50 bg-orange-900/20"
                : currentDisplayMultiplier > 1
                ? "border-cyan-400/50 bg-blue-900/20"
                : "border-white/10"
            }`}
          >
            <div className="text-center">
              <span className="text-[10px] lg:text-xs text-blue-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Multiplier
              </span>
              <div className="text-2xl lg:text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                {currentDisplayMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>

          {/* 4. TOTAL WIN INDICATOR (New) */}
          <div className="flex-1 lg:flex-none bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="text-center">
              <span className="text-[10px] lg:text-xs text-yellow-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Current Win
              </span>
              <div className="text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                ${totalWinAmount > 0 ? totalWinAmount.toFixed(2) : "0.00"}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE: THE GRID */}
        <div className="order-1 lg:order-2 relative flex-1 w-full lg:max-w-[1200px] flex flex-col items-center justify-center z-10">
          <div className="relative w-full aspect-[4/5] lg:aspect-[5/5] max-h-[55vh] md:max-h-[65vh] lg:max-h-[85vh] overflow-hidden rounded-3xl bg-gray-900 shadow-2xl">
            <SlotGrid
              grid={grid}
              winningPositions={winningPositions}
              isRolling={isReelSpinning}
              isCascading={isCascading}
              chestTransformPositions={chestTransformPositions}
              chestPositions={chestPositions}
              totalScatters={totalScatters}
              onLastReelStop={() => {
                if (reelFinishedResolver.current)
                  reelFinishedResolver.current();
              }}
              onGridClick={() => {
                if (isReelSpinning) skipSignalRef.current = true;
              }}
            />
          </div>

          {/* SKIP BUTTON CONTAINER */}
          <div className="h-10 mt-4 flex items-center justify-center w-full">
            <AnimatePresence>
              {isReelSpinning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="cursor-pointer"
                  onClick={() => {
                    skipSignalRef.current = true;
                  }}
                >
                  <div className="bg-purple-900/80 backdrop-blur-md border border-purple-400 text-white px-8 py-2 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] font-bold uppercase tracking-[0.2em] text-xs hover:bg-purple-800 transition-colors">
                    SKIP SEQUENCE
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT PANEL: CONTROLS */}
        <div className="order-3 flex flex-col gap-4 lg:gap-6 w-full lg:w-72 pb-safe-area">
          <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Wager
              </h3>
              <div className="text-2xl font-black text-white font-mono">
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
                  className={`min-w-[60px] px-3 py-2 rounded-lg font-bold text-sm transition-all border ${
                    betAmount === preset
                      ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                      : "bg-black/40 border-white/10 text-gray-500 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={toggleAutoplay}
              disabled={isSpinning || isBoughtBonusActive}
              className={`h-16 w-20 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-white/10 flex flex-col items-center justify-center transition-all ${
                isAutoPlaying
                  ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                  : "bg-gray-800/40 text-gray-400 hover:bg-gray-700/40"
              }`}
            >
              {isAutoPlaying ? "STOP" : "AUTO"}
            </button>
            <button
              onClick={handleSpin}
              disabled={
                !(
                  (user?.balance >= betAmount || user?.freeSpins > 0) &&
                  !isSpinning
                )
              }
              className="relative flex-1 h-20 lg:h-24 rounded-full flex items-center justify-center group bg-gradient-to-b from-gray-800 to-black border-4 border-purple-900/50 shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-100 disabled:opacity-50 disabled:grayscale"
            >
              <div className="absolute inset-1 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-[spin_3s_linear_infinite] group-hover:border-purple-400/60" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-600 to-purple-900 shadow-inner flex items-center justify-center group-hover:brightness-110 transition-all">
                <span className="text-xl lg:text-2xl font-black text-white tracking-[0.1em] drop-shadow-md">
                  SPIN
                </span>
              </div>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setShowBuyBonusModal(true);
                audioManager.play("click");
              }}
              className="py-3 px-2 bg-pink-900/20 border border-pink-500/30 hover:bg-pink-900/40 hover:border-pink-500/60 rounded-lg text-[10px] font-bold text-pink-200 uppercase tracking-widest transition-all"
            >
              Buy Feature
            </button>
            <button
              onClick={() => {
                setShowPayoutTable(true);
                audioManager.play("click");
              }}
              className="py-3 px-2 bg-blue-900/20 border border-blue-500/30 hover:bg-blue-900/40 hover:border-blue-500/60 rounded-lg text-[10px] font-bold text-blue-200 uppercase tracking-widest transition-all"
            >
              Paytable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotGame;
