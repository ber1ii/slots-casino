import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from '../../config/gameConfig';
import SlotSymbol from './SlotSymbol';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';

// Configuration for the "blur" filler
const REEL_STRIP = ['RED_GEM', 'BLUE_GEM', 'WILD', 'CROWN', 'RING', 'SCATTER', 'GREEN_GEM', 'PURPLE_GEM', 'HOURGLASS'];

const symbolVariants = {
  idle: { y: 0, scale: 1, zIndex: 1, opacity: 1 },
  chestTransform: {
    scale: [1, 1.15, 1],
    filter: ['brightness(1)', 'brightness(2.5) drop-shadow(0 0 25px rgba(255,215,0,1))', 'brightness(1)'],
    zIndex: 10,
    opacity: 1,
    transition: { duration: 1.1, ease: 'easeInOut' },
  },
  chestHighlight: {
    scale: [1, 1.2, 1],
    filter: 'brightness(2) drop-shadow(0 0 30px rgba(255,105,180,1))',
    zIndex: 5,
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeInOut' },
  },
  exit: { opacity: 0, scale: 0.4, transition: { duration: 0.2 } },
};

const SpinningReel = ({ colIndex, initialSymbols, finalSymbols }) => {
  // 1. Configuration
  const REPEAT_COUNT = 4; 
  
  // 2. Build the visual strip
  // Fallback to simple GEM if data is missing to prevent crash/white space
  const startStrip = (initialSymbols && initialSymbols.length > 0) 
    ? initialSymbols.map(s => s ? s.id : REEL_STRIP[0]) 
    : Array(GRID_ROWS).fill(REEL_STRIP[0]);

  const endStrip = (finalSymbols && finalSymbols.length > 0)
    ? finalSymbols.map(s => s ? s.id : REEL_STRIP[0])
    : Array(GRID_ROWS).fill(REEL_STRIP[0]);
  
  const randomStrip = [...REEL_STRIP].sort(() => Math.random() - 0.5);
  const middleChunks = Array(REPEAT_COUNT).fill(randomStrip).flat();

  // DOM Order: [Top (Final), Middle, Bottom (Start)]
  const fullReel = [...endStrip, ...middleChunks, ...startStrip];

  // 3. Height Math
  const ROW_HEIGHT_PERCENT = 100 / GRID_ROWS; 
  const totalStripHeightPercent = fullReel.length * ROW_HEIGHT_PERCENT;
  
  // Start Position: Shift UP so the bottom (StartStrip) is in view.
  // Formula: -(TotalHeight - ViewportHeight)
  // Example: 2000% Height - 100% Viewport = 1900% Shift
  const initialY = -1 * (totalStripHeightPercent - 100);

  const baseDuration = 1.5; 
  const delay = colIndex * 0.15;

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900/50 border-r border-purple-900/30">
      <motion.div
        className="flex flex-col w-full"
        style={{ 
          height: `${totalStripHeightPercent}%`, 
          willChange: "transform" 
        }}
        initial={{ y: `${initialY}%` }}
        animate={{ y: "0%" }}
        transition={{
          duration: baseDuration + delay,
          ease: [0.35, 0, 0, 1], 
        }}
      >
        {fullReel.map((symbolId, i) => {
          const sprite = SYMBOL_SPRITES[symbolId] || SYMBOL_SPRITES['RED_GEM'];
          // Blur middle symbols for speed effect
          const isFiller = i >= endStrip.length && i < (fullReel.length - startStrip.length);
          
          return (
            <div 
              key={i} 
              className="w-full flex items-center justify-center relative flex-shrink-0"
              style={{ height: `${100 / fullReel.length}%` }} 
            >
               <img 
                 src={sprite} 
                 alt="slot-icon"
                 className={`w-[85%] h-[85%] object-contain 
                   ${isFiller ? 'blur-[2px] opacity-80 scale-90' : 'scale-100'}
                 `} 
               />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
  chestTransformPositions = [],
  chestPositions = [],
}) => {
  // Use Ref to hold the "Start" state of the spin.
  // This persists across renders without triggering new ones.
  const lockedGridRef = useRef([]);

  // Whenever we are NOT rolling, we keep the lockedGrid updated.
  // When rolling STARTS, we stop updating this, effectively "snapshotting" the grid.
  if (!isRolling && grid && grid.length > 0) {
    lockedGridRef.current = grid;
  }

  // Helper to extract columns
  const getColumn = (targetGrid, colIndex) => {
    if(!targetGrid || targetGrid.length === 0) return [];
    return targetGrid.map(row => row[colIndex]);
  };
  
  const isWinning = (row, col) => winningPositions.some(([r, c]) => r === row && c === col);
  const isChestTransform = (row, col) => chestTransformPositions.some(([r, c]) => r === row && c === col);
  const isChest = (row, col) => chestPositions.some(([r, c]) => r === row && c === col);

  return (
    <div className="relative w-full h-full">
      {/* Background FX */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-pink-900/20 rounded-2xl blur-xl" />
      <div className="relative w-full h-full rounded-2xl border-4 border-purple-500/60 bg-gradient-to-br from-gray-900/90 via-purple-950/50 to-gray-900/90 shadow-2xl overflow-hidden">
        
        {/* Borders */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-cyan-400/60 rounded-tl-2xl z-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-cyan-400/60 rounded-tr-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-cyan-400/60 rounded-bl-2xl z-20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-cyan-400/60 rounded-br-2xl z-20 pointer-events-none" />

        <div className='relative w-full h-full p-6 grid gap-3'
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
            
            {Array.from({ length: GRID_COLS }).map((_, colIndex) => (
              <div key={`col-${colIndex}`} className="relative h-full flex flex-col bg-gray-800/20 rounded-lg overflow-hidden">
                
                {/* We remove the 'showSpinningReel' state toggle. 
                   If isRolling is true, we render SpinningReel immediately.
                   We pass lockedGridRef.current as the initial state.
                */}
                {isRolling ? (
                  <SpinningReel
                    key={`reel-${colIndex}-rolling`} 
                    colIndex={colIndex}
                    initialSymbols={getColumn(lockedGridRef.current, colIndex)}
                    finalSymbols={getColumn(grid, colIndex)}
                  />
                ) : (
                  <div className={`flex flex-col h-full`}>
                    {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => {
                      const rowData = grid[rowIndex];
                      const symbol = rowData ? rowData[colIndex] : null;
                      
                      if (!symbol) return <div key={rowIndex} className="h-[20%] w-full" />;

                      let animState = 'idle';
                      if (isChestTransform(rowIndex, colIndex)) animState = 'chestTransform';
                      else if (isChest(rowIndex, colIndex)) animState = 'chestHighlight';

                      const displaySymbol = symbol.id === 'CHEST_OPENED' ? { ...symbol, id: 'CHEST' } : symbol;
                      const isTransformed = symbol.uniqueId && symbol.uniqueId.includes('transformed');

                      return (
                        <div key={rowIndex} className="relative w-full h-[20%] p-0 flex items-center justify-center">
                          <AnimatePresence mode='popLayout'>
                             <motion.div
                                key={symbol.uniqueId || `${rowIndex}-${colIndex}`}
                                className="w-full h-full flex items-center justify-center"
                                variants={symbolVariants}
                                initial={isTransformed 
                                  ? { scale: 0, opacity: 0 } 
                                  : (isCascading ? { y: -50, opacity: 0 } : "idle")
                                } 
                                animate={animState} 
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                              >
                                <SlotSymbol 
                                  symbol={displaySymbol}
                                  isWinning={isWinning(rowIndex, colIndex)}
                                  isRolling={false}
                                  isCascading={isCascading}
                                />
                              </motion.div>
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;