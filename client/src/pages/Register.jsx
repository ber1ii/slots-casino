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
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Register for Chrome Rebellion
        </h1>
        {error && <div className="error-box">{error}</div>}

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-3 text-center">
            Select Avatar
          </label>
          <div className="grid grid-cols-4 gap-2 bg-black/10 p-3 rounded-xl border border-purple-500/20">
            {Object.entries(PROFILE_SPRITES).map(([key, src]) => (
              <div
                key={key}
                onClick={() => setSelectedAvatar(key)}
                className={`
                                    relative cursor-pointer rounded-full overflow-hidden border-2 transition-all duration-200 aspect-square group
                                    ${
                                      selectedAvatar === key
                                        ? "border-purple-600 scale-110 shadow-[0_0_10px_rgba(147,51,234,0.5)] ring-2 ring-purple-300"
                                        : "border-transparent hover:border-purple-400 opacity-70 hover:opacity-100 hover:scale-105"
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="coolplayer123"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••"
              className="input-field"
            />
            <PasswordStrengthMeter password={password} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-600 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
