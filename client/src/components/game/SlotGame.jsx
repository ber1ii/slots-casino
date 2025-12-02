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

// --- HELPER FUNCTIONS ---
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
  const hasRestoredSession = useRef(false);
  const keyList = Object.keys(SYMBOL_SPRITES);

  const totalScatters = useMemo(() => countScattersInGrid(grid), [grid]);

  if (loading) return null;

  // --- USE EFFECTS ---
  useEffect(() => {
    if (loading || !user) {
      return;
    }

    if (hasRestoredSession.current) {
      return;
    }

    hasRestoredSession.current = true;

    const isBonus = user.bonusSession?.isActive;

    if (isBonus) {
      setIsBoughtBonusActive(true);
      setBetAmount(user.bonusSession.betAmount);
      setAccumulatedBonusMultiplier(user.bonusSession.accumulatedMultiplier);

      setBonusTotalWin(user.bonusSession.accumulatedWin);

      setCurrentDisplayMultiplier(user.bonusSession.accumulatedMultiplier);
      toast("Bonus session restored!", { icon: "🔄", duration: 2000 });
    }
    audioManager.resume(isBonus);
  }, [user, loading]);

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
    const unlockAudio = () => {
      const isBonus = user?.bonusSession?.isActive || isBoughtBonusActive;
      audioManager.resume(isBonus);

      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
    };
  }, [user?.bonusSession?.isActive, isBoughtBonusActive]);

  useEffect(() => {
    const handleVisibilityChanged = () => {
      if (document.hidden) {
        audioManager.stopAll();
      } else {
        if (isBoughtBonusActive) {
          audioManager.playBonusAmbient();
        } else {
          audioManager.playAmbient();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChanged);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChanged);
    };
  }, [isBoughtBonusActive]);

  useEffect(() => {
    if (grid.length === 0) {
      // Pick random symbols for visual purposes
      const initialGrid = Array(GRID_ROWS)
        .fill(null)
        .map((_, r) =>
          Array(GRID_COLS)
            .fill(null)
            .map((_, c) => {
              const randomKey =
                keyList[Math.floor(Math.random() * keyList.length)];
              return {
                id: randomKey,
                name: "initial",
                uniqueId: `init_${r}_${c}`,
              };
            })
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

      if (isSpinning || isBoughtBonusActive) {
        if (
          ["arrowup", "arrowdown", "m", "a", "b"].includes(e.key.toLowerCase())
        ) {
          return;
        }
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
  }, [
    isSpinning,
    betAmount,
    isAutoPlaying,
    isReelSpinning,
    isBoughtBonusActive,
  ]);

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

  // --- GAME LOGIC (Unchanged) ---
  const waitForAnimationOrSkip = async (minDurationMs) => {
    let finishResolve;
    const finishPromise = new Promise((resolve) => {
      finishResolve = resolve;
    });
    reelFinishedResolver.current = finishResolve;

    const startTime = Date.now();
    const remainingTime = minDurationMs;
    
    if(skipSignalRef.current) return true;

    const timePromise = new Promise((resolve) => 
      setTimeout(resolve, remainingTime)
    );

    await Promise.race([finishPromise, timePromise]);

    return skipSignalRef.current;
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

    if (!isBoughtBonusActive) {
      setTotalWinAmount(0);
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

      const isBonusContinuing = res.data.bonusSession?.isActive;

      const previousBonusTotal = bonusTotalWin;
      let newCalculatedTotal = previousBonusTotal;

      if (isBoughtBonusActive) {
        if (isBonusContinuing) {
          newCalculatedTotal = res.data.bonusSession.accumulatedWin;
          setBonusTotalWin(newCalculatedTotal);
        } else {
          newCalculatedTotal = previousBonusTotal + res.data.totalWin;
          setBonusTotalWin(newCalculatedTotal);
        }
      }

      if (user.freeSpins === 0) {
        const intermediateBalance = res.data.newBalance - res.data.totalWin;
        updateUser({ balance: intermediateBalance });
      } else {
        updateUser({ freeSpins: res.data.freeSpinsRemaining });
      }

      const wasSkipped = await waitForAnimationOrSkip(calculatedDuration);
      audioManager.stopSpinLoop();
      if (wasSkipped) {
        audioManager.stopSpinLoop();
        if (reelFinishedResolver.current) reelFinishedResolver.current();
      }

      setIsReelSpinning(false);

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
        ...(res.data.bonusSession && { bonusSession: res.data.bonusSession }),
      });

      if (!isBoughtBonusActive) {
        addTransaction({
          bet: betAmount,
          win: res.data.totalWin,
          balance: res.data.newBalance,
          timestamp: new Date().toLocaleTimeString(),
        });
      }

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
        if (cluster.symbol.id === "CHEST_OPENED") return [];
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

  // --- RENDER ---
  return (
    <div className="w-full h-[calc(100dvh-80px)] lg:min-h-screen lg:h-auto flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-center gap-4 lg:gap-12 px-2 lg:px-4 pt-12 lg:pt-0 max-w-[1600px] mx-auto lg:mt-8 overflow-y-auto lg:overflow-hidden pb-8 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden lg:flex order-2 lg:order-1 flex-col gap-4 text-white w-72 justify-start h-[85vh]">
        {/* Balance */}
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden group shrink-0">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <span className="text-xs text-purple-300/70 font-bold uppercase tracking-widest mb-1 block">
              Total Balance
            </span>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">
              ${(user?.balance ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent my-3"></div>
          <div className="relative z-10">
            <span className="text-xs text-pink-300/70 font-bold uppercase tracking-widest mb-1 block">
              Free Spins
            </span>
            <div className="text-2xl font-black text-white drop-shadow-md">
              {user?.freeSpins ?? 0}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 sticky top-0 bg-gray-900/90 py-2 backdrop-blur-md border-b border-white/5">
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
                    className={tx.isBonus ? "text-yellow-500" : "text-gray-400"}
                  >
                    {tx.bet === "BONUS" ? "BONUS" : "SPIN"}
                  </span>
                  <span
                    className={tx.win > 0 ? "text-green-400" : "text-gray-600"}
                  >
                    ${tx.win.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multiplier & Win Cards */}
        <div className="flex flex-col gap-2 shrink-0">
          <div
            className={`bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border transition-colors duration-300 ${
              isBoughtBonusActive
                ? "border-orange-500/50 bg-orange-900/20"
                : currentDisplayMultiplier > 1
                ? "border-cyan-400/50 bg-blue-900/20"
                : "border-white/10"
            }`}
          >
            <div className="text-center">
              <span className="text-xs text-blue-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Multiplier
              </span>
              <div className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                {currentDisplayMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>
          <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <div className="text-center">
              <span className="text-xs text-yellow-300/70 font-bold uppercase tracking-[0.2em] mb-1 block">
                Current Win
              </span>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                {isBoughtBonusActive || user?.bonusSession?.isActive
                  ? bonusTotalWin.toFixed(2)
                  : totalWinAmount.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE: THE GRID */}
      <div className="order-1 lg:order-2 relative w-full lg:max-w-[1200px] flex-none lg:flex-1 flex flex-col items-center justify-center z-10 py-0 lg:py-1">
        {/* GRID CONTAINER */}
        <div className="relative w-full max-w-[98vw] lg:max-w-none aspect-[5/6] lg:aspect-square max-h-[70vh] lg:max-h-[85vh] overflow-hidden rounded-2xl lg:rounded-3xl bg-gray-900 shadow-2xl flex flex-col border border-white/5">
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
            onGridClick={() => {
              if (isReelSpinning) skipSignalRef.current = true;
            }}
          />
        </div>

        {/* SKIP BUTTON */}
        <AnimatePresence>
          {isReelSpinning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              // FIX: Kept 'hidden lg:flex' to ensure this doesn't clutter mobile
              className="w-full hidden lg:flex justify-center mt-2 lg:mt-6 overflow-hidden shrink-0"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skipSignalRef.current = true;
                }}
                className="bg-purple-900/90 backdrop-blur-md border border-purple-400 text-white px-6 py-2 lg:px-8 lg:py-3 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] font-bold uppercase tracking-widest text-[10px] lg:text-xs hover:bg-purple-800 active:scale-95 transition-all z-50"
              >
                Skip Sequence
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="order-3 flex flex-col gap-1 lg:gap-6 w-full lg:w-72 shrink-0 pb-1 lg:pb-0 z-30 lg:mt-8 mt-0">
        {/* MOBILE WIN TRACKER */}
        <div className="lg:hidden flex items-center justify-between bg-gray-900/80 backdrop-blur-xl border border-yellow-500/20 rounded-xl px-4 py-2 shadow-lg mb-1">
          <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">
            Win
          </span>
          <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm">
            ${totalWinAmount > 0 ? totalWinAmount.toFixed(2) : "0.00"}
          </div>
        </div>

        <div className="bg-gray-900/60 lg:bg-gray-900/40 backdrop-blur-xl rounded-xl p-2 lg:p-5 border border-white/10">
          <div className="flex justify-between items-center mb-1 lg:mb-4">
            <h3 className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-widest">
              Wager
            </h3>
            <div className="text-base lg:text-2xl font-black text-white font-mono">
              ${betAmount.toFixed(2)}
            </div>
          </div>
          <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-2 pb-1 lg:pb-0 scrollbar-hide">
            {BET_PRESETS.map((preset) => {
              const isLocked =
                isSpinning ||
                isBoughtBonusActive ||
                user?.bonusSession?.isActive;

              return (
                <button
                  key={preset}
                  onClick={() => {
                    setBetAmount(preset);
                    audioManager.play("click");
                  }}
                  disabled={isLocked}
                  className={`min-w-[45px] lg:min-w-[60px] px-2 py-2 rounded-lg font-bold text-[10px] lg:text-sm transition-all border ${
                    betAmount === preset
                      ? isLocked
                        ? "bg-purple-900 border-purple-700 text-gray-400 cursor-not-allowed" // Selected but locked
                        : "bg-purple-600 border-purple-400 text-white" // Selected
                      : isLocked
                      ? "bg-black/20 border-white/5 text-gray-700 cursor-not-allowed" // Not selected and locked
                      : "bg-black/40 border-white/10 text-gray-500 hover:bg-gray-800" // Normal
                  }`}
                >
                  ${preset}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 h-12 lg:h-24">
          <button
            onClick={toggleAutoplay}
            disabled={isSpinning || isBoughtBonusActive}
            className={`w-14 lg:w-20 rounded-xl font-bold text-[9px] lg:text-[10px] uppercase tracking-widest border border-white/10 flex flex-col items-center justify-center transition-all ${
              isAutoPlaying
                ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                : "bg-gray-800/60 text-gray-400"
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
            className="relative flex-1 rounded-full flex items-center justify-center group bg-gradient-to-b from-gray-800 to-black border-2 lg:border-4 border-purple-900/50 shadow-lg active:scale-95 transition-all"
          >
            <div className="hidden lg:block absolute inset-1 rounded-full border border-purple-500/30 border-t-purple-400 animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-1 lg:inset-2 rounded-full bg-gradient-to-br from-indigo-600 to-purple-900 flex items-center justify-center">
              <span className="text-xl lg:text-3xl font-black text-white tracking-widest drop-shadow-md">
                SPIN
              </span>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-1">
          <button
            onClick={() => setShowBuyBonusModal(true)}
            disabled={isSpinning || isBoughtBonusActive}
            className="py-2 lg:py-3 bg-pink-900/20 border border-pink-500/30 rounded-lg text-[9px] lg:text-[10px] font-bold text-pink-200 uppercase tracking-widest"
          >
            Buy Bonus
          </button>
          <button
            onClick={() => setShowPayoutTable(true)}
            className="py-2 lg:py-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-[9px] lg:text-[10px] font-bold text-blue-200 uppercase tracking-widest"
          >
            Paytable
          </button>
        </div>
      </div>

      {/* --- MODALS & PORTALS */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
          {/* Container: 
              - max-h-[85dvh] ensures it fits on mobile screens with browser bars 
              - flex-col allows us to lock header/footer and scroll the middle
          */}
          <div className="bg-gray-900/95 border border-blue-500/50 rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[85dvh] flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.2)]">
            {/* 1. HEADER (Fixed at top) */}
            <div className="p-4 sm:p-6 border-b border-white/10 shrink-0 flex justify-between items-center bg-gray-900/95 rounded-t-xl sm:rounded-t-2xl">
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase">
                Paytable
              </h2>
              <button
                onClick={() => setShowPayoutTable(false)}
                className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 sm:h-8 sm:w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 2. SCROLLABLE CONTENT (Middle area) */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-gray-900/50">
              {/* SYMBOL VISUALS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                {/* Tier 1 Visuals */}
                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h3 className="text-sm sm:text-lg font-bold text-purple-400 mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">
                    Common Symbols
                  </h3>
                  {/* Flex wrap ensures icons fit on any screen width */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                    {["BLUE_GEM", "GREEN_GEM", "PURPLE_GEM", "RED_GEM"].map(
                      (key) => (
                        <div
                          key={key}
                          className="w-10 h-10 sm:w-16 sm:h-16 relative bg-black/20 rounded-lg p-1"
                        >
                          <img
                            src={SYMBOL_SPRITES[key]}
                            alt={key}
                            className="w-full h-full object-contain drop-shadow-lg"
                          />
                        </div>
                      )
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-3 italic text-center md:text-left">
                    Low volatility, high frequency.
                  </p>
                </div>

                {/* Tier 2 Visuals */}
                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
                  <h3 className="text-sm sm:text-lg font-bold text-pink-400 mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">
                    Rare Symbols
                  </h3>
                  <div className="flex flex-wrap gap-3 sm:gap-4 justify-center md:justify-start">
                    {["RING", "HOURGLASS", "CROWN"].map((key) => (
                      <div
                        key={key}
                        className="w-10 h-10 sm:w-16 sm:h-16 relative bg-black/20 rounded-lg p-1"
                      >
                        <img
                          src={SYMBOL_SPRITES[key]}
                          alt={key}
                          className="w-full h-full object-contain drop-shadow-lg"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-3 italic text-center md:text-left">
                    High value, connects big wins.
                  </p>
                </div>

                {/* Specials Section */}
                <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 md:col-span-2">
                  <h3 className="text-sm sm:text-lg font-bold text-yellow-400 mb-3 border-b border-white/10 pb-2 uppercase tracking-widest">
                    Special Items
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Scatter */}
                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                      <img
                        src={SYMBOL_SPRITES["SCATTER"]}
                        alt="Scatter"
                        className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
                      />
                      <div className="text-[10px] sm:text-xs text-gray-300">
                        <strong className="block text-white text-xs sm:text-sm">
                          SCATTER
                        </strong>
                        3+ Triggers Bonus
                      </div>
                    </div>
                    {/* Wild */}
                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                      <img
                        src={SYMBOL_SPRITES["WILD"]}
                        alt="Wild"
                        className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
                      />
                      <div className="text-[10px] sm:text-xs text-gray-300">
                        <strong className="block text-white text-xs sm:text-sm">
                          WILD
                        </strong>
                        Connects any symbol
                      </div>
                    </div>
                    {/* Multiplier */}
                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                      <img
                        src={SYMBOL_SPRITES["MULTIPLIER_1000X"]}
                        alt="Mult"
                        className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
                      />
                      <div className="text-[10px] sm:text-xs text-gray-300">
                        <strong className="block text-white text-xs sm:text-sm">
                          MULTIPLIER
                        </strong>
                        Global Win Boost
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DATA TABLES */}
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 text-center uppercase tracking-[0.2em]">
                Cluster Payouts
              </h3>

              {/* Stack on mobile, side-by-side on desktop */}
              <div className="flex flex-col md:flex-row gap-4 lg:gap-8">
                {/* TIER 1 TABLE */}
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between mb-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase border-b border-gray-700 pb-1">
                    <span>Cluster Size</span>
                    <span className="text-purple-400">Common Pay</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(PAYOUT_TABLE).map(([size, payouts]) => (
                      <div
                        key={`t1-${size}`}
                        className="flex justify-between text-xs sm:text-sm text-gray-300 border-b border-white/5 pb-1 last:border-0"
                      >
                        <span className="font-mono text-purple-300">
                          {size}+
                        </span>
                        <span className="text-white font-bold">
                          {payouts.tier1}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIER 2 TABLE */}
                <div className="flex-1 bg-gray-800/50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between mb-2 text-[10px] sm:text-xs font-bold text-gray-500 uppercase border-b border-gray-700 pb-1">
                    <span>Cluster Size</span>
                    <span className="text-pink-400">Rare Pay</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(PAYOUT_TABLE).map(([size, payouts]) => (
                      <div
                        key={`t2-${size}`}
                        className="flex justify-between text-xs sm:text-sm text-gray-300 border-b border-white/5 pb-1 last:border-0"
                      >
                        <span className="font-mono text-pink-300">{size}+</span>
                        <span className="text-white font-bold">
                          {payouts.tier2}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FOOTER (Fixed at bottom) */}
            <div className="p-4 border-t border-white/10 bg-gray-900/95 rounded-b-xl sm:rounded-b-2xl shrink-0">
              <button
                onClick={() => setShowPayoutTable(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-base font-bold rounded-lg uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Close Paytable
              </button>
            </div>
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

      {createPortal(
        // FLOATING MULTIPLIER POPUP
        <div className="fixed top-[85px] right-2 z-[90] lg:hidden pointer-events-none">
          <div
            className={`rounded-xl p-3 shadow-2xl transition-all duration-300 scale-75 origin-top-right border-2 backdrop-blur-xl ${
              isBoughtBonusActive
                ? "bg-orange-900/80 border-orange-500 animate-pulse"
                : currentDisplayMultiplier > 1
                ? "bg-blue-900/80 border-cyan-400"
                : "bg-gray-900/80 border-gray-600"
            }`}
          >
            <div className="text-center">
              <div className="text-[9px] font-bold text-white uppercase tracking-wider mb-1">
                MULTIPLIER
              </div>
              <div className="text-3xl font-black text-white drop-shadow-lg">
                {currentDisplayMultiplier.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SlotGame;
