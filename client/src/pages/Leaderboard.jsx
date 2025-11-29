import { useEffect, useState } from "react";
import { userAPI } from "../services/api";
import Header from "../components/Header";
import toast from "react-hot-toast";
import { PROFILE_SPRITES } from "../config/gameConfig";

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await userAPI.getLeaderboard();
        setUsers(res.data);
      } catch (err) {
        toast.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankStyle = (index) => {
    if (index === 0)
      return "bg-gradient-to-r from-yellow-900/20 to-yellow-600/5 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)] scale-[1.02] z-10";
    if (index === 1)
      return "bg-gradient-to-r from-gray-700/20 to-gray-500/5 border-gray-400/30 shadow-[0_0_15px_rgba(156,163,175,0.1)]";
    if (index === 2)
      return "bg-gradient-to-r from-orange-900/20 to-orange-700/5 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]";
    return "bg-gray-900/40 border-white/5 hover:bg-gray-800/60 hover:border-white/10";
  };

  const getRankIcon = (index) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return (
      <span className="text-gray-600 font-mono text-sm">#{index + 1}</span>
    );
  };

  return (
    // REMOVED SOLID BG so stars show through
    <div className="min-h-screen selection:bg-purple-500/30">
      <Header />
      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-4 md:mt-8">
        <div className="text-center mb-12 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none"></div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 uppercase tracking-tighter mb-3 relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            Global Elite
          </h1>
          <p className="text-gray-400 font-mono text-sm tracking-widest relative z-10 uppercase">
            // Ranking Operatives by Net Worth
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-900/50 border border-white/5 rounded-xl animate-pulse backdrop-blur-sm"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:translate-x-2 ${getRankStyle(
                  index
                )}`}
              >
                <div className="flex items-center gap-4 md:gap-8">
                  <div
                    className={`w-8 md:w-12 flex justify-center text-2xl md:text-3xl font-black ${
                      index < 3 ? "scale-125" : ""
                    }`}
                  >
                    {getRankIcon(index)}
                  </div>

                  <div
                    className={`
                    relative rounded-full overflow-hidden border-2 bg-black
                    ${
                      index === 0
                        ? "w-14 h-14 md:w-16 md:h-16 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                        : index === 1
                        ? "w-12 h-12 md:w-14 md:h-14 border-gray-400"
                        : index === 2
                        ? "w-12 h-12 md:w-14 md:h-14 border-orange-500"
                        : "w-10 h-10 md:w-12 md:h-12 border-white/10 opacity-70"
                    }
                  `}
                  >
                    <img
                      src={
                        PROFILE_SPRITES[user.avatar] || PROFILE_SPRITES.DANTE
                      }
                      className="w-full h-full object-cover"
                      alt="avatar"
                    />
                  </div>

                  <div>
                    <div
                      className={`font-bold tracking-wide text-white ${
                        index === 0
                          ? "text-xl md:text-2xl"
                          : "text-lg md:text-xl"
                      }`}
                    >
                      {user.username}
                    </div>
                    {index === 0 && (
                      <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-[0.2em] mt-1 animate-pulse">
                        Current Champion
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-mono font-bold ${
                      index === 0
                        ? "text-2xl md:text-3xl text-green-400"
                        : "text-xl md:text-2xl text-green-500/80"
                    } drop-shadow-md`}
                  >
                    ${user.balance.toFixed(2)}
                  </div>
                  <div className="hidden md:block text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">
                    Total Wealth
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
