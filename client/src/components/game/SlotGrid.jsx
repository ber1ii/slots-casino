import { GRID_COLS, GRID_ROWS } from '../../config/gameConfig';
import SlotSymbol from './SlotSymbol';
import { motion, AnimatePresence } from 'framer-motion';

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
}) => {
  const isWinning = (row, col) => {
    return winningPositions.some(
      ([winRow, winCol]) => winRow === row && winCol === col
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Outer frame with glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 rounded-2xl blur-xl" />
      
      {/* Main border frame */}
      <div className="relative w-full h-full rounded-2xl border-4 border-purple-500/60 bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 shadow-2xl overflow-hidden">
        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyan-400/60 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-cyan-400/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-cyan-400/60 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-cyan-400/60 rounded-br-2xl" />
        
        {/* Grid container */}
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

                return (
                  <motion.div
                    key={symbol.uniqueId}
                    layout={~isRolling}
                    layoutId={symbol.uniqueId}
                    initial={{ y: isRolling ? -150 : -80, opacity: isRolling ? 0.8 : 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: isRolling ? 150 : 0, opacity: isRolling ? 0.8 : 0, scale: isRolling ? 1 : 0.7 }}
                    transition={{
                      y: {
                        type: 'tween',
                        duration: isRolling ? 0.12 : 0.6,
                        ease: 'linear',
                      },
                      opacity: { duration: 0.08 },
                      scale: { duration: 0.2 },
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