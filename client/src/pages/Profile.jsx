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
    <div className="cyberpunk-bg min-h-screen">
      <Header />

      <div className="max-w-4xl mx-auto p-4 md:p-8 mt-8">
        <div className="flex flex-col items-center mb-10">
          {/* Big Circular Profile Picture */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] overflow-hidden mb-4 bg-black group">
            <img
              src={PROFILE_SPRITES[user?.avatar] || PROFILE_SPRITES.DANTE}
              alt="Profile"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
            {user?.username}
          </h1>
          <p className="text-gray-400 mb-6 font-mono text-sm">
            OPERATIVE ID: {user?.id?.slice(-6).toUpperCase()}
          </p>

          {/* Avatar Selector Grid */}
          <div className="w-full max-w-2xl bg-black/40 rounded-xl border border-white/10 p-6 backdrop-blur-md">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-4 text-center">
              Select New Avatar
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(PROFILE_SPRITES).map(([key, src]) => (
                <button
                  key={key}
                  disabled={changingAvatar}
                  onClick={() => handleAvatarChange(key)}
                  className={`
                                relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 transition-all duration-300
                                ${
                                  user?.avatar === key
                                    ? "border-yellow-400 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.6)] grayscale-0 z-10"
                                    : "border-white/10 hover:border-purple-400 opacity-60 hover:opacity-100 grayscale hover:grayscale-0 hover:scale-105"
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

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Change Username
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
                className="input-field"
              />
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Updating..." : "Update Username"}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Change Password
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
                placeholder="Current password"
                required
                className="input-field"
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
                placeholder="New password"
                minLength={6}
                required
                className="input-field"
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
                placeholder="Confirm new password"
                minLength={6}
                required
                className="input-field"
              />
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          <div className="card border-2 border-red-500">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Danger Zone
            </h2>
            <p className="text-gray-700 mb-4">
              Once you delete your account, there is no going back. This action
              cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-red-600 font-semibold">
                  Are you absolutely sure?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
                  >
                    {loading ? "Deleting..." : "Yes, Delete Forever"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition-all"
                  >
                    Cancel
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
