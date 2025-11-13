import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import audioManager from '../utils/audioManager';

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAddBalance = async (e) => {
        e.preventDefault();

        const numAmount = parseFloat(amount);
        if(isNaN(numAmount) || numAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if(numAmount > 10000) {
            toast.error('Maximum deposit is $10.000');
            return;
        }

        setLoading(true)
        try {
            const res = await userAPI.addBalance(numAmount);
            updateUser({ balance: res.data.balance });
            setAmount('');
            toast.success(`Added $${numAmount.toFixed(2)} to balance`);
        } catch(err) {
            toast.error(err.response?.data?.error || 'Failed to add balance');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayClick = () => {
        audioManager.play('click');
        navigate('/game')
    }

    return (
        <div className="cyberpunk-bg min-h-screen">
            <Header />

            <div className="max-w-4xl mx-auto p-4 md:p-8 mt-8">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="card">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Your Balance
                        </h2>
                        <div className="text-4xl md:text-5xl font-bold text-purple-600 mb-2">
                            ${user?.balance?.toFixed(2)}
                        </div>
                        <div className="text-lg text-gray-600">
                            Free Spins:{' '}
                        <span className="font-semibold text-pink-600">
                            {user?.freeSpins || 0}
                        </span>
                    </div>
                </div>

                <div className="card">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                        Add Balance (Practice Mode)
                    </h3>
                    <form onSubmit={handleAddBalance} className="space-y-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            min="0.01"
                            step="0.01"
                            max="10000"
                            required
                            className="input-field"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? 'Adding...' : 'Add Balance'}
                        </button>
                    </form>
                </div>
            </div>

            <button
                onClick={handlePlayClick}
                disabled={!user?.balance || user.balance === 0}
                className="w-full text-xl py-4 bg-gradient-to-r from-indigo-950 via-purple-950 to-blue-950 text-white font-bold rounded-lg border-2 border-cyan-500/50 hover:from-indigo-900 hover:via-purple-900 hover:to-blue-900 hover:border-cyan-400 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
                🎰 Play Slots
            </button>

            {(!user?.balance || user.balance === 0) && (
                <p className="text-center text-white mt-4 text-sm">
                    Add balance to start playing!
                </p>
            )}
        </div>
    </div>
  );
};

export default Dashboard;