import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAudio } from "../context/AudioContext";
import audioManager from "../utils/audioManager";
import { PROFILE_SPRITE } from "../config/gameConfig";

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
    <header className="bg-white/10 backdrop-blur-md shadow-lg border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        {/* Main Flex Container */}
        <div className="flex justify-between items-center w-full">
          {/* LEFT: Logo / Title */}
          <div
            onClick={() => handleNavigate("/dashboard")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <h1 className="text-xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 group-hover:scale-105 transition-transform duration-300">
              鋼反逆 Chrome Rebellion
            </h1>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 ml-4">
            <button
              onClick={() => handleNavigate("/statistics")}
              className="text-gray-400 hover:text-cyan-400 font-bold transition-colors text-xs uppercase tracking-widest hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"
            >
              Stats
            </button>
            <button
              onClick={() => handleNavigate("/leaderboard")}
              className="text-gray-400 hover:text-yellow-400 font-bold transition-colors text-xs uppercase tracking-widest hover:drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"
            >
              Leaderboard
            </button>
          </nav>

          {/* RIGHT: Controls & Profile */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Desktop Balance Display (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-4 bg-black/40 px-5 py-2 rounded-full border border-white/10 shadow-inner">
              <span className="text-green-400 font-mono font-bold tracking-wider">
                ${user?.balance?.toFixed(2)}
              </span>
              <div className="w-px h-4 bg-white/20"></div>
              <span className="text-yellow-400 font-bold flex items-center gap-2">
                無償 {user?.freeSpins || 0}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleSoundToggle}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/5 hover:border-purple-400/50"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              <span className="text-xl md:text-2xl">
                {soundEnabled ? "無" : "音"}
              </span>
            </button>

            {/* Profile Button */}
            <button
              onClick={() => handleNavigate("/profile")}
              className="flex items-center gap-3 pl-2 pr-4 py-1.5 md:py-1 bg-white/10 hover:bg-white/20 border border-white/5 hover:border-purple-400/50 rounded-full transition-all group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-shadow">
                <img
                  src={PROFILE_SPRITE.DANTE}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="hidden lg:inline text-white font-semibold tracking-wide group-hover:text-purple-200 transition-colors">
                {user?.username}
              </span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="h-10 md:h-12 px-4 md:px-6 bg-red-500/20 hover:bg-red-500/80 text-red-200 hover:text-white border border-red-500/30 font-semibold rounded-full transition-all duration-300 flex items-center justify-center"
            >
              <span className="hidden md:inline">Logout</span>
              <span className="md:hidden">囈</span> {/* Icon for mobile */}
            </button>
          </div>
        </div>

        {/* Mobile Balance Display (Only visible on small screens) */}
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 flex justify-between px-2">
          <span className="text-green-400 font-mono font-bold">
            ${user?.balance?.toFixed(2)}
          </span>
          <span className="text-yellow-400 font-bold flex items-center gap-2">
            笞｡ {user?.freeSpins || 0}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
