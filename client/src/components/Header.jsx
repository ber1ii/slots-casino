import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAudio } from "../context/AudioContext";
import audioManager from "../utils/audioManager";
import { PROFILE_SPRITES } from "../config/gameConfig";

const Header = () => {
  const { user, logout } = useAuth();
  const { soundEnabled, toggleSound } = useAudio();
  const navigate = useNavigate();

  const handleLogout = () => {
    audioManager.play("click");
    logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    audioManager.play("click");
    navigate(path);
  };

  const handleSoundToggle = () => {
    audioManager.play("click");
    toggleSound();
  };

  return (
    <header className="bg-[#050214]/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-[1600px] mx-auto px-4 py-3 md:py-4">
        {/* Main Flex Container */}
        <div className="flex justify-between items-center w-full">
          {/* LEFT: Logo / Title */}
          <div
            onClick={() => handleNavigate("/dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)] group-hover:shadow-[0_0_25px_rgba(124,58,237,0.8)] transition-all">
              <span className="text-xl md:text-2xl">逆</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 group-hover:scale-105 transition-transform duration-300 tracking-tighter drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
              CHROME_REBELLION
            </h1>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 ml-8">
            <button
              onClick={() => handleNavigate("/statistics")}
              className="text-gray-400 hover:text-cyan-400 font-bold transition-all text-xs uppercase tracking-[0.2em] hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] relative group"
            >
              Stats
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 transition-all group-hover:w-full"></span>
            </button>
            <button
              onClick={() => handleNavigate("/leaderboard")}
              className="text-gray-400 hover:text-yellow-400 font-bold transition-all text-xs uppercase tracking-[0.2em] hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] relative group"
            >
              Leaderboard
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-400 transition-all group-hover:w-full"></span>
            </button>
          </nav>

          {/* RIGHT: Controls & Profile */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Desktop Balance Display (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-4 bg-black/40 px-5 py-2 rounded-full border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <span className="text-green-400 font-mono font-bold tracking-wider drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                ${user?.balance?.toFixed(2)}
              </span>
              <div className="w-px h-4 bg-white/10"></div>
              <span className="text-pink-400 font-bold flex items-center gap-2 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)]">
                SPINS: {user?.freeSpins || 0}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleSoundToggle}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 hover:border-purple-400/50 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              <span className="text-xl md:text-2xl opacity-80">
                {soundEnabled ? "🔊" : "🔇"}
              </span>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => handleNavigate("/profile")}
              className="flex items-center gap-3 pl-2 pr-4 py-1.5 md:py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 rounded-full transition-all group hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-shadow group-hover:border-purple-400">
                <img
                  src={PROFILE_SPRITES[user?.avatar] || PROFILE_SPRITES.DANTE}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden lg:inline text-gray-200 font-bold tracking-wide group-hover:text-white transition-colors">
                {user?.username}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="h-10 md:h-12 w-10 md:w-auto md:px-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 font-bold rounded-full transition-all duration-300 flex items-center justify-center uppercase tracking-wider text-xs shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              title="Logout"
            >
              <span className="hidden md:inline">LOGOUT</span>
              <span className="md:hidden text-lg">⏻</span>
            </button>
          </div>
        </div>

        {/* Mobile Balance Display (Only visible on small screens) */}
        <div className="md:hidden mt-3 pt-3 border-t border-white/5 flex justify-between px-2 bg-black/20 rounded-lg pb-1">
          <span className="text-green-400 font-mono font-bold drop-shadow-[0_0_5px_rgba(74,222,128,0.4)]">
            ${user?.balance?.toFixed(2)}
          </span>
          <span className="text-pink-400 font-bold flex items-center gap-2 drop-shadow-[0_0_5px_rgba(244,114,182,0.4)]">
            SPINS: {user?.freeSpins || 0}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
