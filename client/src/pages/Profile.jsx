import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import api from "../services/api";
import Header from "../components/Header";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [usernameForm, setUsernameForm] = useState({
    newUsername: user?.username || "",
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      await api.post("/auth/change-password", {
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
      const res = await api.post("/auth/change-username", {
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
      await api.delete("auth/delete-account");
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
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Profile Settings
        </h1>

        <div className="space-y-6">
          {/* Change Username */}
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

          {/* Change Password */}
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

          {/* Delete Account */}
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
