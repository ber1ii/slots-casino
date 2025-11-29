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
    if (!symbol) return <div className="h-[20%] w-full" />;

    let animState = "idle";
    if (isChestTransform) animState = "chestTransform";
    else if (isChest) animState = "chestHighlight";

    const displaySymbol =
      symbol.id === "CHEST_OPENED" ? { ...symbol, id: "CHEST" } : symbol;
    const isTransformed =
      symbol.uniqueId && symbol.uniqueId.includes("transformed");

    // Only highlight if it's a scatter AND we have 3 or more total on the grid
    const shouldHighlightScatter =
      symbol.id === "SCATTER" && !isCascading && totalScatters >= 3;

    return (
      <div className="relative w-full h-[20%] p-0 flex items-center justify-center">
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
  (prev, next) => {
    return (
      prev.symbol?.uniqueId === next.symbol?.uniqueId &&
      prev.isWinning === next.isWinning &&
      prev.isCascading === next.isCascading &&
      prev.isChest === next.isChest &&
      prev.isChestTransform === next.isChestTransform &&
      prev.totalScatters === next.totalScatters
    );
  }
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
    const shiftRatio = (fullReel.length - GRID_ROWS) / fullReel.length;
    const initialY = -1 * shiftRatio * 100;

    return (
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none border-r border-purple-900/30 transform-gpu">
        <motion.div
          className="flex flex-col w-full will-change-transform"
          style={{
            height: `${totalStripHeightPercent}%`,
            transform: "translateZ(0)",
          }}
          initial={{ y: `${initialY}%` }}
          animate={{ y: "0%" }}
          transition={{
            duration: duration,
            ease: [0.35, 0, 0, 1],
          }}
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
                  className="w-[85%] h-[85%] object-contain"
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
  (prev, next) => {
    const basicPropsMatch =
      prev.duration === next.duration && prev.colIndex === next.colIndex;

    const handlersMatch = prev.onLand === next.onLand;

    const prevFirstId =
      prev.finalSymbols?.[0]?.uniqueId || prev.finalSymbols?.[0]?.id;
    const nextFirstId =
      next.finalSymbols?.[0]?.uniqueId || next.finalSymbols?.[0]?.id;

    const targetsMatch = prevFirstId === nextFirstId;

    return basicPropsMatch && targetsMatch && handlersMatch;
  }
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
    if (!isRolling && grid && grid.length > 0) {
      lockedGridRef.current = grid.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
    }
  }, [isRolling, grid]);

  const getReelDuration = (index) => {
    const BASE_DURATION = 2.0;
    const COLUMN_DELAY_STEP = 0.3;
    return BASE_DURATION + index * COLUMN_DELAY_STEP;
  };

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

      if (hasScatterInColumn) {
        audioManager.play("scatterLand");
      } else {
        audioManager.play("reelStop");
      }

      if (isLastReel && onLastReelStop) {
        onLastReelStop();
      }
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
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 rounded-2xl blur-xl" />

      <div className="relative w-full h-full rounded-2xl border-2 lg:border-4 border-purple-500/60 bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 shadow-2xl overflow-hidden">
        {/* Borders */}
        <div className="absolute top-0 left-0 w-8 h-8 lg:w-16 lg:h-16 border-t-2 border-l-2 lg:border-t-4 lg:border-l-4 border-cyan-400/60 rounded-tl-xl lg:rounded-tl-2xl z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 lg:w-16 lg:h-16 border-t-2 border-r-2 lg:border-t-4 lg:border-r-4 border-cyan-400/60 rounded-tr-xl lg:rounded-tr-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 lg:w-16 lg:h-16 border-b-2 border-l-2 lg:border-b-4 lg:border-l-4 border-cyan-400/60 rounded-bl-xl lg:rounded-bl-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 lg:w-16 lg:h-16 border-b-2 border-r-2 lg:border-b-4 lg:border-r-4 border-cyan-400/60 rounded-br-xl lg:rounded-br-2xl z-20 pointer-events-none" />

        <div
          className="relative w-full h-full p-2 lg:p-6 grid gap-1 lg:gap-3"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
            const colSymbols = getColumn(grid, colIndex);
            const isFlashing = landingFlashes[colIndex];

            return (
              <div
                key={`col-${colIndex}`}
                className={`relative h-full flex flex-col bg-gray-800/20 rounded-lg overflow-hidden transition-all duration-300 border border-transparent`}
              >
                {/* Impact flash overlay */}
                <AnimatePresence>
                  {isFlashing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="absolute inset-0 z-40 pointer-events-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-transparent mix-blend-overlay" />
                      <div className="absolute inset-0 border-2 border-white/60 rounded-lg shadow-[inset_0_0_20px_rgba(255,255,255,0.3)]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {isRolling ? (
                  <SpinningReel
                    key={`reel-${colIndex}-rolling`}
                    colIndex={colIndex}
                    initialSymbols={getColumn(lockedGridRef.current, colIndex)}
                    finalSymbols={getColumn(grid, colIndex)}
                    duration={getReelDuration(colIndex)}
                    onLand={() => handleLand(colIndex)}
                  />
                ) : (
                  <div className={`flex flex-col h-full`}>
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
