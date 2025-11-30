import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { userAPI } from "../services/api";
import toast from "react-hot-toast";
import Header from "../components/Header";
import audioManager from "../utils/audioManager";

const Dashboard = () => {
  const { user, updateUser, loading } = useAuth();
  const [amount, setAmount] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.4)]"></div>
      </div>
    );
  }

  const handleAddBalance = async (e) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount > 10000) {
      toast.error("Maximum deposit is $10.000");
      return;
    }

    setBtnLoading(true);
    try {
      const res = await userAPI.addBalance(numAmount);
      updateUser({ balance: res.data.balance });
      setAmount("");
      toast.success(`Added $${numAmount.toFixed(2)} to balance`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add balance");
    } finally {
      setBtnLoading(false);
    }
  };

  const handlePlayClick = () => {
    audioManager.play("click");
    navigate("/game");
  };

  return (
    <div className="min-h-screen selection:bg-purple-500/30">
      <Header />

      <div className="max-w-5xl mx-auto p-4 md:p-8 mt-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Balance Card */}
          <div className="bg-gray-900/60 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/50 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-purple-600/30 transition-all"></div>

            <h2 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Balance
            </h2>
            <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              ${user?.balance?.toFixed(2)}
            </div>
            <div className="flex items-center gap-3 bg-black/30 w-fit px-4 py-2 rounded-lg border border-white/5">
              <span className="text-gray-400 text-xs uppercase font-bold">
                Free Spins
              </span>
              <span className="text-xl font-mono text-pink-500 font-bold drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
                {user?.freeSpins || 0}
              </span>
            </div>
          </div>

          {/* Deposit Card */}
          <div className="bg-gray-900/60 border border-white/10 rounded-2xl p-8 backdrop-blur-md relative">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Quick Deposit (Practice)
            </h3>
            <form onSubmit={handleAddBalance} className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                  max="10000"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-8 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={btnLoading}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-white/10 transition-all uppercase tracking-widest text-xs hover:border-white/20 hover:shadow-lg disabled:opacity-50"
              >
                {btnLoading ? "PROCESSING..." : "ADD FUNDS"}
              </button>
            </form>
          </div>
        </div>

        {/* Big Play Button */}
        <button
          onClick={handlePlayClick}
          disabled={!user?.balance || user.balance === 0}
          className="relative group w-full py-8 md:py-12 bg-gradient-to-r from-indigo-950 via-purple-900 to-indigo-950 rounded-2xl border-2 border-purple-500/30 overflow-hidden shadow-[0_0_30px_rgba(88,28,135,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] hover:border-purple-400/60 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          <div className="relative z-10 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl md:text-6xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-300">
              ENTER THE GRID
            </span>
            <span className="text-purple-300 font-mono text-sm tracking-[0.5em] uppercase opacity-70 group-hover:opacity-100 transition-opacity">
              Initiate Slot Protocol
            </span>
          </div>
        </button>

        {(!user?.balance || user.balance === 0) && (
          <div className="mt-6 text-center">
            <p className="text-red-400 font-mono text-sm bg-red-500/10 inline-block px-4 py-2 rounded-lg border border-red-500/20">
              ⚠ INSUFFICIENT FUNDS: DEPOSIT REQUIRED TO ENTER
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
