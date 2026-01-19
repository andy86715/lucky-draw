'use client';

import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';

interface SoundContextType {
    playClick: () => void;
    playWin: () => void;
    playCongrats: () => void;
}

const SoundContext = createContext<SoundContextType>({
    playClick: () => { },
    playWin: () => { },
    playCongrats: () => { },
});

export const useSound = () => useContext(SoundContext);

export function SoundProvider({ children }: { children: React.ReactNode }) {
    // Refs to HTMLAudioElement
    const clickRef = useRef<HTMLAudioElement | null>(null);
    const winRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio objects
        clickRef.current = new Audio('/sounds/click.wav');
        winRef.current = new Audio('/sounds/win.wav');

        // Preload
        clickRef.current.load();
        winRef.current.load();
    }, []);

    const playClick = useCallback(() => {
        if (clickRef.current) {
            clickRef.current.currentTime = 0;
            clickRef.current.volume = 0.3; // Lower volume for clicks
            clickRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, []);

    const playWin = useCallback(() => {
        if (winRef.current) {
            winRef.current.currentTime = 0;
            winRef.current.volume = 0.6;
            winRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, []);

    const playCongrats = useCallback(() => {
        const congratsAudio = new Audio('/sounds/congrats.wav');
        congratsAudio.volume = 0.6;
        congratsAudio.play().catch(e => console.error("Audio play failed", e));
    }, []);

    return (
        <SoundContext.Provider value={{ playClick, playWin, playCongrats }}>
            {children}
        </SoundContext.Provider>
    );
}
