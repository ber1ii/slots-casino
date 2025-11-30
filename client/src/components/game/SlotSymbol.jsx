import { SYMBOL_SPRITES } from "../../config/gameConfig";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence mode="wait">
        <motion.img
          key={symbol.id}
          src={SYMBOL_SPRITES[symbol.id]}
          alt={symbol.name}
          className="w-full h-full object-contain drop-shadow-lg"
          draggable="false"
          loading="eager"
          decoding="sync"
          initial={{ opacity: isRolling ? 0.7 : 1 }}
          animate={{
            opacity: 1,
            scale: isWinning && !isExploding ? [1, 1.15, 1.15] : 1,
            rotate: isWinning && !isExploding ? [0, -2, 2, -2, 0] : 0,
            filter:
              isWinning && !isExploding
                ? [
                    "brightness(1) drop-shadow(0 0 0px rgba(168,85,247,0))",
                    "brightness(1.5) drop-shadow(0 0 15px rgba(168,85,247,0.8))",
                    "brightness(1.2) drop-shadow(0 0 10px rgba(168,85,247,0.6))",
                  ]
                : "brightness(1)",
          }}
          exit={{ opacity: isRolling ? 0.7 : 0 }}
          transition={
            isRolling
              ? { duration: 0.1 }
              : {
                  duration: isWinning && !isExploding ? 0.4 : 0.1,
                  repeat: isWinning && !isExploding ? Infinity : 0,
                  repeatType: "reverse",
                }
          }
        />
      </AnimatePresence>

      {/* WINNING GLOW OVERLAY */}
      {isWinning &&
        !isExploding &&
        symbol.id !== "CHEST" &&
        symbol.id !== "CHEST_OPENED" && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{
              boxShadow: [
                "inset 0 0 0 1px rgba(168,85,247,0.3), 0 0 10px rgba(168,85,247,0.2)",
                "inset 0 0 0 2px rgba(236,72,153,0.8), 0 0 20px rgba(236,72,153,0.5)",
                "inset 0 0 0 1px rgba(168,85,247,0.3), 0 0 10px rgba(168,85,247,0.2)",
              ],
              backgroundColor: [
                "rgba(168,85,247,0)",
                "rgba(168,85,247,0.1)",
                "rgba(168,85,247,0)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

      {/* EXPLOSION EFFECT */}
      {isExploding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="absolute w-full h-full bg-purple-400 rounded-full mix-blend-screen"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-full h-full border-2 border-white rounded-full"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      )}
    </div>
  );
};

export default SlotSymbol;
