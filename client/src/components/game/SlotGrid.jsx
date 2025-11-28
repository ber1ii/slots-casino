import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from "../../config/gameConfig";
import SlotSymbol from "./SlotSymbol";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useMemo, memo } from "react";
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
  }) => {
    if (!symbol) return <div className="h-[20%] w-full" />;

    let animState = "idle";
    if (isChestTransform) animState = "chestTransform";
    else if (isChest) animState = "chestHighlight";

    const displaySymbol =
      symbol.id === "CHEST_OPENED" ? { ...symbol, id: "CHEST" } : symbol;
    const isTransformed =
      symbol.uniqueId && symbol.uniqueId.includes("transformed");

    return (
      <div className="relative w-full h-[20%] p-0 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={symbol.uniqueId || `${rowIndex}-${colIndex}`}
            className="w-full h-full flex items-center justify-center"
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
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <SlotSymbol
              symbol={displaySymbol}
              isWinning={isWinning}
              isRolling={false}
              isCascading={isCascading}
            />
          </motion.div>
        </AnimatePresence>
        {symbol.id === "SCATTER" && !isCascading && (
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
      prev.isChestTransform === next.isChestTransform
    );
  }
);

const SpinningReel = memo(
  ({
    colIndex,
    initialSymbols,
    finalSymbols,
    duration,
    isAnticipation,
    hasScatter,
    onLand,
  }) => {
    const REPEAT_COUNT = 2;

    const fullReel = useMemo(() => {
      const startStrip = initialSymbols?.length
        ? initialSymbols.map((s) => s?.id || REEL_STRIP[0])
        : Array(GRID_ROWS).fill(REEL_STRIP[0]);
      const endStrip = finalSymbols?.length
        ? finalSymbols.map((s) => s?.id || REEL_STRIP[0])
        : Array(GRID_ROWS).fill(REEL_STRIP[0]);
      // Create a deterministic strip based on column index to avoid jittery randoms on re-renders
      const randomStrip = [...REEL_STRIP].sort(() => 0.5 - Math.random());
      const middleChunks = Array(REPEAT_COUNT).fill(randomStrip).flat();
      return [...endStrip, ...middleChunks, ...startStrip];
    }, [initialSymbols, finalSymbols]);

    const totalStripHeightPercent = fullReel.length * (100 / GRID_ROWS);
    const shiftRatio = (fullReel.length - GRID_ROWS) / fullReel.length;
    const initialY = -1 * shiftRatio * 100;

    return (
      <div
        className={`absolute inset-0 z-20 overflow-hidden pointer-events-none border-r border-purple-900/30 backdrop-blur-[1px]
      ${
        isAnticipation
          ? "ring-2 ring-inset ring-yellow-400/80 shadow-[inset_0_0_30px_rgba(250,204,21,0.4)] transition-all duration-500"
          : ""
      }
    `}
      >
        <motion.div
          className="flex flex-col w-full"
          style={{
            height: `${totalStripHeightPercent}%`,
            willChange: "transform",
            transform: "translateZ(0)",
          }}
          initial={{ y: `${initialY}%` }}
          animate={{ y: "0%" }}
          transition={{
            duration: duration,
            ease: [0.35, 0, 0, 1],
          }}
          onAnimationComplete={() => {
            if (onLand) onLand();
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
                  className="w-full h-full object-contain backface-hidden scale-100"
                  loading="eager"
                  decoding="async"
                />
              </div>
            );
          })}
        </motion.div>
      </div>
    );
    // FIXED COMPARISON FUNCTION
  },
  (prev, next) => {
    // 1. Standard props check
    const basicPropsMatch =
      prev.duration === next.duration &&
      prev.isAnticipation === next.isAnticipation &&
      prev.hasScatter === next.hasScatter &&
      prev.colIndex === next.colIndex;

    const prevFirstId =
      prev.finalSymbols?.[0]?.uniqueId || prev.finalSymbols?.[0]?.id;
    const nextFirstId =
      next.finalSymbols?.[0]?.uniqueId || next.finalSymbols?.[0]?.id;

    const anticipationChanged = prev.isAnticipation !== next.isAnticipation;

    if(anticipationChanged) return false;

    const targetsMatch = prevFirstId === nextFirstId;

    return basicPropsMatch && targetsMatch;
  }
);

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
  chestTransformPositions = [],
  chestPositions = [],
  scatterColumns = [],
  onLastReelStop,
}) => {
  const lockedGridRef = useRef([]);

  useEffect(() => {
    if (!isRolling && grid && grid.length > 0) {
      lockedGridRef.current = grid.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
    }
  }, [isRolling, grid]);

  const reelSettings = useMemo(() => {
    const settings = [];
    let scatterCount = 0;

    const BASE_DURATION = 1.8;
    const COLUMN_DELAY_STEP = 0.25;

    for (let i = 0; i < GRID_COLS; i++) {
      let duration = BASE_DURATION + i * COLUMN_DELAY_STEP;
      const isAnticipation = scatterCount >= 2;

      if (isAnticipation) {
        duration += 2.0;
      }

      if (scatterColumns[i]) {
        scatterCount++;
      }

      settings.push({
        duration,
        hasScatter: scatterColumns[i],
        isAnticipation,
      });
    }

    return settings;
  }, [scatterColumns]);

  const playScatterSound = () => audioManager.play("bonus");

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
      <div className="relative w-full h-full rounded-2xl border-4 border-purple-500/60 bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 shadow-2xl overflow-hidden">
        {/* Borders */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyan-400/60 rounded-tl-2xl z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-cyan-400/60 rounded-tr-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-cyan-400/60 rounded-bl-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-cyan-400/60 rounded-br-2xl z-20 pointer-events-none" />

        <div
          className="relative w-full h-full p-6 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
        >
          {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
            const colSymbols = getColumn(grid, colIndex);
            const setting = reelSettings[colIndex];
            const isLastColumn = colIndex === GRID_COLS - 1;

            return (
              <div
                key={`col-${colIndex}`}
                className={`relative h-full flex flex-col bg-gray-800/20 rounded-lg overflow-hidden transition-all duration-300
                    ${
                      isRolling && setting.isAnticipation
                        ? "shadow-[0_0_25px_rgba(250,204,21,0.3)] border border-yellow-500/30"
                        : ""
                    }
                `}
              >
                {isRolling ? (
                  <SpinningReel
                    key={`reel-${colIndex}-rolling`}
                    colIndex={colIndex}
                    initialSymbols={getColumn(lockedGridRef.current, colIndex)}
                    finalSymbols={getColumn(grid, colIndex)}
                    duration={setting.duration}
                    isAnticipation={setting.isAnticipation}
                    hasScatter={setting.hasScatter}
                    onLand={() => {
                      if (setting.hasScatter) playScatterSound();
                      if (isLastColumn && onLastReelStop) onLastReelStop();
                    }}
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
