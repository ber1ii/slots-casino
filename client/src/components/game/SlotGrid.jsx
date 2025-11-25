import { GRID_COLS, GRID_ROWS } from '../../config/gameConfig';
import SlotSymbol from './SlotSymbol';
import { motion, AnimatePresence } from 'framer-motion';

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
  chestTransformPositions = [],
  chestPositions = [],
}) => {
  const isWinning = (row, col) => {
    return winningPositions.some(
      ([winRow, winCol]) => winRow === row && winCol === col
    );
  };

  const isChestTransform = (row, col) => {
    return chestTransformPositions.some(
      ([transformRow, transformCol]) =>
        transformRow === row && transformCol === col
    );
  };

  const isChest = (row, col) => {
    return chestPositions.some(
      ([chestRow, chestCol]) => chestRow === row && chestCol === col
    );
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 rounded-2xl blur-xl" />

      <div className="relative w-full h-full rounded-2xl border-4 border-purple-500/60 bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyan-400/60 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-cyan-400/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-cyan-400/60 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-cyan-400/60 rounded-br-2xl" />

        <motion.div
          className="grid place-items-center gap-3 w-full h-full p-6"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {grid.map((row, rowIndex) =>
              row.map((symbol, colIndex) => {
                if (!symbol) return null;

                const isTransforming = isChestTransform(rowIndex, colIndex);
                const isChestHighlight = isChest(rowIndex, colIndex);

                return (
                  <motion.div
                    key={symbol.uniqueId}
                    layout={!isRolling}
                    layoutId={symbol.uniqueId}
                    initial={{
                      y: isRolling ? -150 : -80,
                      opacity: isRolling ? 1 : 0,
                    }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      scale:
                        isTransforming || isChestHighlight
                          ? [1, 1.3, 1]
                          : 1,
                      filter: isTransforming
                        ? [
                            'brightness(1)',
                            'brightness(2.5) drop-shadow(0 0 30px rgba(255,215,0,1))',
                            'brightness(1)',
                          ]
                        : isChestHighlight
                        ? [
                            'brightness(1)',
                            'brightness(2) drop-shadow(0 0 25px rgba(255,105,180,1))',
                            'brightness(1.5) drop-shadow(0 0 20px rgba(255,105,180,0.8))',
                          ]
                        : 'brightness(1)',
                    }}
                    exit={{
                      y: isRolling ? 150 : 0,
                      opacity: isRolling ? 1 : 0,
                      scale: isRolling ? 1 : 0.7,
                    }}
                    transition={{
                      y: {
                        type: 'tween',
                        duration: isRolling ? 0.08 : 0.6,
                        ease: isRolling ? 'linear' : [0.25, 0.1, 0.25, 1],
                      },
                      opacity: { duration: isRolling ? 0.08 : 0.2 },
                      scale: {
                        duration:
                          isTransforming || isChestHighlight ? 1.2 : 0.2,
                        repeat:
                          isTransforming || isChestHighlight ? 1 : 0,
                      },
                      filter: {
                        duration: isTransforming || isChestHighlight ? 1.2 : 0,
                        repeat:
                          isTransforming || isChestHighlight ? 1 : 0,
                      },
                      layout: {
                        duration: 0.6,
                        ease: [0.25, 0.1, 0.25, 1],
                      },
                    }}
                    className="w-full h-full"
                  >
                    <SlotSymbol
                      symbol={symbol}
                      isWinning={isWinning(rowIndex, colIndex)}
                      isRolling={isRolling}
                      isCascading={isCascading}
                    />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default SlotGrid;