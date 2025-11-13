import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { slotsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SlotGrid from './SlotGrid';
import audioManager from '../../utils/audioManager';
import confetti from 'canvas-confetti';
import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from '../../config/gameConfig';

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
        // Can be either interval or RAF ID
        clearInterval(spinIntervalRef.current);
        cancelAnimationFrame(spinIntervalRef.current);
      }
    };
  }, []);

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

  const preSpinAnimation = (duration = 4000) =>
  new Promise((resolve) => {
    const startTime = Date.now();
    let lastUpdateTime = 0;
    const updateInterval = 100;

    const animate = (currentTime) => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= duration) {
        if (spinIntervalRef.current) {
          cancelAnimationFrame(spinIntervalRef.current);
        }
        resolve();
        return;
      }

      if (currentTime - lastUpdateTime >= updateInterval) {
        lastUpdateTime = currentTime;

        // UPDATE IN-PLACE instead of creating new objects
        setGrid((prevGrid) =>
          prevGrid.map((row) =>
            row.map((symbol) => ({
              ...symbol, // Keep same uniqueId!
              id: keyList[Math.floor(Math.random() * keyList.length)],
              name: 'spinning',
            }))
          )
        );
      }

      spinIntervalRef.current = requestAnimationFrame(animate);
    };

    spinIntervalRef.current = requestAnimationFrame(animate);
  });

  const handleSpin = async () => {
    if (isSpinning) return;

    if (user.balance < betAmount && user.freeSpins === 0) {
      toast.error('Insufficient balance!');
      return;
    }

    setIsSpinning(true);
    setWinningPositions([]);
    setShowTotalWin(false);
    audioManager.playSpinStart();

    try {
      const [_, res] = await Promise.all([
        preSpinAnimation(4000),
        slotsAPI.spin(betAmount),
      ]);

      updateUser({
        balance: res.data.newBalance,
        freeSpins: res.data.freeSpinsRemaining,
      });

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
        toast.success(
          `🎉 BONUS! ${res.data.triggeredFreeSpins} Free Spins!`,
          {
            duration: 5000,
            icon: '🎰',
          }
        );
        audioManager.play('bonus');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Spin failed');
      console.error('Spin error:', err);
    } finally {
      setIsSpinning(false);
    }
  };

  const animateInitialSpin = (finalGrid) => {
    return new Promise((resolve) => {
      setGrid(finalGrid);
      setTimeout(resolve, 1200);
    });
  };

  // SMOOTHER CASCADE: Better timing to match animations
  const processCascades = async (cascades, finalGrid) => {
    for (let i = 0; i < cascades.length; i++) {
      const cascade = cascades[i];

      // Show the new grid
      setGrid(cascade.grid);
      
      // Wait for symbols to drop in (framer-motion layout animation = 0.6s)
      await new Promise((resolve) => setTimeout(resolve, 700));

      // Highlight winning positions
      const allWinningPositions = cascade.clusters.flatMap(
        (cluster) => cluster.positions
      );
      setWinningPositions(allWinningPositions);

      if (cascade.cascadeWin > 0) {
        audioManager.play('clusterWin');
        toast.success(`+$${cascade.cascadeWin.toFixed(2)}`, {
          duration: 2000,
        });
      }

      // Wait for win animation to play (scale/pulse) before explosion
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Start explosion effect
      setIsCascading(true);
      
      // Wait a moment then clear winning positions during explosion
      await new Promise((resolve) => setTimeout(resolve, 400));
      setWinningPositions([]);
      
      // Wait for explosion to complete
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsCascading(false);

      // Small pause before next cascade
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Show final grid after all cascades
    setAnimationKey((prev) => prev + 1);
    setGrid(finalGrid);
    await new Promise((resolve) => setTimeout(resolve, 800));
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

      toast.success('10 Free Spins Purchased! 🎰');
      audioManager.play('bonus');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to buy bonus');
    }
  };

  useEffect(() => {
    if (user?.freeSpins > 0 && !isSpinning) {
      const autoSpinTimer = setTimeout(() => {
        handleSpin();
      }, 1000);

      return () => clearTimeout(autoSpinTimer);
    }
  }, [user?.freeSpins, isSpinning]);

  return (
    <div className="relative min-h-screen pb-4">
      {/* Total Win Overlay */}
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

      {/* NEW LAYOUT: Larger grid with side controls */}
      <div className="flex items-center justify-center gap-12 px-4 min-h-[calc(100vh-150px)]">
        {/* LEFT: Stats */}
        <div className="flex flex-col gap-8 text-white">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">
              Balance
            </span>
            <span className="text-4xl font-bold text-purple-400">
              ${(user?.balance ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">
              Bet Amount
            </span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => {
                audioManager.play('click');
                setBetAmount(parseFloat(e.target.value) || 0.2);
              }}
              min="0.2"
              max="100"
              step="0.1"
              disabled={isSpinning}
              className="bg-gray-800/50 border-2 border-purple-500/50 rounded-lg px-4 py-3 text-3xl font-bold text-purple-400 focus:border-purple-400 focus:outline-none w-40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-purple-300 font-semibold uppercase tracking-wider">
              Free Spins
            </span>
            <span className="text-4xl font-bold text-pink-400">
              {user?.freeSpins ?? 0}
            </span>
          </div>
        </div>

        {/* CENTER: Larger Grid */}
        <div className="w-[900px] h-[750px]">
          <SlotGrid
            grid={grid}
            winningPositions={winningPositions}
            isRolling={isSpinning}
            isCascading={isCascading}
          />
        </div>

        {/* RIGHT: Buttons */}
        <div className="flex flex-col gap-6">
          <button
            onClick={handleSpin}
            disabled={
              !(
                (user?.balance >= betAmount || user?.freeSpins > 0) &&
                !isSpinning
              )
            }
            className="text-2xl py-8 px-10 bg-gradient-to-r from-indigo-900 to-purple-900 text-white font-bold rounded-xl border-2 border-purple-500/40 hover:from-indigo-800 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] shadow-lg hover:shadow-purple-500/50"
          >
            🎰 SPIN
          </button>

          <button
            onClick={handleBuyBonus}
            disabled={!(user?.balance >= betAmount * 100) || isSpinning}
            className="text-xl py-6 px-8 bg-gradient-to-r from-purple-900 to-pink-900 text-white font-bold rounded-xl border-2 border-pink-500/40 hover:from-purple-800 hover:to-pink-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] shadow-lg hover:shadow-pink-500/50"
          >
            💎 BUY BONUS
            <br />
            <span className="text-base opacity-90">
              ${(betAmount * 100).toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlotGame;