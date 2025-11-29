import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from "../../config/gameConfig";
import SlotSymbol from "./SlotSymbol";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useMemo, memo, useCallback, useState } from "react";
import audioManager from "../../utils/audioManager";

const REEL_STRIP = [
  "RED_GEM",
  "BLUE_GEM",
  "WILD",
  "CROWN",
  "RING",
  "SCATTER",
  "GREEN_GEM",
  "PURPLE_GEM",
  "HOURGLASS",
];

const symbolVariants = {
  idle: { y: 0, scale: 1, zIndex: 1, opacity: 1 },
  chestTransform: {
    scale: [1, 1.15, 1],
    filter: [
      "brightness(1)",
      "brightness(2.5) drop-shadow(0 0 25px rgba(255,215,0,1))",
      "brightness(1)",
    ],
    zIndex: 10,
    opacity: 1,
    transition: { duration: 1.1, ease: "easeInOut" },
  },
  chestHighlight: {
    scale: [1, 1.2, 1],
    filter: "brightness(2) drop-shadow(0 0 30px rgba(255,105,180,1))",
    zIndex: 5,
    opacity: 1,
    transition: { duration: 0.8, ease: "easeInOut" },
  },
  exit: { opacity: 0, scale: 0.4, transition: { duration: 0.2 } },
};

// 1. Memoized Static Cell
const StaticSlotCell = memo(
  ({
    symbol,
    rowIndex,
    colIndex,
    isCascading,
    isWinning,
    isChest,
    isChestTransform,
    totalScatters,
  }) => {
    // FIX 1: Use flex-1 instead of h-[20%] to fill available space evenly
    if (!symbol) return <div className="flex-1 w-full min-h-0" />;

    let animState = "idle";
    if (isChestTransform) animState = "chestTransform";
    else if (isChest) animState = "chestHighlight";

    const displaySymbol =
      symbol.id === "CHEST_OPENED" ? { ...symbol, id: "CHEST" } : symbol;
    const isTransformed =
      symbol.uniqueId && symbol.uniqueId.includes("transformed");
    const shouldHighlightScatter =
      symbol.id === "SCATTER" && !isCascading && totalScatters >= 3;

    return (
      // FIX 2: Added 'flex-1 min-h-0' to allow the cell to shrink if needed
      // ensuring 5 rows always fit perfectly without overflow.
      <div className="relative w-full flex-1 min-h-0 p-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={symbol.uniqueId || `${rowIndex}-${colIndex}`}
            className="w-full h-full flex items-center justify-center will-change-transform"
            variants={symbolVariants}
            initial={
              isTransformed
                ? { scale: 0, opacity: 0 }
                : isCascading
                ? { y: -50, opacity: 0 }
                : "idle"
            }
            animate={animState}
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              mass: 0.8,
            }}
          >
            <SlotSymbol
              symbol={displaySymbol}
              isWinning={isWinning}
              isRolling={false}
              isCascading={isCascading}
            />
          </motion.div>
        </AnimatePresence>
        {shouldHighlightScatter && (
          <div className="absolute inset-1 border-2 border-yellow-400 rounded-lg animate-pulse pointer-events-none shadow-[0_0_15px_rgba(250,204,21,0.4)]" />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.symbol?.uniqueId === next.symbol?.uniqueId &&
    prev.isWinning === next.isWinning &&
    prev.isCascading === next.isCascading &&
    prev.isChest === next.isChest &&
    prev.isChestTransform === next.isChestTransform &&
    prev.totalScatters === next.totalScatters
);

const SpinningReel = memo(
  ({ colIndex, initialSymbols, finalSymbols, duration, onLand }) => {
    const hasLanded = useRef(false);
    const REPEAT_COUNT = 2;

    const fullReel = useMemo(() => {
      const startStrip = initialSymbols?.length
        ? initialSymbols.map((s) => s?.id || REEL_STRIP[0])
        : Array(GRID_ROWS).fill(REEL_STRIP[0]);
      const endStrip = finalSymbols?.length
        ? finalSymbols.map((s) => s?.id || REEL_STRIP[0])
        : Array(GRID_ROWS).fill(REEL_STRIP[0]);
      const randomStrip = [...REEL_STRIP].sort(
        (a, b) => a.charCodeAt(0) + colIndex - b.charCodeAt(0)
      );
      const middleChunks = Array(REPEAT_COUNT).fill(randomStrip).flat();
      return [...endStrip, ...middleChunks, ...startStrip];
    }, [initialSymbols, finalSymbols, colIndex, REPEAT_COUNT]);

    const totalStripHeightPercent = fullReel.length * (100 / GRID_ROWS);
    const initialY =
      -1 * ((fullReel.length - GRID_ROWS) / fullReel.length) * 100;

    return (
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none border-r border-white/5 transform-gpu">
        <motion.div
          className="flex flex-col w-full will-change-transform"
          style={{
            height: `${totalStripHeightPercent}%`,
            transform: "translateZ(0)",
          }}
          initial={{ y: `${initialY}%` }}
          animate={{ y: "0%" }}
          transition={{ duration: duration, ease: [0.35, 0, 0, 1] }}
          onAnimationComplete={() => {
            if (onLand && !hasLanded.current) {
              hasLanded.current = true;
              onLand();
            }
          }}
        >
          {fullReel.map((symbolId, i) => {
            const sprite =
              SYMBOL_SPRITES[symbolId] || SYMBOL_SPRITES["RED_GEM"];
            return (
              <div
                key={i}
                className="w-full flex items-center justify-center relative flex-shrink-0"
                style={{ height: `${100 / fullReel.length}%` }}
              >
                <img
                  src={sprite}
                  alt="slot-icon"
                  className="w-full h-full object-contain drop-shadow-lg"
                  loading="eager"
                  decoding="sync"
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    );
  },
  (prev, next) =>
    prev.duration === next.duration &&
    prev.colIndex === next.colIndex &&
    prev.onLand === next.onLand &&
    prev.finalSymbols?.[0]?.uniqueId === next.finalSymbols?.[0]?.uniqueId
);

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
  chestTransformPositions = [],
  chestPositions = [],
  onLastReelStop,
  totalScatters = 0,
}) => {
  const lockedGridRef = useRef([]);
  const landedReelsRef = useRef(new Set());
  const [landingFlashes, setLandingFlashes] = useState({});

  useEffect(() => {
    if (isRolling) {
      landedReelsRef.current.clear();
      setLandingFlashes({});
    }
  }, [isRolling]);
  useEffect(() => {
    if (!isRolling && grid && grid.length > 0)
      lockedGridRef.current = grid.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
  }, [isRolling, grid]);

  const getReelDuration = (index) => 2.0 + index * 0.3;

  const handleLand = useCallback(
    (colIndex) => {
      if (landedReelsRef.current.has(colIndex)) return;
      landedReelsRef.current.add(colIndex);
      const isLastReel = colIndex === GRID_COLS - 1;
      setLandingFlashes((prev) => ({ ...prev, [colIndex]: true }));
      setTimeout(() => {
        setLandingFlashes((prev) => {
          const next = { ...prev };
          delete next[colIndex];
          return next;
        });
      }, 300);
      const hasScatterInColumn = grid.some(
        (row) => row[colIndex]?.id === "SCATTER"
      );
      if (hasScatterInColumn) audioManager.play("scatterLand");
      else audioManager.play("reelStop");
      if (isLastReel && onLastReelStop) onLastReelStop();
    },
    [onLastReelStop, grid]
  );

  const getColumn = (targetGrid, colIndex) => {
    if (!targetGrid || targetGrid.length === 0) return [];
    return targetGrid.map((row) => row[colIndex]);
  };
  const isWinning = (row, col) =>
    winningPositions.some(([r, c]) => r === row && c === col);
  const isChestTransform = (row, col) =>
    chestTransformPositions.some(([r, c]) => r === row && c === col);
  const isChest = (row, col) =>
    chestPositions.some(([r, c]) => r === row && c === col);

  return (
    <div className="relative w-full h-full p-2">
      <div className="absolute inset-0 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="relative w-full h-full bg-[#0a0a12]/40 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col ring-1 ring-purple-500/20">
        <div className="h-3 lg:h-5 w-full bg-gradient-to-b from-gray-700/80 to-gray-900/80 border-b border-black/50 relative z-20">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
        </div>

        {/* FIX 3: Reduced padding (lg:p-6 -> lg:p-4) to give more room to the rows */}
        <div
          className="relative flex-1 p-2 lg:p-4 grid gap-0 overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          <div className="absolute inset-0 flex justify-between pointer-events-none px-2 lg:px-4 z-10">
            {[...Array(GRID_COLS - 1)].map((_, i) => (
              <div
                key={i}
                className="w-px h-full bg-gradient-to-b from-transparent via-purple-500/10 to-transparent"
              />
            ))}
          </div>
          {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
            const colSymbols = getColumn(grid, colIndex);
            const isFlashing = landingFlashes[colIndex];
            return (
              <div
                key={`col-${colIndex}`}
                className="relative h-full flex flex-col border-r border-transparent last:border-r-0"
              >
                <AnimatePresence>
                  {isFlashing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="absolute inset-0 z-30 pointer-events-none bg-white/5 mix-blend-overlay"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent mix-blend-overlay" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* FIX 4: Use flex-col and h-full for the static container */}
                <div
                  className={`flex flex-col h-full w-full ${
                    isRolling ? "invisible" : "visible"
                  }`}
                >
                  {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
                    <StaticSlotCell
                      key={`${rowIndex}-${colIndex}`}
                      rowIndex={rowIndex}
                      colIndex={colIndex}
                      symbol={colSymbols[rowIndex]}
                      isCascading={isCascading}
                      isWinning={isWinning(rowIndex, colIndex)}
                      isChest={isChest(rowIndex, colIndex)}
                      isChestTransform={isChestTransform(rowIndex, colIndex)}
                      totalScatters={totalScatters}
                    />
                  ))}
                </div>

                {isRolling && (
                  <SpinningReel
                    key={`reel-${colIndex}-rolling`}
                    colIndex={colIndex}
                    initialSymbols={getColumn(lockedGridRef.current, colIndex)}
                    finalSymbols={getColumn(grid, colIndex)}
                    duration={getReelDuration(colIndex)}
                    onLand={() => handleLand(colIndex)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="h-6 lg:h-8 w-full bg-gradient-to-t from-gray-800/80 to-gray-900/80 border-t border-white/10 flex items-center justify-center relative z-20">
          <div className="text-[10px] text-purple-400/60 tracking-[0.5em] font-bold uppercase animate-pulse">
            System Ready
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
