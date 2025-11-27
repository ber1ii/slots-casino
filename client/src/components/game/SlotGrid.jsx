import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from '../../config/gameConfig';
import SlotSymbol from './SlotSymbol';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

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
  const REPEAT_COUNT = 4; 
  
  // Safe data access
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

  const ROW_HEIGHT_PERCENT = 100 / GRID_ROWS; 
  const totalStripHeightPercent = fullReel.length * ROW_HEIGHT_PERCENT;
  
  // We shift the strip UP so the BOTTOM chunk (StartStrip) is visible initially.
  // Formula: (TotalItems - ViewportItems) / TotalItems
  const shiftRatio = (fullReel.length - GRID_ROWS) / fullReel.length;
  const initialY = -1 * shiftRatio * 100; 

  const baseDuration = 1.5; 
  const delay = colIndex * 0.15;

  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none border-r border-purple-900/30 backdrop-blur-[1px]">
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
          ease: [0.35, 0, 0, 1], // Custom bezier for "Heavy Start, Smooth Stop"
        }}
      >
        {fullReel.map((symbolId, i) => {
          const sprite = SYMBOL_SPRITES[symbolId] || SYMBOL_SPRITES['RED_GEM'];
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
                 className={`w-[85%] h-[85%] object-contain backface-hidden
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
  const lockedGridRef = useRef([]);

  // Lock the grid state right before spinning so we know what to "animate away from"
  useEffect(() => {
    if(!isRolling && grid && grid.length > 0) {
      lockedGridRef.current = grid.map(row => row.map(cell => ({ ...cell })));
    }
  }, [isRolling, grid]);

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
            
            {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
              const colSymbols = getColumn(grid, colIndex);

              return (
                <div key={`col-${colIndex}`} className="relative h-full flex flex-col bg-gray-800/20 rounded-lg overflow-hidden">
                  
                  {isRolling ? (
                      /* CASE 1: ROLLING - Show ONLY the spinning strip */
                      <SpinningReel
                        key={`reel-${colIndex}-rolling`} 
                        colIndex={colIndex}
                        initialSymbols={getColumn(lockedGridRef.current, colIndex)}
                        finalSymbols={getColumn(grid, colIndex)}
                      />
                  ) : (
                      /* CASE 2: STATIC - Show ONLY the static grid symbols */
                      <div className={`flex flex-col h-full`}>
                        {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => {
                          const symbol = colSymbols[rowIndex];
                          
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
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;