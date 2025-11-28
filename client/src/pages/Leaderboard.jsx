import { useEffect, useState } from "react";
import { userAPI } from "../services/api";
import Header from "../components/Header";
import toast from "react-hot-toast";
import { PROFILE_SPRITE } from "../config/gameConfig";

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
      return "bg-gradient-to-r from-yellow-900/40 to-yellow-600/10 border-yellow-500/50";
    if (index === 1)
      return "bg-gradient-to-r from-gray-800/40 to-gray-600/10 border-gray-400/50";
    if (index === 2)
      return "bg-gradient-to-r from-orange-900/40 to-orange-700/10 border-orange-500/50";
    return "bg-gray-900/40 border-white/5 hover:bg-gray-800/40";
  };

  const getRankIcon = (index) => {
    if (index === 0) return "👑";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 uppercase tracking-tighter mb-2">
            Global Elite
          </h1>
          <p className="text-gray-400">Top ranked operatives by net worth</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((user, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.01] ${getRankStyle(
                  index
                )}`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-8 flex justify-center text-xl font-black text-white/80">
                    {getRankIcon(index)}
                  </div>

                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/10 bg-black">
                    <img
                      src={PROFILE_SPRITE?.DANTE}
                      className="w-full h-full object-cover opacity-80"
                      alt="avatar"
                    />
                  </div>

                  <div>
                    <div className="font-bold tracking-wide text-white text-lg">
                      {user.username}
                    </div>
                    {index === 0 && (
                      <div className="text-xs text-yellow-400 font-bold uppercase tracking-wider">
                        Current Champion
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-xl md:text-2xl text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]">
                    ${user.balance.toFixed(2)}
                  </div>
                  <div className="hidden md:block text-xs text-gray-500 uppercase font-semibold">
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
