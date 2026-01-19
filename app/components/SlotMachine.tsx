'use client';

import { useEffect, useState, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useSound } from '../context/SoundContext';

export default function SlotMachine() {
    const { isDrawing, isDecelerating, participants, completeDraw } = useLuckyDrawStore();
    const { playClick, playWin } = useSound();
    const [currentName, setCurrentName] = useState("READY");
    // const frameId = useRef<number | null>(null); // Unused

    // Reset to READY on mount/unmount to ensure clean state if returning from another tab
    useEffect(() => {
        return () => setCurrentName("READY");
    }, []);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // Mode 1: Fast Rolling (Drawing)
        if (isDrawing && !isDecelerating && participants.length > 0) {
            const animate = () => {
                const randomName = participants[Math.floor(Math.random() * participants.length)].name;
                setCurrentName(randomName);
                playClick(); // Sound effect
                timeoutId = setTimeout(animate, 50); // Fast roll
            };
            animate();
        }
        // Mode 2: Decelerating (Slowing Down)
        else if (isDecelerating && participants.length > 0) {
            let currentDelay = 50;
            const maxDelay = 600; // Stop when delay hits this

            // Winners logic
            const winnerId = useLuckyDrawStore.getState().lastWinners[0];
            const winner = participants.find(p => p.id === winnerId);

            const slowDown = () => {
                if (currentDelay < maxDelay) {
                    // Keep showing random names
                    const randomName = participants[Math.floor(Math.random() * participants.length)].name;
                    setCurrentName(randomName);
                    playClick(); // Sound effect

                    // Slow down
                    currentDelay *= 1.15; // 15% slower each tick
                    timeoutId = setTimeout(slowDown, currentDelay);
                } else {
                    // STOP
                    if (winner) {
                        setCurrentName(winner.name);
                        playWin(); // Winner sound
                    }

                    // Small pause before popup (like Roulette)
                    timeoutId = setTimeout(() => {
                        completeDraw();
                    }, 500);
                }
            };
            slowDown();
        }
        // Mode 3: Idle
        else {
            if (!isDrawing && !isDecelerating) {
                // setCurrentName("READY"); // Optional: reset or keep winner
            }
        }

        return () => clearTimeout(timeoutId);
    }, [isDrawing, isDecelerating, participants, completeDraw, playClick, playWin]);

    // Helper to determine font size class based on name length
    const getFontSizeClass = (name: string) => {
        const len = name.length;
        if (len <= 3) return "text-[5rem] md:text-[7rem]";
        if (len === 4) return "text-[4rem] md:text-[6rem]";
        return "text-[3rem] md:text-[4.5rem]";
    };

    return (
        <div className="relative flex justify-center items-center py-10 w-full">
            {/* Machine Body */}
            <div className="bg-gradient-to-br from-sakura-pink to-sakura-dark p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-[12px] border-r-[12px] border-sakura-dark/50 relative max-w-2xl w-full">

                {/* Decorative Top Lights */}
                <div className="flex justify-center gap-4 mb-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-4 h-4 rounded-full bg-yellow-300 shadow-[0_0_10px_#fde047] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                    <span className="bg-black/20 text-white px-6 py-1 rounded-full font-black tracking-[0.2em] text-sm backdrop-blur-sm">LUCKY SLOT</span>
                </div>

                {/* Screen Bezel */}
                <div className="bg-gradient-to-b from-yellow-100 to-yellow-500 p-4 rounded-[2rem] shadow-inner relative">
                    {/* Inner Screen */}
                    <div className="bg-white rounded-[1.5rem] h-[300px] flex items-center justify-center overflow-hidden shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] border-4 border-gray-200 relative">

                        {/* Glass Reflection primitive */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10" />

                        {/* Scrolling Text */}
                        <div className="text-center overflow-hidden z-0 w-full">
                            <motion.div
                                // Removed animate={scale} to stop flashing as requested
                                className={clsx(
                                    "font-black text-sakura-dark leading-tight whitespace-nowrap px-4 transition-all duration-100",
                                    getFontSizeClass(currentName)
                                )}
                            >
                                {currentName}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Bottom Base */}
                <div className="mt-8 flex justify-between items-center px-4 opacity-50">
                    <div className="w-full h-2 bg-black/10 rounded-full" />
                </div>
            </div>

            {/* Decorative Lever (Optional visual quirk) */}
            <div className="absolute right-[-40px] top-[100px] w-8 h-64 bg-gray-300 rounded-r-2xl border-l border-gray-400 shadow-xl flex flex-col items-center pointer-events-none hidden md:flex">
                <div className="w-4 h-full bg-gray-200" />
                <div className="absolute -top-12 w-16 h-16 bg-red-500 rounded-full shadow-lg border-b-4 border-red-700" />
            </div>
        </div>
    );
}
