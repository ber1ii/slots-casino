import { useEffect, useState } from "react";
import { userAPI } from "../services/api";
import Header from "../components/Header";
import toast from "react-hot-toast";

const StatCard = ({ label, value, subValue, colorClass, delay, icon }) => (
  <div
    className={`bg-gray-900/60 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:bg-gray-800/60 hover:border-white/20 transition-all duration-500 shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className={`absolute -right-6 -top-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 ${colorClass} transform rotate-12 scale-[2] blur-sm`}
    >
      {icon}
    </div>
    <div className="relative z-10">
      <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full ${colorClass.replace(
            "text-",
            "bg-"
          )}`}
        ></span>
        {label}
      </h3>
      <p
        className={`text-3xl md:text-4xl font-black ${colorClass} drop-shadow-md tracking-tight`}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-500 mt-2 font-mono border-t border-white/5 pt-2 inline-block">
          {subValue}
        </p>
      )}
    </div>
  </div>
);

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await userAPI.getStats();
        setStats(res.data);
      } catch (err) {
        toast.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading)
    return (
      // REMOVED SOLID BG so stars show through
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.4)]"></div>
        <div className="text-purple-400 animate-pulse font-mono text-sm tracking-widest">
          ACCESSING NEURAL NET...
        </div>
      </div>
    );

  // Return to player
  const rtp =
    stats.totalWagered > 0
      ? ((stats.totalWins / stats.totalWagered) * 100).toFixed(1)
      : "0.0";

  return (
    // REMOVED SOLID BG
    <div className="min-h-screen selection:bg-purple-500/30">
      <Header />
      <div className="max-w-[1200px] mx-auto p-4 md:p-8 mt-4 md:mt-8">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Neural
            </span>{" "}
            Analytics
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-gray-400 text-xs font-mono uppercase tracking-wide">
              OPERATIVE:{" "}
              <span className="text-white font-bold">{stats?.username}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Row 1: Money Stats */}
          <StatCard
            label="Net Balance"
            value={`$${stats?.balance?.toFixed(2)}`}
            colorClass="text-green-400"
            delay={0}
            icon={<span className="text-6xl">$</span>}
          />
          <StatCard
            label="Highest Win"
            value={`$${stats?.highestWin?.toFixed(2)}`}
            subValue="PERSONAL BEST RECORD"
            colorClass="text-yellow-400"
            delay={100}
            icon={<span className="text-6xl">🏆</span>}
          />
          <StatCard
            label="Total Wagered"
            value={`$${stats?.totalWagered?.toFixed(2)}`}
            colorClass="text-red-400"
            delay={200}
            icon={<span className="text-6xl">📉</span>}
          />
          <StatCard
            label="Total Payout"
            value={`$${stats?.totalWins?.toFixed(2)}`}
            subValue={`RTP: ${rtp}%`}
            colorClass="text-emerald-400"
            delay={300}
            icon={<span className="text-6xl">📈</span>}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Row 2: Gameplay Stats */}
          <div className="bg-gray-900/60 border border-purple-500/20 p-6 md:p-8 rounded-2xl backdrop-blur-md col-span-1 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none"></div>

            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10">
              <span className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              SESSION DATA
            </h2>
            <div className="grid grid-cols-3 gap-8 relative z-10">
              <div className="group">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-purple-400 transition-colors">
                  Total Spins
                </div>
                <div className="text-3xl font-mono text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
                  {stats?.totalSpins}
                </div>
              </div>
              <div className="group">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-pink-400 transition-colors">
                  Max Multiplier
                </div>
                <div className="text-3xl font-mono text-pink-400 group-hover:drop-shadow-[0_0_8px_rgba(244,114,182,0.5)] transition-all">
                  {stats?.biggestMultiplier}x
                </div>
              </div>
              <div className="group">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-cyan-400 transition-colors">
                  Free Spins
                </div>
                <div className="text-3xl font-mono text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all">
                  {stats?.freeSpins}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none"></div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              ACCOUNT
            </h2>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">
                  Status
                </span>
                <span className="text-green-400 font-bold bg-green-400/10 px-3 py-1 rounded border border-green-400/20 shadow-[0_0_10px_rgba(74,222,128,0.1)] text-xs uppercase tracking-widest">
                  ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="text-gray-400 font-bold uppercase text-xs tracking-wider">
                  Joined
                </span>
                <span className="text-gray-200 font-mono">
                  {new Date(stats?.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
