import Header from "../components/Header";
import SlotGame from "../components/game/SlotGame";
import { useEffect } from "react";
import audioManager from "../utils/audioManager";

const Game = () => {
  
  useEffect(() => {
    // Only audio logic remains here
    audioManager.playAmbient();
    return () => {
      audioManager.stopAmbient();
    };
  }, []);

  return (
    // We just render the content now. The Background handles the rest.
    <div className="relative z-10 isolate">
      <Header />
      <div className="max-w-7xl mx-auto p-4 md:p-8 mt-4">
        <SlotGame />
      </div>
    </div>
  );
};

export default Game;