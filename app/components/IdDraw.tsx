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
        prizes
    } = useLuckyDrawStore();

    const { playClick, playWin } = useSound();

    // 5 slots state
    const [slots, setSlots] = useState<string[]>(['?', '?', '?', '?', '?']);
    // Track which slot is currently "locked"
    const [lockedCount, setLockedCount] = useState(0);

    const animationRef = useRef<number | null>(null);
    const lastClickTimeRef = useRef(0);

    const winner = lastWinners.length > 0
        ? participants.find(p => p.id === lastWinners[0])
        : null;

    // The target ID to reveal
    const targetId = useMemo(() => {
        return winner
            ? winner.employeeId.trim().slice(0, 5).toUpperCase().padEnd(5, '?')
            : '?????';
    }, [winner]);

    // Current Prize Info
    const currentPrize = prizes.find(p => p.id === currentPrizeId);

    // Compute Character Pools for each position based on ELIGIBLE participants
    // This ensures we only show characters that actually exist in that position for the remaining pool.
    const charPools = useMemo(() => {
        const eligible = participants.filter(p => !p.isWinner && !p.disqualified);
        // If no eligible (or only winner left), fallback to default to avoid empty pools
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

        // Fill empty pools with defaults if something weird happens
        return pools.map((p) => {
            // If pool is valid but too small for animation (e.g. only 1 char),
            // we add standard chars to force visual spinning. 
            // We try to guess if it's digit or letter based on what we have.
            if (p.length <= 1) {
                const sample = p[0] || '0';
                const isDigit = /\d/.test(sample);
                const extras = isDigit ? '0123456789'.split('') : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                // Combine unique
                return Array.from(new Set([...p, ...extras]));
            }
            return p;
        });
    }, [participants]);


    // Animation Loop
    useEffect(() => {
        // We run the animation loop if we are drawing OR decelerating
        // AND we haven't locked all 5 yet (or rather, until completeDraw is called)
        const shouldAnimate = isDrawing || isDecelerating;

        if (shouldAnimate) {
            const animate = () => {
                setSlots(prev => {
                    const newSlots = [...prev];
                    const now = Date.now();
                    let shouldPlaySound = false;

                    // Update ONLY unrevealed slots
                    for (let i = 0; i < 5; i++) {
                        if (i >= lockedCount) {
                            // Pick random from pool[i]
                            const pool = charPools[i];
                            newSlots[i] = pool[Math.floor(Math.random() * pool.length)];
                            shouldPlaySound = true;
                        } else if (winner) {
                            // Ensure locked slots show the winner's char
                            // (This corrects any race conditions where a frame might have slipped)
                            newSlots[i] = targetId[i];
                        }
                    }

                    // Throttle click sound
                    if (shouldPlaySound && now - lastClickTimeRef.current > 100) {
                        playClick();
                        lastClickTimeRef.current = now;
                    }

                    return newSlots;
                });

                animationRef.current = requestAnimationFrame(animate);
            };

            animationRef.current = requestAnimationFrame(animate);
        } else {
            // Not drawing/decelerating -> Stop animation
            if (animationRef.current) cancelAnimationFrame(animationRef.current);

            // If we have a winner and are done, ensure correct display
            if (winner) {
                setSlots(targetId.split(''));
            }
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isDrawing, isDecelerating, lockedCount, charPools, winner, targetId, playClick]);


    // Deceleration Logic (Reveal Timer)
    useEffect(() => {
        if (isDecelerating && winner) {
            // Start the reveal sequence
            // lockedCount starts at 0.

            let count = 0;
            setLockedCount(0); // Reset at start of deceleration

            const interval = setInterval(() => {
                count++;
                setLockedCount(count);
                playClick(); // Extra click for lock feeling

                if (count >= 5) {
                    clearInterval(interval);

                    // Delay the Win sound and Result popup by 1 second
                    setTimeout(() => {
                        playWin();
                        completeDraw();
                    }, 1000);
                }
            }, 1000); // 1 second per digit

            return () => clearInterval(interval);
        } else if (isDrawing && !isDecelerating) {
            // Just started drawing (spinning)
            setLockedCount(0);
        }
    }, [isDecelerating, winner, completeDraw, playWin, playClick, isDrawing]);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-12">
            {/* Prize Header */}
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-700 drop-shadow-sm">
                    {currentPrize ? `🏆 ${currentPrize.name}` : '準備抽獎'}
                </h2>
                {currentPrize && (
                    <div className="text-gray-500 font-mono text-xl">
                        剩餘名額: {currentPrize.count - currentPrize.winners.length}
                    </div>
                )}
            </div>

            {/* Slots Container */}
            <div className="flex gap-4 p-8 bg-white/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30">
                {slots.map((char, i) => (
                    <div
                        key={i}
                        className="relative w-24 h-36 bg-gradient-to-b from-white to-gray-100 rounded-xl flex items-center justify-center shadow-inner border-2 border-sakura-pink overflow-hidden"
                    >
                        {/* Digit */}
                        <motion.div
                            key={i}
                            className={`text-6xl font-black font-mono ${i < lockedCount ? 'text-sakura-dark' : 'text-gray-400'
                                }`}
                        >
                            {char}
                        </motion.div>

                        {/* Locked Indicator */}
                        {i < lockedCount && (
                            <motion.div
                                initial={{ opacity: 0, scale: 1.2 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute inset-0 border-4 border-sakura-pink/50 rounded-xl shadow-[inset_0_0_20px_rgba(255,183,197,0.5)]"
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Status / Winner Name */}
            <div className="h-24 flex items-center justify-center">
                {!isDrawing && winner && lockedCount === 5 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="text-2xl text-white font-bold mb-2">恭喜中獎！</div>
                        <div className="text-5xl font-black text-yellow-300 drop-shadow-lg">
                            {winner.name} <span className="text-2xl opacity-80">({winner.department})</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Action Button Removed - Using Global Button */}
        </div>
    );
}
