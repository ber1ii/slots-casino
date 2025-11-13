import Header from '../components/Header';
import SlotGame from '../components/game/SlotGame';

const Game = () => {
  return (
    <div className="cyberpunk-bg min-h-screen relative">
      {/* Starry background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(200)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <Header />
        <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4">
          <SlotGame />
        </div>
      </div>
    </div>
  );
};

export default Game;