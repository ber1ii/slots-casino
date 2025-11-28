import { useState, useEffect, useRef } from "react";
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
  const [scatterColumns, setScatterColumns] = useState([]);
  const [anticipationActive, setAnticipationActive] = useState(false);

  const [bonusTotalWin, setBonusTotalWin] = useState(0);
  const [currentDisplayMultiplier, setCurrentDisplayMultiplier] = useState(1);

  const [chestTransformPositions, setChestTransformPositions] = useState([]);
  const [chestPositions, setChestPositions] = useState([]);

  const cascadeTimeoutRef = useRef(null);
  const totalWinTimeoutRef = useRef(null);
  const skipSignalRef = useRef(false);
  const reelFinishedResolver = useRef(null);
  const keyList = Object.keys(SYMBOL_SPRITES);

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
    initializeGrid();
    audioManager.playAmbient();
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
      (isAutoPlaying || isBoughtBonusActive) &&
      !isSpinning &&
      (user?.balance >= betAmount || user?.freeSpins > 0);

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
    const startTime = Date.now();

    while (Date.now() - startTime < minDurationMs) {
      if (skipSignalRef.current) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if(skipSignalRef.current) return true;

    await new Promise((resolve) => {
      reelFinishedResolver.current = resolve;
    });

    return false;
  };

  const handleSpin = async () => {
    audioManager.playAmbient();

    if (isSpinning) return;

    if (user.balance < betAmount && user.freeSpins === 0) {
      toast.error("Insufficient balance!");
      setIsAutoPlaying(false);
      return;
    }

    setIsSpinning(true);
    setIsReelSpinning(true);
    setWinningPositions([]);
    setScatterColumns([]);
    skipSignalRef.current = false;

    if (!isBoughtBonusActive) {
      setShowTotalWin(false);
    }

    setChestTransformPositions([]);
    setChestPositions([]);

    if (!isBoughtBonusActive) {
      setCurrentDisplayMultiplier(1);
    }

    audioManager.playSpinStart();

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

      const newScatterCols = Array(GRID_COLS).fill(false);
      
      if(res.data.initialGrid) {
        res.data.initialGrid.forEach((row) => {
          row.forEach((symbol, colIndex) => {
            if(symbol.id === 'SCATTER') {
              newScatterCols[colIndex] = true;
            }
          });
        });
      }

      setScatterColumns(newScatterCols);

      let initialVisualGrid = res.data.initialGrid || res.data.finalGrid;
      setGrid(initialVisualGrid);

      if (isFirstBoughtSpin) {
        setIsFirstBoughtSpin(false);
      }

      if (res.data.bonusMultiplier !== undefined) {
        setAccumulatedBonusMultiplier(res.data.bonusMultiplier);
        if (isBoughtBonusActive) {
          setCurrentDisplayMultiplier(res.data.bonusMultiplier);
        }
      }

      const intermediateBalace = res.data.newBalance - res.data.totalWin;

      updateUser({
        balance: intermediateBalace,
        freeSpins: res.data.freeSpinsRemaining,
      });

      const wasSkipped = await waitForAnimationOrSkip(500);
      if (wasSkipped) {
        audioManager.stopSpinStart();

        if(reelFinishedResolver.current) reelFinishedResolver.current();
      }

      setIsReelSpinning(false);

      if (isBoughtBonusActive && res.data.totalWin > 0) {
        setBonusTotalWin((prev) => prev + res.data.totalWin);
      }

      // Handle Chests
      if (initialChestTransforms.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await handleChestSequence(initialChestTransforms, initialVisualGrid);
      }

      // Handle Cascades
      if (res.data.cascades && res.data.cascades.length > 0) {
        await processCascades(res.data.cascades, res.data.finalGrid);
      }

      updateUser({
        balance: res.data.newBalance,
        freeSpins: res.data.freeSpinsRemaining,
      });

      addTransaction({
        bet: betAmount,
        win: res.data.totalWin,
        balance: res.data.newBalance,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Handle Win Display
      if (res.data.totalWin > 0 && !isBoughtBonusActive) {
        setTotalWinAmount(res.data.totalWin);
        setShowTotalWin(true);
        audioManager.play("bigWin");
        triggerConfetti();

        totalWinTimeoutRef.current = setTimeout(() => {
          setShowTotalWin(false);
        }, 4000);
      } else if (res.data.totalWin > 0 && isBoughtBonusActive) {
        toast.success(`💰 Spin Win: $${res.data.totalWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      if (isBoughtBonusActive && res.data.freeSpinsRemaining === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setIsBoughtBonusActive(false);
        setAccumulatedBonusMultiplier(1);
        setCurrentDisplayMultiplier(1);

        const finalTotalWin = bonusTotalWin + res.data.totalWin;

        if (finalTotalWin > 0) {
          setTotalWinAmount(finalTotalWin);
          setShowTotalWin(true);
          audioManager.play("bigWin");
          triggerConfetti();

          toast.success(
            `🎉 BONUS COMPLETE! Total: $${finalTotalWin.toFixed(2)}`,
            {
              duration: 5000,
            }
          );

          setTimeout(() => {
            setShowTotalWin(false);
            setBonusTotalWin(0);
          }, 5000);
        } else {
          toast.success("Bonus round completed!");
          setBonusTotalWin(0);
        }
      }

      if (res.data.triggeredFreeSpins > 0) {
        toast.success(`🎉 BONUS! ${res.data.triggeredFreeSpins} Free Spins!`, {
          duration: 5000,
          icon: "🎰",
        });
        audioManager.play("bigWin");

        if (!isBoughtBonusActive) {
          setIsBoughtBonusActive(true);
          setAccumulatedBonusMultiplier(1);
          setCurrentDisplayMultiplier(1);
          setBonusTotalWin(0);
          toast.success("🌟 BONUS MODE ACTIVATED!", { duration: 3000 });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Spin failed");
      console.error("Spin error:", err);
      setIsAutoPlaying(false);
      setIsReelSpinning(false); // Safety turn off
    } finally {
      setIsSpinning(false);
      if (!isBoughtBonusActive) {
        setCurrentDisplayMultiplier(1);
      }
    }
  };

  const handleChestSequence = async (chestTransforms, gridBeforeChests) => {
    // Force grid to state before chests open
    setGrid(gridBeforeChests);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Highlight chests
    const allChestPositions = chestTransforms.map((t) => t.chestPosition);
    setChestPositions(allChestPositions); // Passed to Grid, triggers 'chestHighlight' variant

    toast.success("🎁 CHEST APPEARED!", { duration: 2000 });
    audioManager.play("bigWin");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setChestPositions([]);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 2. For each chest, highlight original symbols, then transform
    for (const transform of chestTransforms) {
      const originalPositions = transform.originalSymbols.map(
        (s) => s.position
      );

      // Highlight original symbols
      setChestTransformPositions(originalPositions);
      toast.success("TRANSFORMING...", { duration: 1500 });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Apply transformation (Update data)
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) => [...row]);

        transform.resultingSymbols.forEach((resulstingSym, idx) => {
          const [row, col] = transform.transformed[idx];
          newGrid[row][col] = resulstingSym;
        });

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

  const processCascades = async (cascades, finalGrid) => {
    for (let i = 0; i < cascades.length; i++) {
      const cascade = cascades[i];
      const isLast = i === cascades.length - 1;
      const nextGrid = cascade.nextGridState;

      if (!isBoughtBonusActive) {
        setCurrentDisplayMultiplier(cascade.progressiveMult);
      }

      setGrid(cascade.grid);
      await sleep(400);

      const allWinningPositions = cascade.clusters.flatMap((cluster) => {
        if (cluster.symbol === "📦" || cluster.symbol === "CHEST_OPENED") {
          return [];
        }
        return cluster.positions;
      });
      setWinningPositions(allWinningPositions);

      if (cascade.cascadeWin > 0) {
        audioManager.play("clusterWin");
        toast.success(`💰 +$${cascade.cascadeWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      await sleep(800);

      setIsCascading(true);
      setWinningPositions([]);

      let gridToDisplay = nextGrid;
      if (cascade.chestTransforms && cascade.chestTransforms.length > 0) {
        gridToDisplay = getGridBeforeChests(nextGrid, cascade.chestTransforms);
      }

      setGrid(gridToDisplay);

      await sleep(450);

      setIsCascading(false);

      if (cascade.chestTransforms && cascade.chestTransforms.length > 0) {
        await handleChestSequence(cascade.chestTransforms, gridToDisplay);
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

  // Auto-start bonus spins after buying bonus
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

      setIsBoughtBonusActive(true);
      setAccumulatedBonusMultiplier(1);
      setCurrentDisplayMultiplier(1);
      setIsFirstBoughtSpin(true);
      setBonusTotalWin(0);

      toast.success("🎰 BONUS PURCHASED! Starting...", { duration: 3000 });
      audioManager.play("bigWin");
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
    <div className="relative min-h-screen pb-4">
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

      {/* Floating Multiplier Tracker */}
      {createPortal(
        <div className="fixed bottom-8 left-8 z-[90]">
          <div
            className={`rounded-2xl p-6 shadow-2xl transition-all duration-300 ${
              isBoughtBonusActive
                ? "bg-gradient-to-br from-yellow-500 to-orange-600 border-4 border-yellow-300 animate-pulse"
                : currentDisplayMultiplier > 1
                ? "bg-gradient-to-br from-blue-500 to-cyan-600 border-4 border-cyan-300 animate-pulse"
                : "bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-600"
            }`}
          >
            <div className="text-center">
              <div className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                {isBoughtBonusActive
                  ? "Bonus Multiplier"
                  : "Cascade Multiplier"}
              </div>
              <div className="text-5xl font-black text-white drop-shadow-lg">
                {isBoughtBonusActive
                  ? `${accumulatedBonusMultiplier.toFixed(1)}x`
                  : `${currentDisplayMultiplier}x`}
              </div>
              {isBoughtBonusActive && (
                <div className="text-xs text-yellow-100 mt-2">
                  Multipliers ADD up!
                </div>
              )}
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

      {/* Rest of UI */}
      <div className="flex items-start justify-center gap-8 px-4 min-h-[calc(100vh-150px)]">
        {/* LEFT: Stats */}
        <div className="flex flex-col gap-6 text-white w-64">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">
                  Balance
                </span>
                <div className="text-3xl font-bold text-purple-400">
                  ${(user?.balance ?? 0).toFixed(2)}
                </div>
              </div>

              <div>
                <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">
                  Free Spins
                </span>
                <div className="text-3xl font-bold text-pink-400">
                  {user?.freeSpins ?? 0}
                </div>
              </div>

              {isBoughtBonusActive && (
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/50">
                  <span className="text-sm text-yellow-300 font-semibold">
                    🌟 BONUS MODE ACTIVE
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-4 border border-purple-500/30 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-purple-300 mb-3">
              📜 Last 10 Spins
            </h3>
            {transactionHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No spins yet</p>
            ) : (
              <div className="space-y-2">
                {transactionHistory.map((tx, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 rounded-lg p-2 text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bet:</span>
                      <span className="text-white">${tx.bet.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win:</span>
                      <span
                        className={
                          tx.win > 0 ? "text-green-400" : "text-gray-500"
                        }
                      >
                        ${tx.win.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {tx.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grid + Skip Pop */}
        <div className="relative w-[900px] h-[750px] flex flex-col items-center justify-end gap-6">
          <SlotGrid
            grid={grid}
            winningPositions={winningPositions}
            isRolling={isReelSpinning}
            isCascading={isCascading}
            chestTransformPositions={chestTransformPositions}
            chestPositions={chestPositions}
            scatterColumns={scatterColumns}
            onLastReelStop={() => {
              if(reelFinishedResolver.current) {
                reelFinishedResolver.current();
              }
            }}
          />

          <AnimatePresence>
            {isReelSpinning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="absolute -bottom-16 z-50 whitespace-nowrap"
              >
                <div className="bg-purple-900/80 backdrop-blur-sm border border-purple-400/50 text-purple-100 px-6 py-2 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)] text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                    Space
                  </span>
                  <span> to Skip</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Controls */}
        <div className="flex flex-col gap-6 w-64">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-300 mb-3">
              💰 Bet Amount
            </h3>
            <div className="text-4xl font-bold text-purple-400 mb-4 text-center">
              ${betAmount.toFixed(2)}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {BET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setBetAmount(preset);
                    audioManager.play("click");
                  }}
                  disabled={isSpinning}
                  className={`px-3 py-2 rounded-lg flex items-center justify-center font-semibold transition-all ${
                    betAmount === preset
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <button
              onClick={handleMaxBet}
              disabled={isSpinning}
              className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all disabled:opacity-50"
            >
              MAX BET
            </button>
          </div>

          <button
            onClick={handleSpin}
            disabled={
              !(
                (user?.balance >= betAmount || user?.freeSpins > 0) &&
                !isSpinning
              )
            }
            className="text-2xl py-8 px-10 bg-gradient-to-r from-indigo-900 to-purple-900 text-white font-bold rounded-xl border-2 border-purple-500/40 hover:from-indigo-800 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
          >
            🎰 SPIN
          </button>

          <button
            onClick={toggleAutoplay}
            disabled={isSpinning || isBoughtBonusActive}
            className={`text-xl py-4 px-6 font-bold rounded-xl border-2 transition-all disabled:opacity-50 shadow-lg ${
              isAutoPlaying
                ? "bg-gradient-to-r from-red-900 to-orange-900 border-red-500/40 hover:from-red-800 hover:to-orange-800"
                : "bg-gradient-to-r from-blue-900 to-cyan-900 border-cyan-500/40 hover:from-blue-800 hover:to-cyan-800"
            }`}
          >
            {isAutoPlaying ? `⏸️ STOP AUTO` : "▶️ AUTOPLAY"}
          </button>

          <button
            onClick={() => {
              setShowBuyBonusModal(true);
              audioManager.play("click");
            }}
            disabled={
              !(user?.balance >= betAmount * 100) ||
              isSpinning ||
              isBoughtBonusActive
            }
            className="text-xl py-6 px-8 bg-gradient-to-r from-purple-900 to-pink-900 text-white font-bold rounded-xl border-2 border-pink-500/40 hover:from-purple-800 hover:to-pink-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-pink-500/50"
          >
            💎 BUY BONUS
            <br />
            <span className="text-base opacity-90">
              ${(betAmount * 100).toFixed(2)}
            </span>
          </button>

          <button
            onClick={() => {
              setShowPayoutTable(true);
              audioManager.play("click");
            }}
            className="text-base py-3 px-6 bg-gradient-to-r from-indigo-900 to-blue-900 text-white font-bold rounded-xl border-2 border-blue-500/40 hover:from-indigo-800 hover:to-blue-800 transition-all shadow-lg"
          >
            📊 PAYTABLE
          </button>

          <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-4 border border-purple-500/30 text-xs">
            <h4 className="text-purple-300 font-bold mb-2">⌨️ Shortcuts</h4>
            <div className="space-y-1 text-gray-400">
              <div>SPACE/ENTER - Spin</div>
              <div>A - Autoplay</div>
              <div>M - Max Bet</div>
              <div>B - Buy Bonus</div>
              <div>↑↓ - Change Bet</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotGame;
