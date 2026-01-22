'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion } from 'framer-motion';
import { useSound } from '../context/SoundContext';

const DEFAULT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function IdDraw() {
    const {
        participants,
        isDrawing,
        isDecelerating,
        lastWinners,
        completeDraw,
        currentPrizeId,
        prizes,
        idDrawCount,
        setIdDrawCount
    } = useLuckyDrawStore();

    const { playClick, playWin } = useSound();

    // Current Prize Info
    const currentPrize = prizes.find(p => p.id === currentPrizeId);

    // Calculate dynamic limits
    const remainingCount = currentPrize ? (currentPrize.count - currentPrize.winners.length) : 0;
    const eligibleCount = participants.filter(p => !p.isWinner && !p.disqualified).length;
    // Cap manual selection at min(4, remaining, eligible)
    const maxSelectable = Math.max(1, Math.min(4, remainingCount, eligibleCount));

    // Ensure valid idDrawCount when constraints change
    useEffect(() => {
        if (idDrawCount > maxSelectable) {
            setIdDrawCount(maxSelectable);
        }
    }, [maxSelectable, idDrawCount, setIdDrawCount]);

    // Calculate how many rows we need to render
    const targetRowCount = useMemo(() => {
        if (!currentPrize) return 1;

        // If we are showing results, use the actual winner count
        if (lastWinners.length > 0) return lastWinners.length;

        // Otherwise use the selected count (controlled by UI)
        return Math.max(1, Math.min(idDrawCount, remainingCount));
    }, [currentPrize, idDrawCount, remainingCount, lastWinners.length]);

    // State for multiple rows: grid of chars
    const [rows, setRows] = useState<string[][]>([]);
    // Locked count for each row (0-5)
    // We use a single number if they sync, but let's use array for independence
    const [lockedCounts, setLockedCounts] = useState<number[]>([]);

    const animationRef = useRef<number | null>(null);
    const lastClickTimeRef = useRef(0);

    // Initialize rows when targetCount changes AND we are not mid-animation
    // Actually, we should sync rows state validation
    useEffect(() => {
        setRows(prev => {
            if (prev.length === targetRowCount) return prev;
            // Resize logic
            const newRows = Array(targetRowCount).fill(null).map((_, i) => prev[i] || ['?', '?', '?', '?', '?']);
            return newRows;
        });
        setLockedCounts(prev => {
            if (prev.length === targetRowCount) return prev;
            return Array(targetRowCount).fill(0); // Reset locks on resize
        });
    }, [targetRowCount]);


    // Identify winners for each row
    const rowTargets = useMemo(() => {
        if (lastWinners.length === 0) return Array(targetRowCount).fill(null);

        return lastWinners.map(id => {
            const p = participants.find(x => x.id === id);
            return p ? p.employeeId.trim().slice(0, 5).toUpperCase().padEnd(5, '?') : '?????';
        });
    }, [lastWinners, participants, targetRowCount]);

    // Compute Character Pools (same as before)
    const charPools = useMemo(() => {
        const eligible = participants.filter(p => !p.isWinner && !p.disqualified);
        const pool = eligible.length > 0 ? eligible : participants;
        const pools: string[][] = [[], [], [], [], []];

        pool.forEach(p => {
            const idState = p.employeeId.trim().toUpperCase().padEnd(5, '?');
            for (let i = 0; i < 5; i++) {
                const char = idState[i];
                if (char && !pools[i].includes(char)) {
                    pools[i].push(char);
                }
            }
        });

        // Fill empty pools with defaults
        return pools.map((p) => {
            if (p.length <= 1) {
                const sample = p[0] || '0';
                const isDigit = /\d/.test(sample);
                const extras = isDigit ? '0123456789'.split('') : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                return Array.from(new Set([...p, ...extras]));
            }
            return p;
        });
    }, [participants]);


    // Animation Loop
    useEffect(() => {
        const shouldAnimate = isDrawing || isDecelerating;

        if (shouldAnimate) {
            const animate = () => {
                setRows(prevRows => {
                    // Safety check
                    if (prevRows.length !== targetRowCount) return prevRows;

                    const newRows = prevRows.map(r => [...r]);
                    const now = Date.now();
                    let shouldPlaySound = false;

                    // Update each row
                    for (let r = 0; r < targetRowCount; r++) {
                        const currentRow = newRows[r];
                        const lockedCount = lockedCounts[r] || 0;
                        const target = rowTargets[r]; // String or null

                        for (let i = 0; i < 5; i++) {
                            if (i >= lockedCount) {
                                // Random Spin
                                const pool = charPools[i];
                                currentRow[i] = pool[Math.floor(Math.random() * pool.length)];
                                // Only play sound occasionally to avoid chaos
                                if (Math.random() > 0.8) shouldPlaySound = true;
                            } else if (target) {
                                // Locked: ensure target char
                                currentRow[i] = target[i];
                            }
                        }
                    }

                    if (shouldPlaySound && now - lastClickTimeRef.current > 100) {
                        playClick();
                        lastClickTimeRef.current = now;
                    }

                    return newRows;
                });

                animationRef.current = requestAnimationFrame(animate);
            };

            animationRef.current = requestAnimationFrame(animate);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);

            // Final sync for winners
            if (lastWinners.length > 0) {
                setRows(rowTargets.map(t => t ? t.split('') : ['?', '?', '?', '?', '?']));
            }
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isDrawing, isDecelerating, lockedCounts, charPools, rowTargets, targetRowCount, playClick, lastWinners.length]);


    // Deceleration Logic
    useEffect(() => {
        if (isDecelerating && lastWinners.length > 0) {
            // Start reveal for ALL rows simultaneously
            let count = 0;
            setLockedCounts(Array(targetRowCount).fill(0));

            const interval = setInterval(() => {
                count++;
                setLockedCounts(Array(targetRowCount).fill(count)); // Sync reveal
                playClick();

                if (count >= 5) {
                    clearInterval(interval);
                    setTimeout(() => {
                        playWin();
                        completeDraw();
                    }, 1000);
                }
            }, 1000);

            return () => clearInterval(interval);
        } else if (isDrawing && !isDecelerating) {
            setLockedCounts(Array(targetRowCount).fill(0));
        }
    }, [isDecelerating, lastWinners.length, completeDraw, playWin, playClick, isDrawing, targetRowCount]);


    return (
        <div className="h-full w-full overflow-y-auto scrollbar-thin scrollbar-thumb-sakura-pink/50 scrollbar-track-transparent">
            <div className="min-h-full flex flex-col items-center justify-center gap-8 py-8 w-full max-w-7xl mx-auto">
                {/* Header & Toggle */}
                <div className="text-center space-y-4 shrink-0">
                    <h2 className="text-3xl font-bold text-gray-700 drop-shadow-sm">
                        {currentPrize ? `🏆 ${currentPrize.name}` : '準備抽獎'}
                    </h2>
                    {currentPrize && (
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="text-gray-500 font-mono text-xl">
                                剩餘名額: {currentPrize.count - currentPrize.winners.length}
                            </div>

                            {/* Count Selector */}
                            {!isDrawing && !isDecelerating && maxSelectable > 1 && (
                                <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl shadow-sm border border-white">
                                    <span className="text-sm font-bold text-gray-500">一次抽出:</span>
                                    <div className="flex bg-gray-200 rounded-full p-1 shadow-inner">
                                        {Array.from({ length: maxSelectable }, (_, i) => i + 1).map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setIdDrawCount(num)}
                                                className={`w-10 h-10 rounded-full text-lg font-black transition-all ${idDrawCount === num
                                                        ? 'bg-sakura-pink text-white shadow-md scale-110'
                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-300'
                                                    }`}
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
                </div>

                {/* Grid of Slots */}
                <div className="flex flex-wrap gap-6 justify-center content-center w-full max-w-5xl">
                    {rows.map((rowSlots, rIdx) => {
                        // Check if this specific row is a winner (if result is out)
                        const winnerId = lastWinners[rIdx];
                        const winner = participants.find(p => p.id === winnerId);
                        const isLocked = lockedCounts[rIdx] === 5;

                        return (
                            <div key={rIdx} className="flex flex-col items-center gap-2">
                                <div className="flex gap-2 p-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl border border-white/30 transform transition-all hover:scale-105">
                                    {rowSlots.map((char, i) => (
                                        <div
                                            key={i}
                                            className="relative w-14 h-20 md:w-16 md:h-24 bg-gradient-to-b from-white to-gray-100 rounded-lg flex items-center justify-center shadow-inner border border-sakura-pink overflow-hidden"
                                        >
                                            <motion.div
                                                key={`${char}-${i}`}
                                                className={`text-4xl md:text-5xl font-black font-mono ${i < (lockedCounts[rIdx] || 0) ? 'text-sakura-dark' : 'text-gray-400'
                                                    }`}
                                            >
                                                {char}
                                            </motion.div>
                                        </div>
                                    ))}
                                </div>

                                {/* Winner Name Label */}
                                <div className="h-8">
                                    {winner && isLocked && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-lg font-bold text-white bg-sakura-dark/80 px-4 py-1 rounded-full backdrop-blur-md shadow-lg"
                                        >
                                            {winner.name}
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
