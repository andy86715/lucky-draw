'use client';

import { useEffect, useState, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion, useAnimation, useMotionValue, animate } from 'framer-motion';

import { useSound } from '../context/SoundContext';

export default function Roulette() {
    const { isDrawing, isDecelerating, participants, lastWinners, completeDraw } = useLuckyDrawStore();
    const { playClick, playWin } = useSound();
    // const controls = useAnimation(); // Removed
    const rotation = useMotionValue(0);
    const lastSectionIndex = useRef<number>(-1); // Track last section for click sound

    // Config
    const COLORS = ['#FFAEBC', '#A0E7E5', '#B4F8C8', '#FBE7C6', '#FF9AA2', '#E2F0CB'];

    // ... (data prep logic same as before)
    const eligible = participants.filter(p => !p.isWinner && !p.disqualified);
    const displayCount = Math.min(eligible.length, 24);

    const [slices, setSlices] = useState<{ id: string, name: string, color: string }[]>([]);

    useEffect(() => {
        if (!isDrawing) {
            let pool = [...eligible];
            const winnerId = lastWinners[0];
            if (winnerId) {
                const winner = participants.find(p => p.id === winnerId);
                if (winner && !pool.find(p => p.id === winnerId)) {
                    pool.unshift(winner);
                }
            }
            if (pool.length > displayCount) pool = pool.slice(0, displayCount);
            setSlices(pool.map((p, i) => ({
                id: p.id,
                name: p.name,
                color: COLORS[i % COLORS.length]
            })));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participants, lastWinners, isDrawing]);

    const sliceAngle = 360 / (slices.length || 1);

    // Track rotation for sound
    useEffect(() => {
        const unsubscribe = rotation.on("change", (latest) => {
            const normalizedRot = (latest % 360 + 360) % 360; // 0-360
            // The pointer is at 0 (top).
            // Slice index at pointer = floor((360 - Rot) / SliceAngle) % Count
            // Wait, rotation is clockwise.
            // If wheel rotates +10deg, the slice UNDER the pointer moves LEFT.
            // Pointer is fixed at top.
            // Effective angle at pointer = (0 - rotation) % 360

            // Simplified: Just detect change in (Rotation / SliceAngle) floor
            const currentSection = Math.floor(latest / sliceAngle);
            if (currentSection !== lastSectionIndex.current) {
                if (lastSectionIndex.current !== -1) {
                    playClick();
                }
                lastSectionIndex.current = currentSection;
            }
        });
        return () => unsubscribe();
    }, [rotation, sliceAngle, playClick]);


    useEffect(() => {
        let playback: any;

        if (isDrawing && !isDecelerating) {
            // Spin fast linearly
            playback = animate(rotation, rotation.get() + 360000, {
                duration: 1000,
                ease: "linear"
            });
        } else if (isDecelerating && lastWinners.length > 0 && slices.length > 0) {
            const winnerId = lastWinners[0];
            const winnerIndex = slices.findIndex(s => s.id === winnerId);

            if (winnerIndex !== -1) {
                const currentRot = rotation.get();
                // 1. Calculate where the winner slice currently IS.
                // Slice Center (Relative to 0/Right)
                const sliceCenter = winnerIndex * sliceAngle + (sliceAngle / 2);

                // 2. We want this slice center to land at 270 (Top).
                // Target Rotation: Rot + sliceCenter = 270 + k*360
                // Rot = 270 - sliceCenter ...

                // Effective target mod 360
                let targetRotationMod = (270 - sliceCenter) % 360;
                if (targetRotationMod < 0) targetRotationMod += 360;

                // 3. Find distance from current rotation to target
                const currentRotationMod = currentRot % 360;
                let distanceToTarget = targetRotationMod - currentRotationMod;

                // Ensure we always spin forward (positive distance)
                if (distanceToTarget <= 0) distanceToTarget += 360;

                // 4. Add extra spins for dramatic effect
                const extraSpins = 360 * 5; // 5 full spins
                const totalRotation = distanceToTarget + extraSpins;
                const finalTarget = currentRot + totalRotation;

                const duration = totalRotation / 200; // Constant deceleration speed factor

                playback = animate(rotation, finalTarget, {
                    duration: duration,
                    ease: "circOut", // Stronger deceleration curve
                    onComplete: () => {
                        playWin();
                        setTimeout(() => completeDraw(), 500);
                    }
                });
            } else {
                // If visual mismatch (winner not in slices), just end
                completeDraw();
            }
        }

        return () => {
            if (playback) playback.stop();
        };
    }, [isDrawing, isDecelerating, lastWinners, slices, rotation, completeDraw, sliceAngle, playWin]);

    const radius = 230; // SVG radius for 500x500 container

    const getSectorPath = (index: number, total: number) => {
        const startAngle = (index * 360) / total;
        const endAngle = ((index + 1) * 360) / total;

        // Convert to radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        const x1 = radius + radius * Math.cos(startRad);
        const y1 = radius + radius * Math.sin(startRad);
        const x2 = radius + radius * Math.cos(endRad);
        const y2 = radius + radius * Math.sin(endRad);

        return `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;
    };

    return (
        <div className="relative w-[500px] h-[500px] flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 z-20">
                <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-500 drop-shadow-md" />
            </div>

            <motion.div
                style={{ rotate: rotation }}
                className="w-full h-full rounded-full shadow-2xl overflow-hidden relative"
            >
                {slices.length > 0 ? (
                    <svg viewBox={`0 0 ${radius * 2} ${radius * 2}`} className="w-full h-full transform rotate-0">
                        {slices.map((slice, i) => (
                            <g key={slice.id}>
                                <path
                                    d={getSectorPath(i, slices.length)}
                                    fill={slice.color}
                                    stroke="white"
                                    strokeWidth="2"
                                />
                                <text
                                    x={radius + (radius * 0.85) * Math.cos(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}
                                    y={radius + (radius * 0.85) * Math.sin(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}
                                    fill="#333"
                                    fontSize={slices.length > 14 ? "16" : "24"}
                                    fontWeight="bold"
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    transform={`rotate(${((i + 0.5) * 360 / slices.length)}, ${radius + (radius * 0.85) * Math.cos(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}, ${radius + (radius * 0.85) * Math.sin(((i + 0.5) * 360 / slices.length) * Math.PI / 180)})`}
                                >
                                    {slice.name}
                                </text>
                            </g>
                        ))}
                    </svg>
                ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-full text-gray-400 font-bold">
                        No Participants
                    </div>
                )}
            </motion.div>

            {/* Center Boss */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full shadow-inner border-4 border-gray-100 flex items-center justify-center font-bold text-sakura-pink text-xl">
                LUCKY
            </div>
        </div>
    );
}
