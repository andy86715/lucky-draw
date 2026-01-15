'use client';

import { useEffect, useState } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function BatchDraw() {
    const { isDrawing, isDecelerating, participants, currentPrizeId, prizes, lastWinners, completeDraw } = useLuckyDrawStore();
    const currentPrize = prizes.find(p => p.id === currentPrizeId);

    // Show a grid of random names/placeholders.
    // If not drawing, we show "Ready for Batch Draw"
    // If drawing, we cycle names in a grid.

    // For Batch, if isDecelerating, we show the WINNERS statically.
    // If IS drawing, we shuffle.
    // If !isDrawing && length > 0, we show winners (Result state).

    const [displayNames, setDisplayNames] = useState<string[]>([]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        let timeout: NodeJS.Timeout;

        // Mode 1: Fast Shuffle
        if (isDrawing && !isDecelerating) {
            interval = setInterval(() => {
                const sampleCount = currentPrize ? (currentPrize.count - currentPrize.winners.length) : 9;
                const count = Math.min(sampleCount > 0 ? sampleCount : 9, participants.length || 1);
                const randoms = Array.from({ length: count }).map(() =>
                    participants[Math.floor(Math.random() * participants.length)]?.name || '...'
                );
                setDisplayNames(randoms);
            }, 50);
        }
        // Mode 2: Deceleration
        else if (isDecelerating) {
            let currentDelay = 50;
            const maxDelay = 600;

            const runDeceleration = () => {
                if (currentDelay < maxDelay) {
                    // Use lastWinners.length as the target count, because we are revealing THEM
                    const count = lastWinners.length > 0 ? lastWinners.length : 1;

                    const randoms = Array.from({ length: count }).map(() =>
                        participants[Math.floor(Math.random() * participants.length)]?.name || '...'
                    );
                    setDisplayNames(randoms);

                    currentDelay *= 1.2; // Slow down
                    timeout = setTimeout(runDeceleration, currentDelay);
                } else {
                    // STOP
                    const winnerNames = lastWinners.map(id => participants.find(p => p.id === id)?.name || 'Unknown');
                    setDisplayNames(winnerNames);

                    timeout = setTimeout(() => {
                        completeDraw();
                    }, 500); // 0.5s pause before popup
                }
            };
            runDeceleration();

        } else if (lastWinners.length > 0) {
            const winnerNames = lastWinners.map(id => participants.find(p => p.id === id)?.name || 'Unknown');
            setDisplayNames(winnerNames);
        } else {
            setDisplayNames([]);
        }
        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [isDrawing, isDecelerating, participants, lastWinners, completeDraw, currentPrize]);

    return (
        <div className="relative flex justify-center items-center py-10 w-full">
            {/* Machine Body */}
            <div className="bg-gradient-to-br from-sakura-pink to-sakura-dark p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-[12px] border-r-[12px] border-sakura-dark/50 relative max-w-5xl w-full">

                {/* Decorative Top Lights */}
                <div className="flex justify-center gap-4 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <div key={i} className="w-4 h-4 rounded-full bg-blue-300 shadow-[0_0_10px_#93c5fd] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                    <span className="bg-black/20 text-white px-6 py-1 rounded-full font-black tracking-[0.2em] text-sm backdrop-blur-sm">MULTIPLAYER SLOT</span>
                </div>

                {/* Screen Bezel */}
                <div className="bg-gradient-to-b from-yellow-100 to-yellow-500 p-4 rounded-[2rem] shadow-inner relative">
                    {/* Inner Screen */}
                    <div className="bg-white rounded-[1.5rem] min-h-[400px] flex items-center justify-center overflow-hidden shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] border-4 border-gray-200 relative p-6">

                        {/* Glass Reflection primitive */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10" />

                        {/* Scrolling Grid */}
                        <div className="grid grid-cols-3 gap-4 w-full h-full relative z-0">
                            <AnimatePresence mode="popLayout">
                                {(isDrawing || lastWinners.length > 0) ? displayNames.map((name, i) => (
                                    <motion.div
                                        key={`${i}-${name}`}
                                        initial={{ opacity: 0, scale: 0.5, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                                        transition={{ duration: 0.2 }}
                                        className="bg-white/90 border-2 border-sakura-pink/30 rounded-xl flex items-center justify-center shadow-md aspect-[3/1] overflow-hidden"
                                    >
                                        <span className="text-xl md:text-2xl font-black text-sakura-dark truncate px-2">{name}</span>
                                    </motion.div>
                                )) : (
                                    // Placeholder State
                                    <div className="col-span-3 flex flex-col items-center justify-center text-gray-400 font-bold space-y-4 h-full">
                                        <div className="text-6xl animate-bounce">🎰</div>
                                        <div className="text-2xl">Ready to Draw Multiple Winners</div>
                                        <div className="text-sm bg-sakura-light px-4 py-2 rounded-full text-sakura-dark/70">
                                            Current Batch Size: {currentPrize ? (currentPrize.count - currentPrize.winners.length) : 0}
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Bottom Base */}
                <div className="mt-8 flex justify-between items-center px-4 opacity-50">
                    <div className="w-full h-2 bg-black/10 rounded-full" />
                </div>
            </div>

            {/* Decorative Lever (Left side for variety?) No, keep consistent right side but maybe larger */}
            <div className="absolute right-[-40px] top-[150px] w-8 h-48 bg-gray-300 rounded-r-2xl border-l border-gray-400 shadow-xl flex flex-col items-center pointer-events-none hidden md:flex">
                <div className="w-4 h-full bg-gray-200" />
                <div className="absolute -top-12 w-16 h-16 bg-blue-500 rounded-full shadow-lg border-b-4 border-blue-700" />
            </div>
        </div>
    );
}
