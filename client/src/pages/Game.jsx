import { useEffect, useMemo } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import Header from "../components/Header";
import SlotGame from "../components/game/SlotGame";
import audioManager from "../utils/audioManager";

const Game = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const moveStarsFarX = useTransform(
    smoothX,
    [0, window.innerWidth],
    [-20, 20]
  );
  const moveStarsFarY = useTransform(
    smoothY,
    [0, window.innerHeight],
    [-20, 20]
  );

  const moveStarsNearX = useTransform(
    smoothX,
    [0, window.innerWidth],
    [-50, 50]
  );
  const moveStarsNearY = useTransform(
    smoothY,
    [0, window.innerHeight],
    [-50, 50]
  );

  const moveGridX = useTransform(smoothX, [0, window.innerWidth], [-30, 30]);
  const moveGridY = useTransform(smoothY, [0, window.innerHeight], [-10, 10]);

  useEffect(() => {
    audioManager.playAmbient();

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      audioManager.stopAmbient();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  const farStars = useMemo(() => generateStars(150), []);
  const nearStars = useMemo(() => generateStars(60), []);

  return (
    <div className="cyberpunk-bg min-h-screen relative overflow-hidden">
      {/* Layer 1: Far Background Stars */}
      <motion.div
        className="fixed inset-[-50px] z-0 pointer-events-none"
        style={{ x: moveStarsFarX, y: moveStarsFarY }}
      >
        {farStars.map((star, i) => (
          <div
            key={`far-${i}`}
            className="absolute bg-white rounded-full opacity-40"
            style={{
              ...star,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </motion.div>

      {/* Layer 2: Near Stars/Dust */}
      <motion.div
        className="fixed inset-[-100px] z-0 pointer-events-none"
        style={{ x: moveStarsNearX, y: moveStarsNearY }}
      >
        {nearStars.map((star, i) => (
          <div
            key={`near-${i}`}
            className="absolute bg-purple-300 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]"
            style={{
              ...star,
              width: parseFloat(star.width) * 1.5 + "px",
              height: parseFloat(star.height) * 1.5 + "px",
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* Layer 3: Cyberpunk Grid / Floor */}
      <motion.div
        className="fixed bottom-[-20%] left-[-50%] right-[-50%] h-[60vh] z-0 pointer-events-none"
        style={{
          x: moveGridX,
          y: moveGridY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* INCREASED OPACITY: Changed #8b5cf620 to #8b5cf660 (approx 40% opacity) */}
        <div className="w-full h-full bg-[linear-gradient(to_right,#8b5cf660_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf660_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,transparent_5%,black_100%)]" />
      </motion.div>

      {/* Layer 4: Cyberpunk vignette/glow */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Layer 4: Game UI */}
      <div className="relative z-10 isolate" style={{ transform: "translateZ(0)" }}>
        <Header />
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4">
          <SlotGame />
        </div>
      </div>
    </div>
  );
};

const generateStars = (count) => {
  return Array.from({ length: count }).map(() => ({
    width: Math.random() * 2 + 1 + "px",
    height: Math.random() * 2 + 1 + "px",
    top: Math.random() * 100 + "%",
    left: Math.random() * 100 + "%",
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 3 + "s",
  }));
};

export default Game;
