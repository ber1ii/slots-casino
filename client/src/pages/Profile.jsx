import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";
import Header from "../components/Header";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { PROFILE_SPRITES } from "../config/gameConfig";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [changingAvatar, setChangingAvatar] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [usernameForm, setUsernameForm] = useState({
    newUsername: user?.username || "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAvatarChange = async (key) => {
    if (key === user?.avatar) return;
    setChangingAvatar(true);
    try {
      const res = await authAPI.changeAvatar(key);
      updateUser({ avatar: res.data.avatar });
      toast.success("Identity updated");
    } catch (err) {
      toast.error("Failed to update avatar");
    } finally {
      setChangingAvatar(false);
    }
  };
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await authAPI.post("/auth/change-password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };
  const handleUsernameChange = async (e) => {
    e.preventDefault();
    if (usernameForm.newUsername.length < 3) {
      toast.error("Username must be at least 3 characters long");
      return;
    }
    if (usernameForm.newUsername === user?.username) {
      toast.error("This is already your username");
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.post("/auth/change-username", {
        newUsername: usernameForm.newUsername,
      });
      updateUser({ username: res.data.username });
      toast.success("Username changed successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to change username");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await authAPI.delete("auth/delete-account");
      toast.success("Account deleted succesfully");
      logout();
      navigate("/register");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete account");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen selection:bg-purple-500/30">
      <Header />

      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-4 md:mt-8">
        <div className="flex flex-col items-center mb-12 relative">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none"></div>

          {/* Big Circular Profile Picture */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.4)] overflow-hidden mb-6 bg-black group z-10">
            <img
              src={PROFILE_SPRITES[user?.avatar] || PROFILE_SPRITES.DANTE}
              alt="Profile"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 bg-[length:100%_4px,3px_100%] pointer-events-none opacity-50"></div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tighter drop-shadow-lg z-10">
            {user?.username}
          </h1>
          <p className="text-purple-400 mb-8 font-mono text-sm tracking-widest bg-purple-500/10 px-4 py-1 rounded-full border border-purple-500/20 z-10">
            ID: {user?.username?.slice(-6).toUpperCase()}
          </p>

          {/* Avatar Selector Grid */}
          <div className="w-full max-w-2xl bg-gray-900/60 rounded-2xl border border-white/10 p-6 backdrop-blur-md z-10">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-6 text-center">
              Modify Appearance
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
              {Object.entries(PROFILE_SPRITES).map(([key, src]) => (
                <button
                  key={key}
                  disabled={changingAvatar}
                  onClick={() => handleAvatarChange(key)}
                  className={`
                        relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300
                        ${
                          user?.avatar === key
                            ? "border-purple-500 scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] grayscale-0 z-10"
                            : "border-white/5 hover:border-white/30 opacity-60 hover:opacity-100 grayscale hover:grayscale-0 hover:scale-105"
                        }
                    `}
                >
                  <img
                    src={src}
                    alt={key}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900/60 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Codename
            </h2>
            <form onSubmit={handleUsernameChange} className="space-y-4">
              <input
                type="text"
                value={usernameForm.newUsername}
                onChange={(e) =>
                  setUsernameForm({ newUsername: e.target.value })
                }
                placeholder="New username"
                minLength={3}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600/20 text-blue-200 border border-blue-500/30 hover:bg-blue-600/40 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
              >
                {loading ? "Updating..." : "Update Identity"}
              </button>
            </form>
          </div>

          <div className="bg-gray-900/60 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
              Security Protocol
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    oldPassword: e.target.value,
                  })
                }
                placeholder="Current pass"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-mono"
              />
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                placeholder="New pass"
                minLength={6}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-mono"
              />
              <PasswordStrengthMeter password={passwordForm.newPassword} />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                placeholder="Confirm pass"
                minLength={6}
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-yellow-600/20 text-yellow-200 border border-yellow-500/30 hover:bg-yellow-600/40 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
              >
                {loading ? "Updating..." : "Update Credentials"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 border-t border-red-500/20 pt-8">
          <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-red-500 mb-2">Danger Zone</h2>
            <p className="text-red-400/60 text-sm mb-6">
              Terminating your operative status is irreversible. All assets and
              data will be purged.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-600/10 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-red-500/30">
                <p className="text-white font-bold text-sm">
                  CONFIRM TERMINATION?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all text-xs uppercase tracking-wider"
                  >
                    {loading ? "PURGING..." : "YES, DELETE"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all text-xs uppercase tracking-wider"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
