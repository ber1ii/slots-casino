import { createContext, useContext, useState, useEffect } from "react";
import audioManager from "../utils/audioManager";

const AudioContext = createContext();

export const useAudio = () => {
    const context = useContext(AudioContext);
    if(!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider = ({ children }) => {
    const [soundEnabled, setSoundEnabled] = useState(true);

    const toggleSound = () => {
        const newState = audioManager.toggle();
        setSoundEnabled(newState);
        return newState;
    };

    const playSound = (soundName) => {
        audioManager.play(soundName);
    };

    return (
        <AudioContext.Provider value={{ soundEnabled, toggleSound, playSound }}>
            {children}
        </AudioContext.Provider>
    );
};