import { GRID_COLS, GRID_ROWS, SYMBOL_SPRITES } from '../../config/gameConfig';
import SlotSymbol from './SlotSymbol';
import { motion, AnimatePresence } from 'framer-motion';

const BLUR_MAP = {
  'RED_GEM': 'BLURRED_RED',
  'BLUE_GEM': 'BLURRED_BLUE',
  'GREEN_GEM': 'BLURRED_GREEN',
  'PURPLE_GEM': 'BLURRED_PURPLE',
  'RING': 'BLURRED_RING',
  'HOURGLASS': 'BLURRED_HOURGLASS',
  'CROWN': 'BLURRED_CROWN',
  'WILD': 'BLURRED_WILD',
  'SCATTER': 'BLURRED_SCATTER',
  'CHEST': 'BLURRED_CHEST',
  'default': 'WILD' 
};

const REEL_STRIP = ['RED_GEM', 'BLUE_GEM', 'WILD', 'CROWN', 'RING', 'SCATTER', 'GREEN_GEM', 'PURPLE_GEM', 'HOURGLASS', 'CROWN'];

const symbolVariants = {
  idle: {
    y: 0,
    scale: 1,
    filter: 'brightness(1)',
    zIndex: 1,
    opacity: 1,
  },
  chestTransform: {
    scale: [1, 1.15, 1],
    filter: [
      'brightness(1)',
      'brightness(2.5) drop-shadow(0 0 25px rgba(255,215,0,1))',
      'brightness(1)',
    ],
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
  exit: {
    opacity: 0,
    scale: 0.4,
    transition: { duration: 0.2 },
  },
};

const SpinningReel = ({ delay }) => (
  <div className="relative w-full h-full overflow-hidden">
    <motion.div
      className="flex flex-col gap-4"
      animate={{ y: ["-33.33%", "0%"] }}
      transition={{
        repeat: Infinity,
        duration: 0.45,
        ease: "linear",
        delay: delay
      }}
    >
      {[...REEL_STRIP, ...REEL_STRIP, ...REEL_STRIP].map((id, i) => {
        const blurredKey = BLUR_MAP[id] || id;
        const sprite = SYMBOL_SPRITES[blurredKey] || SYMBOL_SPRITES[id];

        return (
          <div key={i} className="w-full aspect-square opacity-80 flex-shrink-0">
             <img 
               src={sprite} 
               alt="spinning" 
               className="w-full h-full object-contain" 
             />
          </div>
        );
      })}
    </motion.div>
  </div>
);

const SlotGrid = ({
  grid,
  winningPositions,
  isRolling,
  isCascading,
  chestTransformPositions = [],
  chestPositions = [],
}) => {
  const getColumn = (colIndex) => grid.map(row => row[colIndex]);

  const isWinning = (row, col) => {
    return winningPositions.some(
      ([winRow, winCol]) => winRow === row && winCol === col
    );
  };

  const isChestTransform = (row, col) => {
    return chestTransformPositions.some(
      ([transformRow, transformCol]) => transformRow === row && transformCol === col
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

        <div className='relative w-full h-full p-6 grid gap-3'
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
            
            {Array.from({ length: GRID_COLS }).map((_, colIndex) => (
              <div key={`col-${colIndex}`} className="relative h-full flex flex-col gap-3">
                
                {isRolling ? (
                  <SpinningReel delay={colIndex * 0.08}/>
                ) : (
                  Array.from({ length: GRID_ROWS }).map((_, rowIndex) => {
                    const symbol = getColumn(colIndex)[rowIndex];
                    
                    if (!symbol) return <div key={rowIndex} className="flex-1" />;

                    let animState = 'idle';
                    if (isChestTransform(rowIndex, colIndex)) animState = 'chestTransform';
                    else if (isChest(rowIndex, colIndex)) animState = 'chestHighlight';

                    const isTransformed = symbol.uniqueId && symbol.uniqueId.includes('transformed');
                    const displaySymbol = symbol.id === 'CHEST_OPENED'
                      ? { ...symbol, id: 'CHEST' }
                      : symbol;

                    return (
                      <div key={rowIndex} className="relative w-full flex-1">
                        <AnimatePresence mode='popLayout'>
                           <motion.div
                              key={symbol.uniqueId}
                              className="w-full h-full" 
                              
                              variants={symbolVariants}
                              initial={
                                isTransformed
                                  ? { scale: 0, opacity: 0, y: 0 }
                                  : { y: -100, opacity: 0, scale: 1 }
                              } 
                              animate={animState} 
                              exit="exit"
                              
                              transition={{
                                type: 'spring',
                                stiffness: 300, 
                                damping: 30,
                                y: { duration: isTransformed ? 0 : 0.4, ease: "backOut" },
                                scale: { duration: 0.3 }
                              }}
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
                  })
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;