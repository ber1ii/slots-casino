import { useEffect, useState } from "react";
import { userAPI } from "../services/api";
import Header from "../components/Header";
import toast from "react-hot-toast";

const StatCard = ({ label, value, subValue, colorClass, delay, icon }) => (
  <div
    className={`bg-gray-900/60 border border-white/5 p-6 rounded-xl backdrop-blur-md relative overflow-hidden group hover:bg-gray-800/60 transition-all duration-300 animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className={`absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass} transform rotate-12 scale-150`}
    >
      {icon}
    </div>
    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
      {label}
    </h3>
    <p
      className={`text-2xl md:text-3xl font-black ${colorClass} drop-shadow-lg`}
    >
      {value}
    </p>
    {subValue && (
      <p className="text-xs text-gray-500 mt-1 font-mono">{subValue}</p>
    )}
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
      <div className="min-h-screen bg-[#050214] flex items-center justify-center">
        <div className="text-purple-400 animate-pulse font-mono">
          NEURO-LINK ESTABLISHED...
        </div>
      </div>
    );

  // Return to player
  const rtp =
    stats.totalWagered > 0
      ? ((stats.totalWins / stats.totalWagered) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-6xl mx-auto p-4 md:p-8 mt-4">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Neural
            </span>{" "}
            Analytics
          </h1>
          <p className="text-gray-400 text-sm">
            Performance metrics for operative:{" "}
            <span className="text-white font-mono">{stats?.username}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            subValue="Personal Best"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 2: Gameplay Stats */}
          <div className="bg-gray-900/40 border border-purple-500/20 p-6 rounded-xl backdrop-blur-sm col-span-1 md:col-span-2">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              Session Data
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-500 text-xs uppercase">
                  Total Spins
                </div>
                <div className="text-2xl font-mono text-white">
                  {stats?.totalSpins}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase">
                  Max Multiplier
                </div>
                <div className="text-2xl font-mono text-pink-400">
                  {stats?.biggestMultiplier}x
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase">
                  Free Spins Left
                </div>
                <div className="text-2xl font-mono text-cyan-400">
                  {stats?.freeSpins}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4">Account</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="text-green-400 font-bold bg-green-400/10 px-2 rounded">
                  ONLINE
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Joined</span>
                <span className="text-gray-300 font-mono">
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
