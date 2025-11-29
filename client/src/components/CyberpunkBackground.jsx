import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

const CyberpunkBackground = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth mouse follow
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  // Detect Mobile/Tablet to disable parallax
  useEffect(() => {
    const checkMobile = () => {
      // Check if width is < 1024px OR if device has coarse pointer (touch)
      const mobile =
        window.innerWidth < 1024 ||
        window.matchMedia("(pointer: coarse)").matches;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // If mobile, force 0 movement. If desktop, allow range.
  const moveStarsFarX = useTransform(
    smoothX,
    [0, window.innerWidth],
    isMobile ? [0, 0] : [-20, 20]
  );
  const moveStarsFarY = useTransform(
    smoothY,
    [0, window.innerHeight],
    isMobile ? [0, 0] : [-20, 20]
  );

  const moveStarsNearX = useTransform(
    smoothX,
    [0, window.innerWidth],
    isMobile ? [0, 0] : [-40, 40]
  );
  const moveStarsNearY = useTransform(
    smoothY,
    [0, window.innerHeight],
    isMobile ? [0, 0] : [-40, 40]
  );

  const moveGridX = useTransform(
    smoothX,
    [0, window.innerWidth],
    isMobile ? [0, 0] : [-30, 30]
  );
  const moveGridY = useTransform(
    smoothY,
    [0, window.innerHeight],
    isMobile ? [0, 0] : [-10, 10]
  );

  useEffect(() => {
    if (isMobile) return; // Don't listen on mobile

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY, isMobile]);

  const farStars = useMemo(() => generateStars(100), []);
  const nearStars = useMemo(() => generateStars(50), []);

  return (
    // Changed min-h-screen to min-h-[100dvh] for mobile browser bars
    <div className="bg-[#050214] min-h-[100dvh] relative overflow-hidden font-sans selection:bg-purple-500/30">
      {/* ... (Keep existing Star and Grid Layers EXACTLY as they were) ... */}

      {/* --- LAYER 1: STARS --- */}
      <motion.div
        className="fixed inset-[-50px] z-0 pointer-events-none"
        style={{ x: moveStarsFarX, y: moveStarsFarY }}
      >
        {farStars.map((star, i) => (
          <div
            key={`far-${i}`}
            className="absolute bg-white rounded-full"
            style={{
              ...star,
              opacity: Math.random() * 0.3 + 0.1,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </motion.div>

      <motion.div
        className="fixed inset-[-100px] z-0 pointer-events-none"
        style={{ x: moveStarsNearX, y: moveStarsNearY }}
      >
        {nearStars.map((star, i) => (
          <div
            key={`near-${i}`}
            className="absolute bg-purple-200 rounded-full shadow-[0_0_3px_rgba(255,255,255,0.8)]"
            style={{
              ...star,
              opacity: Math.random() * 0.5 + 0.3,
            }}
          />
        ))}
      </motion.div>

      {/* --- LAYER 2: HORIZON GLOW --- */}
      <div className="fixed top-[50%] left-[-50%] right-[-50%] h-[200px] -mt-[100px] z-0 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-600/20 via-purple-900/5 to-transparent blur-[60px] transform scale-x-150" />
      </div>

      {/* --- LAYER 3: DUAL MIRRORED GRIDS --- */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="absolute top-[-30%] left-[-50%] right-[-50%] h-[80%] origin-bottom"
          style={{ x: moveGridX, y: moveGridY, rotateX: -75 }}
        >
          {/* Grid Content */}
          <div
            className="w-full h-full"
            style={{
              backgroundSize: "60px 60px",
              backgroundImage: `linear-gradient(to right, rgba(236, 72, 153, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(236, 72, 153, 0.3) 1px, transparent 1px)`,
              maskImage:
                "linear-gradient(to bottom, black 5%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 5%, transparent 60%)",
            }}
          />
        </motion.div>

        <motion.div
          className="absolute bottom-[-30%] left-[-50%] right-[-50%] h-[80%] origin-top"
          style={{ x: moveGridX, y: moveGridY, rotateX: 75 }}
        >
          {/* Grid Content */}
          <div
            className="w-full h-full"
            style={{
              backgroundSize: "60px 60px",
              backgroundImage: `linear-gradient(to right, rgba(236, 72, 153, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(236, 72, 153, 0.3) 1px, transparent 1px)`,
              maskImage: "linear-gradient(to top, black 5%, transparent 60%)",
              WebkitMaskImage:
                "linear-gradient(to top, black 5%, transparent 60%)",
            }}
          />
        </motion.div>
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_20%,#050214_110%)]" />

      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ... generateStars function ...
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

export default CyberpunkBackground;
