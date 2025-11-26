import { SYMBOL_SPRITES } from '../../config/gameConfig';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SlotSymbol = ({ symbol, isWinning, isRolling, isCascading }) => {
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    if (isWinning && !isRolling && !isCascading) {
      const timer = setTimeout(() => setIsExploding(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsExploding(false);
    }
  }, [isWinning, isRolling, isCascading]);

  if (!symbol) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Image with key based on symbol.id so it transitions smoothly */}
      <AnimatePresence mode="wait">
        <motion.img
          key={symbol.id} // Key changes when symbol.id changes
          src={SYMBOL_SPRITES[symbol.id]}
          alt={symbol.name}
          className="w-full h-full object-contain"
          draggable="false"
          initial={{ opacity: isRolling ? 0.7 : 1 }}
          animate={{
            opacity: 1,
            scale: isWinning && !isExploding ? [1, 1.15, 1.1] : 1,
            rotate: isWinning && !isExploding ? [0, -5, 5, -5, 0] : 0,
            filter:
              isWinning && !isExploding
                ? [
                    'brightness(1) drop-shadow(0 0 10px rgba(168,85,247,0.8))',
                    'brightness(1.3) drop-shadow(0 0 25px rgba(168,85,247,1))',
                    'brightness(1.15) drop-shadow(0 0 20px rgba(168,85,247,0.9))',
                  ]
                : 'brightness(1) drop-shadow(0 0 0px rgba(0,0,0,0))',
          }}
          exit={{ opacity: isRolling ? 0.7 : 0 }}
          transition={
            isRolling
              ? { duration: 0.1 } // Super fast during spin
              : {
                  duration: isWinning && !isExploding ? 0.2 : 0.1,
                  repeat: isWinning && !isExploding ? Infinity : 0,
                  repeatType: 'reverse',
                }
          }
        />
      </AnimatePresence>

      {isWinning && !isExploding && symbol.id !== 'CHEST' && symbol.id !== 'CHEST_OPENED' && (
        <>
          <motion.div
            className="absolute inset-0 bg-purple-500/30 rounded-lg"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-purple-400"
            animate={{
              borderColor: [
                'rgba(168, 85, 247, 0.8)',
                'rgba(236, 72, 153, 1)',
                'rgba(168, 85, 247, 0.8)',
              ],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        </>
      )}

      {isExploding && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="absolute w-full h-full bg-yellow-400 rounded-full blur-lg"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-3/4 h-3/4 bg-red-500 rounded-full blur-md"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
          />
          <motion.div
            className="absolute w-1/2 h-1/2 bg-purple-600 rounded-full blur-sm"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
      )}
    </div>
  );
};

export default SlotSymbol;