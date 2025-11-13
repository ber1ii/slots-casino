import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../context/AudioContext';
import audioManager from '../utils/audioManager';

const Header = () => {
    const { user, logout } = useAuth();
    const { soundEnabled, toggleSound } = useAudio();
    const navigate = useNavigate();

    const handleLogout = () => {
        audioManager.play('click');
        logout();
        navigate('/login');
    };

    const handleNavigate = (path) => {
        audioManager.play('click');
        navigate(path);
    };

    const handleSoundToggle = () => {
        audioManager.play('click');
        toggleSound();
    };

    return (
        <header className="bg-white/10 backdrop-blur-md shadow-lg">
            <div className="max-w-7xl mx-auto px-3 py-2">
                <div className="flex justify-between items-center">
                    <h1
                        onClick={() => handleNavigate('/dashboard')}
                        className="text-lg md:text-2xl font-bold text-white cursor-pointer hover:scale-105 transition-transform"
                    >
                        🔧🧬 Chrome Rebellion
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-white font-semibold">
                            <span>${user?.balance?.toFixed(2)}</span>
                            <span className="text-yellow-300">⚡ {user?.freeSpins || 0}</span>
                        </div>

                        <button
                            onClick={handleSoundToggle}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                            title={soundEnabled ? 'Mute' : 'Unmute'}
                        >
                            <span className="text-2xl">{soundEnabled ? '🔊' : '🔇'}</span>
                        </button>

                        <button
                            onClick={() => handleNavigate('/profile')}
                            className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="hidden md:inline text-white font-semibold">
                                {user?.username}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile balance */}
                <div className="md:hidden flex justify-center gap-4 mt-3 text-white font-semibold">
                    <span>${user?.balance?.toFixed(2)}</span>
                    <span className="text-yellow-300">⚡ {user?.freeSpins || 0}</span>
                </div>
            </div>
        </header>
  );
};

export default Header;