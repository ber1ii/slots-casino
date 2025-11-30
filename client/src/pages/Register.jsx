import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { PROFILE_SPRITES } from "../config/gameConfig";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("DANTE");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(username, email, password, selectedAvatar);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4 selection:bg-purple-500/30">
      <div className="relative w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(124,58,237,0.15)] overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

        <h1 className="text-3xl font-black text-white mb-2 text-center tracking-tight">
          INITIALIZE
        </h1>
        <p className="text-gray-500 text-center mb-8 font-mono text-xs uppercase tracking-widest">
          Create New Operative Identity
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <div className="mb-8">
          <label className="block text-gray-400 font-bold text-xs uppercase tracking-wider mb-4 text-center">
            Select Avatar Class
          </label>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(PROFILE_SPRITES).map(([key, src]) => (
              <div
                key={key}
                onClick={() => setSelectedAvatar(key)}
                className={`
                    relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 aspect-square group bg-black/40
                    ${
                      selectedAvatar === key
                        ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)] ring-1 ring-purple-400 scale-105"
                        : "border-white/5 hover:border-white/30 opacity-60 hover:opacity-100 hover:scale-105"
                    }
                `}
              >
                <img
                  src={src}
                  alt={key}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="OPERATIVE_NAME"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">
              Email Protocol
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="secure@channel.com"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">
              Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "INITIALIZING..." : "CONFIRM REGISTRATION"}
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 text-sm">
          Already verified?{" "}
          <Link
            to="/login"
            className="text-purple-400 font-bold hover:text-purple-300 transition-colors"
          >
            ACCESS TERMINAL
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
