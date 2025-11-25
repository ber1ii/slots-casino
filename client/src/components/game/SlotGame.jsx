import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { slotsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SlotGrid from './SlotGrid';
import audioManager from '../../utils/audioManager';
import confetti from 'canvas-confetti';
import {
  BET_PRESETS,
  GRID_COLS,
  GRID_ROWS,
  SYMBOL_SPRITES,
  PAYOUT_TABLE,
} from '../../config/gameConfig';

const SlotGame = () => {
  const { user, updateUser } = useAuth();
  const [grid, setGrid] = useState([]);
  const [betAmount, setBetAmount] = useState(0.2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningPositions, setWinningPositions] = useState([]);
  const [isCascading, setIsCascading] = useState(false);
  const [showTotalWin, setShowTotalWin] = useState(false);
  const [totalWinAmount, setTotalWinAmount] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState(0);
  const [showBuyBonusModal, setShowBuyBonusModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [showPayoutTable, setShowPayoutTable] = useState(false);
  const [isBoughtBonusActive, setIsBoughtBonusActive] = useState(false);
  const [accumulatedBonusMultiplier, setAccumulatedBonusMultiplier] =
    useState(1);
  const [isFirstBoughtSpin, setIsFirstBoughtSpin] = useState(false);
  const [currentCascadeMultiplier, setCurrentCascadeMultiplier] = useState(1);
  const [chestTransformPositions, setChestTransformPositions] = useState([]);
  const [chestPositions, setChestPositions] = useState([]);

  const cascadeTimeoutRef = useRef(null);
  const totalWinTimeoutRef = useRef(null);
  const spinIntervalRef = useRef(null);
  const keyList = Object.keys(SYMBOL_SPRITES);

  useEffect(() => {
    initializeGrid();
    return () => {
      if (cascadeTimeoutRef.current) clearTimeout(cascadeTimeoutRef.current);
      if (totalWinTimeoutRef.current)
        clearTimeout(totalWinTimeoutRef.current);
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        cancelAnimationFrame(spinIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isSpinning) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'enter':
          e.preventDefault();
          handleSpin();
          break;
        case 'a':
          toggleAutoplay();
          break;
        case 'm':
          handleMaxBet();
          break;
        case 'b':
          setShowBuyBonusModal(true);
          break;
        case 'arrowup':
          e.preventDefault();
          increaseBet();
          break;
        case 'arrowdown':
          e.preventDefault();
          decreaseBet();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSpinning, betAmount, isAutoPlaying]);

  useEffect(() => {
    if (isAutoPlaying && autoSpinsRemaining > 0 && !isSpinning) {
      const timer = setTimeout(() => {
        handleSpin();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (autoSpinsRemaining === 0 && isAutoPlaying) {
      setIsAutoPlaying(false);
      toast.success('Autoplay finished');
    }
  }, [isAutoPlaying, autoSpinsRemaining, isSpinning]);

  useEffect(() => {
    if (user?.freeSpins === 0 && isBoughtBonusActive) {
      setIsBoughtBonusActive(false);
      setAccumulatedBonusMultiplier(1);
      toast.success('Bought bonus completed!');
    }
  }, [user?.freeSpins, isBoughtBonusActive]);

  const initializeGrid = () => {
    const initialGrid = Array(GRID_ROWS)
      .fill(null)
      .map((_, rowIndex) =>
        Array(GRID_COLS)
          .fill(null)
          .map((_, colIndex) => ({
            id: keyList[Math.floor(Math.random() * keyList.length)],
            name: 'initial',
            uniqueId: `init_${rowIndex}_${colIndex}`,
          }))
      );
    setGrid(initialGrid);
  };

  // FIXED: Smoother 4-second animation
  const preSpinAnimation = (duration = 4000) =>
    new Promise((resolve) => {
      const startTime = Date.now();
      const updateInterval = 300; // 100ms for smooth 60fps-like updates

      const shiftRows = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= duration) {
          clearInterval(spinIntervalRef.current);
          resolve();
          return;
        }

        setGrid((prevGrid) => {
          const newTopRow = Array(GRID_COLS)
            .fill(null)
            .map((_, colIndex) => ({
              id: keyList[Math.floor(Math.random() * keyList.length)],
              name: 'spinning',
              uniqueId: `spin_${Date.now()}_${colIndex}_${Math.random()}`,
            }));

          return [newTopRow, ...prevGrid.slice(0, -1)];
        });
      };

      shiftRows();
      spinIntervalRef.current = setInterval(shiftRows, updateInterval);
    });

  const handleSpin = async () => {
    if (isSpinning) return;

    if (user.balance < betAmount && user.freeSpins === 0) {
      toast.error('Insufficient balance!');
      setIsAutoPlaying(false);
      setAutoSpinsRemaining(0);
      return;
    }

    setIsSpinning(true);
    setWinningPositions([]);
    setShowTotalWin(false);
    setCurrentCascadeMultiplier(1);
    setChestTransformPositions([]);
    setChestPositions([]);

    audioManager.playSpinStart();

    if (isAutoPlaying && autoSpinsRemaining > 0) {
      setAutoSpinsRemaining((prev) => prev - 1);
    }

    try {
      const [_, res] = await Promise.all([
        preSpinAnimation(4000),
        slotsAPI.spin(
          betAmount,
          isBoughtBonusActive,
          isFirstBoughtSpin,
          accumulatedBonusMultiplier
        ),
      ]);

      if (isFirstBoughtSpin) {
        setIsFirstBoughtSpin(false);
      }

      if (res.data.bonusMultiplier !== undefined) {
        setAccumulatedBonusMultiplier(res.data.bonusMultiplier);
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

      // CHEST HANDLING: Show grid first, highlight chests, then transform
      if (res.data.chestTransforms && res.data.chestTransforms.length > 0) {
        const initialGrid = res.data.cascades[0]?.grid || res.data.finalGrid;
        setGrid(initialGrid);
        await new Promise((resolve) => setTimeout(resolve, 600));

        const allChestPositions = res.data.chestTransforms.map(
          (t) => t.chestPosition
        );
        setChestPositions(allChestPositions);
        toast.success('🎁 CHEST APPEARED!', { duration: 2000 });
        audioManager.play('bonus');
        await new Promise((resolve) => setTimeout(resolve, 1200));

        await showChestTransformations(res.data.chestTransforms);
      }

      if (res.data.cascades && res.data.cascades.length > 0) {
        await processCascades(res.data.cascades, res.data.finalGrid);
      } else {
        await animateInitialSpin(res.data.finalGrid);
      }

      if (res.data.totalWin > 0) {
        setTotalWinAmount(res.data.totalWin);
        setShowTotalWin(true);
        audioManager.play('bigWin');
        triggerConfetti();

        totalWinTimeoutRef.current = setTimeout(() => {
          setShowTotalWin(false);
        }, 4000);
      }

      if (res.data.triggeredFreeSpins > 0) {
        toast.success(`🎉 BONUS! ${res.data.triggeredFreeSpins} Free Spins!`, {
          duration: 5000,
          icon: '🎰',
        });
        audioManager.play('bonus');

        if (!isBoughtBonusActive) {
          setIsBoughtBonusActive(true);
          setAccumulatedBonusMultiplier(1);
          toast.success('🌟 BONUS MODE ACTIVATED!', { duration: 3000 });
        }
      }

      if (res.data.retriggeredFreeSpins > 0) {
        toast.success(
          `🎉 RETRIGGER! +${res.data.retriggeredFreeSpins} Free Spins`,
          {
            duration: 5000,
            icon: '🎉',
          }
        );
        audioManager.play('bonus');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Spin failed');
      console.error('Spin error:', err);
      setIsAutoPlaying(false);
      setAutoSpinsRemaining(0);
    } finally {
      setIsSpinning(false);
      setCurrentCascadeMultiplier(1);
      setChestPositions([]);
    }
  };

  const showChestTransformations = async (chestTransforms) => {
    for (const transform of chestTransforms) {
      setChestTransformPositions(transform.transformed);
      toast.success('🎁 CHEST TRANSFORMING!', { duration: 2000 });
      audioManager.play('bonus');

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setChestTransformPositions([]);
  };

  const animateInitialSpin = (finalGrid) => {
    return new Promise((resolve) => {
      setGrid(finalGrid);
      setTimeout(resolve, 1000);
    });
  };

  const processCascades = async (cascades, finalGrid) => {
    for (let i = 0; i < cascades.length; i++) {
      const cascade = cascades[i];

      setCurrentCascadeMultiplier(cascade.progressiveMult);

      setGrid(cascade.grid);

      await new Promise((resolve) => setTimeout(resolve, 700));

      const allWinningPositions = cascade.clusters.flatMap(
        (cluster) => cluster.positions
      );
      setWinningPositions(allWinningPositions);

      if (cascade.cascadeWin > 0) {
        audioManager.play('clusterWin');
        toast.success(`💰 +$${cascade.cascadeWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsCascading(true);

      await new Promise((resolve) => setTimeout(resolve, 300));
      setWinningPositions([]);

      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsCascading(false);

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setAnimationKey((prev) => prev + 1);
    setGrid(finalGrid);
    setCurrentCascadeMultiplier(1);
    await new Promise((resolve) => setTimeout(resolve, 600));
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
        colors: ['#a855f7', '#ec4899', '#8b5cf6'],
      });

      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a855f7', '#ec4899', '#8b5cf6'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // FIXED: Auto-start free spins after buying bonus
  const handleBuyBonus = async () => {
    const bonusCost = betAmount * 100;

    if (user.balance < bonusCost) {
      toast.error('Insufficient balance!');
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
      setIsFirstBoughtSpin(true);

      toast.success('10 Free Spins Purchased! 🎰', { duration: 3000 });
      audioManager.play('bonus');
      setShowBuyBonusModal(false);

      // Auto-start the bonus spins
      setTimeout(() => {
        if (!isSpinning) {
          handleSpin();
        }
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to buy bonus');
    }
  };

  const handleMaxBet = () => {
    audioManager.play('click');
    setBetAmount(100);
    toast.success('Max bet selected: $100');
  };

  const increaseBet = () => {
    const currentIndex = BET_PRESETS.indexOf(betAmount);
    if (currentIndex < BET_PRESETS.length - 1) {
      setBetAmount(BET_PRESETS[currentIndex + 1]);
      audioManager.play('click');
    }
  };

  const decreaseBet = () => {
    const currentIndex = BET_PRESETS.indexOf(betAmount);
    if (currentIndex > 0) {
      setBetAmount(BET_PRESETS[currentIndex - 1]);
      audioManager.play('click');
    }
  };

  const toggleAutoplay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setAutoSpinsRemaining(0);
      toast.success('Autoplay stopped');
    } else {
      setIsAutoPlaying(true);
      setAutoSpinsRemaining(10);
      toast.success('Autoplay: 10 spins');
    }
    audioManager.play('click');
  };

  const addTransaction = (transaction) => {
    setTransactionHistory((prev) => [transaction, ...prev].slice(0, 10));
  };

  return (
    <div className="relative min-h-screen pb-4">
      {/* Modals (same as before, just showing Buy Bonus for context) */}
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
                  audioManager.play('click');
                }}
                className="flex-1 px-6 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout table modal - same as before */}
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
              Minimum cluster size:{' '}
              <strong className="text-white">6 symbols</strong>
            </p>

            <button
              onClick={() => {
                setShowPayoutTable(false);
                audioManager.play('click');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showTotalWin && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]">
              💰 ${totalWinAmount.toFixed(2)} 💰
            </div>
            <div className="text-3xl md:text-5xl font-bold text-white mt-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
              TOTAL WIN!
            </div>
          </div>
        </div>
      )}

      {/* Cascade multiplier - bottom-left */}
      {currentCascadeMultiplier > 1 && !isBoughtBonusActive && (
        <div className="fixed bottom-32 left-8 z-40 bg-gradient-to-br from-blue-500 to-cyan-600 border-4 border-cyan-300 rounded-2xl p-6 shadow-2xl animate-pulse">
          <div className="text-center">
            <div className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Cascade Multiplier
            </div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              {currentCascadeMultiplier}x
            </div>
          </div>
        </div>
      )}

      {/* Bonus multiplier - top-right */}
      {isBoughtBonusActive && (
        <div className="fixed top-32 right-8 z-40 bg-gradient-to-br from-yellow-500 to-orange-600 border-4 border-yellow-300 rounded-2xl p-6 shadow-2xl animate-pulse">
          <div className="text-center">
            <div className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Bonus Multiplier
            </div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              {accumulatedBonusMultiplier.toFixed(1)}x
            </div>
            <div className="text-xs text-yellow-100 mt-2">
              Multipliers ADD up!
            </div>
          </div>
        </div>
      )}

      {/* Rest of UI (same as before) */}
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

              {isAutoPlaying && (
                <div>
                  <span className="text-sm text-cyan-300 font-semibold uppercase tracking-wider">
                    Auto Spins Left
                  </span>
                  <div className="text-3xl font-bold text-cyan-400">
                    {autoSpinsRemaining}
                  </div>
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
                          tx.win > 0 ? 'text-green-400' : 'text-gray-500'
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

        {/* CENTER: Grid */}
        <div className="w-[900px] h-[750px]">
          <SlotGrid
            grid={grid}
            winningPositions={winningPositions}
            isRolling={isSpinning}
            isCascading={isCascading}
            chestTransformPositions={chestTransformPositions}
            chestPositions={chestPositions}
          />
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
                    audioManager.play('click');
                  }}
                  disabled={isSpinning}
                  className={`px-3 py-2 rounded-lg flex items-center justify-center font-semibold transition-all ${
                    betAmount === preset
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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
            disabled={isSpinning}
            className={`text-xl py-4 px-6 font-bold rounded-xl border-2 transition-all disabled:opacity-50 shadow-lg ${
              isAutoPlaying
                ? 'bg-gradient-to-r from-red-900 to-orange-900 border-red-500/40 hover:from-red-800 hover:to-orange-800'
                : 'bg-gradient-to-r from-blue-900 to-cyan-900 border-cyan-500/40 hover:from-blue-800 hover:to-cyan-800'
            }`}
          >
            {isAutoPlaying
              ? `⏸️ STOP AUTO (${autoSpinsRemaining})`
              : '▶️ AUTOPLAY'}
          </button>

          <button
            onClick={() => {
              setShowBuyBonusModal(true);
              audioManager.play('click');
            }}
            disabled={!(user?.balance >= betAmount * 100) || isSpinning}
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
              audioManager.play('click');
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