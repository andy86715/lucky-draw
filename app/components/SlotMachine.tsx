'use client';

import { useEffect, useState, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useSound } from '../context/SoundContext';

export default function SlotMachine() {
    const {
        isDrawing,
        isDecelerating,
        participants,
        completeDraw,
        lastWinners,
        currentPrizeId,
        prizes,
        slotDrawCount,
        setSlotDrawCount
    } = useLuckyDrawStore();

    const { playClick, playWin } = useSound();

    const currentPrize = prizes.find(p => p.id === currentPrizeId);

    // Limits
    const remainingCount = currentPrize ? (currentPrize.count - currentPrize.winners.length) : 0;
    const eligibleCount = participants.filter(p => !p.isWinner && !p.disqualified).length;
    // Cap manual selection at min(9, remaining, eligible)
    const maxSelectable = Math.max(1, Math.min(9, remainingCount, eligibleCount));

    // Validations
    useEffect(() => {
        if (slotDrawCount > maxSelectable) {
            setSlotDrawCount(maxSelectable);
        }
    }, [maxSelectable, slotDrawCount, setSlotDrawCount]);

    const [displayNames, setDisplayNames] = useState<string[]>([]);

    // Single Mode State
    const [singleName, setSingleName] = useState("READY");

    // Unified Animation Logic
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        // Determine what we are animating towards
        // If results exist, use them. If not, use selected count.
        const targetCount = lastWinners.length > 0 ? lastWinners.length : slotDrawCount;

        // Mode 1: Fast Rolling (Drawing)
        if (isDrawing && !isDecelerating) {
            const animate = () => {
                // If single, just random one name
                // If multi, random array of names
                if (targetCount === 1) {
                    setSingleName(participants[Math.floor(Math.random() * participants.length)]?.name || '...');
                } else {
                    const randoms = Array.from({ length: targetCount }).map(() =>
                        participants[Math.floor(Math.random() * participants.length)]?.name || '...'
                    );
                    setDisplayNames(randoms);
                }

                playClick();
                timeoutId = setTimeout(animate, 50);
            };
            animate();
        }
        // Mode 2: Decelerating
        else if (isDecelerating) {
            let currentDelay = 50;
            const maxDelay = 600;

            const slowDown = () => {
                if (currentDelay < maxDelay) {
                    if (targetCount === 1) {
                        setSingleName(participants[Math.floor(Math.random() * participants.length)]?.name || '...');
                    } else {
                        const randoms = Array.from({ length: targetCount }).map(() =>
                            participants[Math.floor(Math.random() * participants.length)]?.name || '...'
                        );
                        setDisplayNames(randoms);
                    }

                    playClick();
                    currentDelay *= 1.15;
                    timeoutId = setTimeout(slowDown, currentDelay);
                } else {
                    // STOP & REVEAL
                    if (lastWinners.length > 0) {
                        if (lastWinners.length === 1) {
                            const w = participants.find(p => p.id === lastWinners[0]);
                            setSingleName(w ? w.name : 'Unknown');
                        } else {
                            const winnerNames = lastWinners.map(id => participants.find(p => p.id === id)?.name || 'Unknown');
                            setDisplayNames(winnerNames);
                        }
                        playWin();
                    }

                    timeoutId = setTimeout(() => {
                        completeDraw();
                    }, 1000);
                }
            };
            slowDown();
        }
        // Mode 3: Idle / Result
        else {
            if (lastWinners.length > 0) {
                // Showing results
                if (lastWinners.length === 1) {
                    const w = participants.find(p => p.id === lastWinners[0]);
                    setSingleName(w ? w.name : 'Unknown');
                } else {
                    const winnerNames = lastWinners.map(id => participants.find(p => p.id === id)?.name || 'Unknown');
                    setDisplayNames(winnerNames);
                }
            } else {
                setSingleName("READY");
                setDisplayNames([]);
            }
        }

        return () => clearTimeout(timeoutId);
    }, [isDrawing, isDecelerating, participants, completeDraw, playClick, playWin, slotDrawCount, lastWinners]);


    // Font size helper for Single Mode
    const getFontSizeClass = (name: string) => {
        const len = name.length;
        if (len <= 3) return "text-[5rem] md:text-[7rem]";
        if (len === 4) return "text-[4rem] md:text-[6rem]";
        return "text-[3rem] md:text-[4.5rem]";
    };

    // Determine view logic
    const activeCount =
        (lastWinners.length > 0) ? lastWinners.length :
            (isDrawing || isDecelerating) ? slotDrawCount :
                slotDrawCount;

    const showGrid = activeCount > 1;

    return (
        <div className="relative flex flex-col items-center gap-6 pt-16 pb-6 w-full">

            {/* Control Pod (Count Selector) */}
            {!isDrawing && !isDecelerating && currentPrize && (
                <div className="flex flex-wrap items-center justify-center gap-4 mb-2 animate-fade-in-down">
                    {/* Remaining Count */}
                    <div className="text-gray-500 font-mono text-xl font-bold bg-white/80 px-4 py-2 rounded-2xl shadow-sm backdrop-blur-sm border border-white h-[58px] flex items-center">
                        剩餘名額: {remainingCount}
                    </div>

                    {/* Selector */}
                    {maxSelectable > 1 && (
                        <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl shadow-sm border border-white backdrop-blur-md h-[58px]">
                            <span className="text-sm font-bold text-gray-500">一次抽出:</span>
                            <div className="flex bg-gray-200 rounded-full p-1 shadow-inner overflow-x-auto max-w-[80vw]">
                                {Array.from({ length: maxSelectable }, (_, i) => i + 1).map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setSlotDrawCount(num)}
                                        className={clsx(
                                            "w-10 h-10 rounded-full text-lg font-black transition-all shrink-0",
                                            slotDrawCount === num
                                                ? "bg-sakura-pink text-white shadow-md scale-110"
                                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-300"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <span className="text-sm font-bold text-gray-500">人</span>
                        </div>
                    )}
                </div>
            )}

            {/* Machine Body */}
            <div className="bg-gradient-to-br from-sakura-pink to-sakura-dark p-6 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-b-[12px] border-r-[12px] border-sakura-dark/50 relative max-w-4xl w-full transition-all duration-500">

                {/* Decorative Top Lights */}
                <div className="flex justify-center gap-4 mb-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-4 h-4 rounded-full bg-yellow-300 shadow-[0_0_10px_#fde047] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                    <span className="bg-black/20 text-white px-6 py-1 rounded-full font-black tracking-[0.2em] text-sm backdrop-blur-sm">
                        {showGrid ? 'MULTI-SLOT' : 'LUCKY SLOT'}
                    </span>
                </div>

                {/* Screen Bezel */}
                <div className="bg-gradient-to-b from-yellow-100 to-yellow-500 p-4 rounded-[2rem] shadow-inner relative transition-all duration-500">
                    {/* Inner Screen */}
                    <div className="bg-white rounded-[1.5rem] min-h-[300px] flex items-center justify-center overflow-hidden shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)] border-4 border-gray-200 relative p-6 transition-all duration-500">

                        {/* Glass Reflection primitive */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10" />

                        {/* Content */}
                        <div className="w-full relative z-0 flex items-center justify-center min-h-[250px]">
                            {showGrid ? (
                                // GRID VIEW (Adapted from BatchDraw)
                                <div className="grid grid-cols-3 gap-4 w-full">
                                    <AnimatePresence mode="popLayout">
                                        {(isDrawing || lastWinners.length > 0) ? displayNames.map((name, i) => (
                                            <motion.div
                                                key={`${i}-${name}`} // Simple key
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="bg-white/90 border-2 border-sakura-pink/30 rounded-xl flex items-center justify-center shadow-sm aspect-[2.5/1] overflow-hidden"
                                            >
                                                <span className="text-lg md:text-xl font-black text-sakura-dark truncate px-2">{name}</span>
                                            </motion.div>
                                        )) : (
                                            <div className="col-span-3 flex flex-col items-center justify-center text-gray-400 font-bold opacity-50 space-y-2">
                                                <div className="text-5xl">🎰</div>
                                                <div>準備抽出 {slotDrawCount} 位</div>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                // SINGLE VIEW
                                <div className="text-center w-full">
                                    <motion.div
                                        className={clsx(
                                            "font-black text-sakura-dark leading-tight whitespace-nowrap px-4 transition-all duration-100",
                                            getFontSizeClass(singleName)
                                        )}
                                    >
                                        {singleName}
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Base */}
                <div className="mt-8 flex justify-between items-center px-4 opacity-50">
                    <div className="w-full h-2 bg-black/10 rounded-full" />
                </div>
            </div>

            {/* Decorative Lever */}
            <div className="absolute right-[-20px] top-[200px] w-8 h-64 bg-gray-300 rounded-r-2xl border-l border-gray-400 shadow-xl flex flex-col items-center pointer-events-none hidden md:flex">
                <div className="w-4 h-full bg-gray-200" />
                <div className="absolute -top-12 w-16 h-16 bg-red-500 rounded-full shadow-lg border-b-4 border-red-700" />
            </div>
        </div>
    );
}
