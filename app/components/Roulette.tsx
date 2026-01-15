'use client';

import { useEffect, useState } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion, useAnimation, useMotionValue, animate } from 'framer-motion';

export default function Roulette() {
    const { isDrawing, isDecelerating, participants, lastWinners, completeDraw } = useLuckyDrawStore();
    // const controls = useAnimation(); // Removed
    const rotation = useMotionValue(0);

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
                // Avoid modulus here to keep the total rotation increasing monotonically for simple physics logic
                // But we need to find the next target angle that aligns.

                // Target Angle relative to wheel start (0) needs to be at -90 (270)
                // Slice Center = winnerIndex * sliceAngle + (sliceAngle / 2)

                // We want: (FinalRot % 360) + SliceCenter = 270 (or -90)
                // (or + k*360)

                // Let's normalize sliceCenter to 0-360
                const sliceCenter = winnerIndex * sliceAngle + (sliceAngle / 2);

                // Required wheel rotation (mod 360) to place sliceCenter at 270:
                // Rot + SliceCenter = 270
                // Rot = 270 - SliceCenter

                let targetMod = (270 - sliceCenter) % 360;
                if (targetMod < 0) targetMod += 360;

                // Helper to get next target greater than current
                const currentMod = currentRot % 360;
                // Dist to next target
                let dist = targetMod - currentMod;
                if (dist <= 0) dist += 360;

                // Add 3 full spins for braking
                const totalDist = dist + (360 * 3);
                const finalTarget = currentRot + totalDist;

                // Dynamic Duration Calculation
                // We want initial velocity (v0) to match the spin speed (360 deg/s).
                // For easeOut (Quadratic/Cubic), Average Velocity = v0 / 2.
                // So Average Velocity should be 180 deg/s.
                // Duration = Distance / Average Velocity = totalDist / 180.
                const duration = totalDist / 180;

                playback = animate(rotation, finalTarget, {
                    duration: duration,
                    ease: "easeOut", // Standard easeOut (cubic) starts at 2*avg_vel, giving us ~360 deg/s start
                    onComplete: () => {
                        setTimeout(() => completeDraw(), 500);
                    }
                });
            } else {
                completeDraw();
            }
        }

        return () => {
            if (playback) playback.stop();
        };
    }, [isDrawing, isDecelerating, lastWinners, slices, rotation, completeDraw, sliceAngle]);

    const radius = 180; // SVG radius

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
        <div className="relative w-[400px] h-[400px] flex items-center justify-center">
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
                                    x={radius + (radius * 0.7) * Math.cos(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}
                                    y={radius + (radius * 0.7) * Math.sin(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}
                                    fill="#333"
                                    fontSize="14"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                    transform={`rotate(${((i + 0.5) * 360 / slices.length) + 90}, ${radius + (radius * 0.7) * Math.cos(((i + 0.5) * 360 / slices.length) * Math.PI / 180)}, ${radius + (radius * 0.7) * Math.sin(((i + 0.5) * 360 / slices.length) * Math.PI / 180)})`}
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-inner border-4 border-gray-100 flex items-center justify-center font-bold text-sakura-pink">
                LUCKY
            </div>
        </div>
    );
}
