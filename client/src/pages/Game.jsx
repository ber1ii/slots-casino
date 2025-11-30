import Header from "../components/Header";
import SlotGame from "../components/game/SlotGame";
import { useEffect } from "react";
import audioManager from "../utils/audioManager";
import { useAuth } from "../context/AuthContext";

const Game = () => {
  const { loading } = useAuth();

  useEffect(() => {
    audioManager.playAmbient();
    return () => {
      audioManager.stopMusic();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        <div className="mt-4 text-purple-400 font-mono text-xs tracking-[0.3em] animate-pulse">
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full h-full">
      <Header />
      <div className="w-full h-full flex flex-col items-center">
        <SlotGame />
      </div>
    </div>
  );
};

export default Game;
