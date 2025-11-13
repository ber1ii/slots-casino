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

    useEffect(() => {
        // Start ambient music when component mounts
        const startAmbient = () => {
            audioManager.playAmbient();
            document.removeEventListener('click', startAmbient);
        };

        // Wait for first user interaction (browser requirement)
        document.addEventListener('click', startAmbient);

        return () => {
            document.removeEventListener('click', startAmbient);
        };
    }, []);

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