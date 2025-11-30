import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAudio } from "../context/AudioContext";
import audioManager from "../utils/audioManager";
import { PROFILE_SPRITES } from "../config/gameConfig";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const { user, logout } = useAuth();
  const { soundEnabled, toggleSound } = useAudio();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    audioManager.play("click");
    logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    audioManager.play("click");
    navigate(path);
    setIsMenuOpen(false);
  };

  const handleSoundToggle = () => {
    audioManager.play("click");
    toggleSound();
  };

  return (
    <header className="bg-[#050214]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 shadow-lg h-[80px] flex items-center shrink-0">
      <div className="w-full max-w-[1600px] mx-auto px-4">
        <div className="flex justify-between items-center w-full">
          {/* LEFT: Logo */}
          <div
            onClick={() => handleNavigate("/dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <span className="text-2xl text-white font-bold">逆</span>
            </div>
            <h1 className="hidden md:block text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tighter">
              CHROME_REBELLION
            </h1>
          </div>

          {/* CENTER: Mobile Balance (Visible only on mobile) */}
          <div className="md:hidden flex flex-col items-center">
            <span className="text-green-400 font-mono font-bold text-sm drop-shadow-md">
              ${user?.balance?.toFixed(2)}
            </span>
            <span className="text-[10px] text-pink-400 font-bold tracking-widest">
              {user?.freeSpins || 0} SPINS
            </span>
          </div>

          {/* RIGHT: Desktop Nav & Controls */}
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6 mr-4">
              <button
                onClick={() => handleNavigate("/statistics")}
                className="text-gray-400 hover:text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Stats
              </button>
              <button
                onClick={() => handleNavigate("/leaderboard")}
                className="text-gray-400 hover:text-yellow-400 font-bold text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Leaderboard
              </button>
            </nav>

            <div className="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-full border border-white/10">
              <span className="text-green-400 font-mono font-bold tracking-wider">
                ${user?.balance?.toFixed(2)}
              </span>
              <div className="w-px h-4 bg-white/10"></div>
              <span className="text-pink-400 font-bold text-sm">
                SPINS: {user?.freeSpins || 0}
              </span>
            </div>

            <button
              onClick={handleSoundToggle}
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all"
            >
              {soundEnabled ? "🔊" : "🔇"}
            </button>

            <button
              onClick={() => handleNavigate("/profile")}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/50 hover:border-purple-400 transition-all"
            >
              <img
                src={PROFILE_SPRITES[user?.avatar] || PROFILE_SPRITES.DANTE}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>

            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider"
            >
              Logout
            </button>
          </div>

          {/* RIGHT: Mobile Hamburger */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white bg-white/10 rounded-lg active:bg-white/20 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN MENU */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[80px] left-0 right-0 bg-[#0a0a12] border-b border-white/10 shadow-2xl p-4 md:hidden flex flex-col gap-4 z-40"
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleNavigate("/statistics")}
                className="bg-white/5 p-4 rounded-xl text-center border border-white/5 active:bg-white/10"
              >
                <div className="text-cyan-400 text-xl mb-1">📊</div>
                <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  Stats
                </div>
              </button>
              <button
                onClick={() => handleNavigate("/leaderboard")}
                className="bg-white/5 p-4 rounded-xl text-center border border-white/5 active:bg-white/10"
              >
                <div className="text-yellow-400 text-xl mb-1">🏆</div>
                <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  Rank
                </div>
              </button>
            </div>

            <div
              className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5"
              onClick={() => handleNavigate("/profile")}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500">
                  <img
                    src={PROFILE_SPRITES[user?.avatar] || PROFILE_SPRITES.DANTE}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-bold text-white">{user?.username}</span>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                Profile &gt;
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSoundToggle}
                className="flex-1 py-3 bg-white/5 rounded-lg border border-white/5 text-xs font-bold uppercase tracking-widest text-gray-400"
              >
                {soundEnabled ? "Mute" : "Unmute"}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-red-500/10 rounded-lg border border-red-500/20 text-xs font-bold uppercase tracking-widest text-red-400"
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
