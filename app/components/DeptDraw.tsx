'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import { motion } from 'framer-motion';
import { useSound } from '../context/SoundContext';

export default function DeptDraw() {
    const {
        participants,
        isDrawing,
        isDecelerating,
        completeDraw,
        currentPrizeId,
        prizes,
    } = useLuckyDrawStore();

    const { playClick, playWin } = useSound();

    // Stages: 
    // 0: Ready (Pick Dept)
    // 1: Spinning Dept
    // 2: Dept Selected (Show Candidates)
    // 3: Spinning Name
    // 4: Winner
    const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);

    const [selectedDept, setSelectedDept] = useState<string | null>(null);
    const [displayDept, setDisplayDept] = useState<string>('?');
    // const [displayName, setDisplayName] = useState<string>('?'); // Removed, using highlightedId
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [winner, setWinner] = useState<any>(null);

    const animationRef = useRef<number | null>(null);
    const lastClickTimeRef = useRef(0);

    // Get weighted departments (one entry per eligible participant)
    // This ensures that departments with more people have a higher chance of being picked.
    const availableDepts = useMemo(() => {
        const eligible = participants.filter(p => !p.isWinner && !p.disqualified);
        // Map each person to their department (allowing duplicates)
        return eligible.map(p => p.department);
    }, [participants]);

    // Get candidates for the selected department
    const deptCandidates = useMemo(() => {
        if (!selectedDept) return [];
        return participants.filter(p =>
            p.department === selectedDept &&
            (!p.isWinner || (winner && p.id === winner.id)) && // Allow the current winner to stay (visible)
            !p.disqualified
        );
    }, [selectedDept, participants, winner]);

    // --- EFFECT: Handle Global Start/Stop ---
    useEffect(() => {
        // Global Start Handler
        if (isDrawing && !isDecelerating) {
            if (stage === 0 || stage === 4) {
                console.log('DeptDraw: Starting New Draw (Stage 1)');
                setStage(1);
                setWinner(null);
                setSelectedDept(null);
                setDisplayDept('?');
                setHighlightedId(null);
            } else if (stage === 2) {
                console.log('DeptDraw: Starting Name Draw (Stage 3)');
                setStage(3);
            }
        }
    }, [isDrawing, isDecelerating /* stage removed from dep to avoid loop? No, stage needed for logic */]);
    // Note: Reacting to `isDrawing` change.

    // Explicit debug for Stage changes
    useEffect(() => { console.log('DeptDraw: Stage changed to', stage); }, [stage]);


    // --- ANIMATION: Dept Spin (Stage 1) ---
    // Actually, handling deceleration inside a single effect that depends on `isDecelerating` is tricky
    // because it restarts the animation loop.
    // Let's use a Ref to track if we are in "stopping mode" to persist across renders if needed,
    // OR just use a single effect that monitors `isDecelerating` via a Ref.

    const isDeceleratingRef = useRef(isDecelerating);
    useEffect(() => { isDeceleratingRef.current = isDecelerating; }, [isDecelerating]);

    // Stage 1 Animation
    useEffect(() => {
        if (stage !== 1) return;

        let animationFrameId: number;
        let lastTick = 0;
        let delay = 100; // Starting delay
        let stopping = false;
        let stepsToStop = 0;
        let finalSelection: string | null = null;

        const loop = (time: number) => {
            if (time - lastTick >= delay) {
                lastTick = time;

                // If not stopping yet, check if we should start stopping
                if (!stopping && isDeceleratingRef.current) {
                    stopping = true;
                    // Decide how many more clicks before stop (e.g., 10 to 15)
                    stepsToStop = Math.floor(Math.random() * 5) + 10;

                    // Pick the result NOW
                    const final = availableDepts[Math.floor(Math.random() * availableDepts.length)];
                    finalSelection = final;
                }

                if (!stopping) {
                    // Normal Spin
                    const randomDept = availableDepts[Math.floor(Math.random() * availableDepts.length)];
                    setDisplayDept(randomDept || '無部門');
                    playClick();
                } else {
                    // Decelerating
                    if (stepsToStop > 0) {
                        stepsToStop--;
                        // Increase delay to slow down (Exponential-ish)
                        delay += 30; // 100 -> 130 -> 160 ...

                        // Show random (or maybe toggle towards final? random is fine until last)
                        // Actually, purely random is confusing if it lands on target differently.
                        // Let's just keep random until the very last frame? 
                        // Or ensure the LAST one is the target.
                        if (stepsToStop === 0) {
                            // STOP!
                            // Pick a final dept (randomly)
                            const finalDept = availableDepts[Math.floor(Math.random() * availableDepts.length)];
                            setDisplayDept(finalDept);
                            setSelectedDept(finalDept);

                            // Check if this dept has only 1 candidate
                            // Removed auto-win logic to allow visual confirmation in Stage 2

                            completeDraw();
                            setStage(2); // Go to "Dept Selected"
                            return;
                        } else {
                            const randomDept = availableDepts[Math.floor(Math.random() * availableDepts.length)];
                            setDisplayDept(randomDept || '無部門');
                            playClick();
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [stage, availableDepts, completeDraw, playClick, playWin, participants]);


    // Stage 3 Animation (Name - Grid Highlight)
    useEffect(() => {
        if (stage !== 3) return;
        if (winner) return; // Stop animation if winner is already found

        let animationFrameId: number;
        let lastTick = 0;
        let delay = 50; // Faster for names
        let stopping = false;
        let stepsToStop = 0;
        let finalWinnerObj: any = null;

        const loop = (time: number) => {
            if (time - lastTick >= delay) {
                lastTick = time;

                // Check stop signal
                if (!stopping && isDeceleratingRef.current) {
                    stopping = true;
                    console.log('DeptDraw: Stopping Name Spin...');
                    stepsToStop = Math.floor(Math.random() * 10) + 20; // More steps for names (build tension)

                    // Pick Winner
                    const candidates = deptCandidates.length > 0 ? deptCandidates : [];
                    if (candidates.length > 0) {
                        const winnerIdx = Math.floor(Math.random() * candidates.length);
                        finalWinnerObj = candidates[winnerIdx];
                        console.log('DeptDraw: Selected Winner:', finalWinnerObj.name, 'Dept:', finalWinnerObj.department);
                    }
                }

                const candidates = deptCandidates.length > 0 ? deptCandidates : [];

                if (candidates.length === 0) {
                    // Should not happen theoretically if filtered correctly
                    return;
                }

                if (!stopping) {
                    // Random Highlight
                    const randomIdx = Math.floor(Math.random() * candidates.length);
                    setHighlightedId(candidates[randomIdx].id);
                    // Click sound
                    playClick();
                } else {
                    // Decelerating
                    if (stepsToStop > 0) {
                        stepsToStop--;
                        // Slow down curve
                        delay *= 1.1; // 10% slower each tick

                        if (stepsToStop === 0) {
                            // Final Land
                            if (finalWinnerObj) {
                                console.log('DeptDraw: Landing on Winner:', finalWinnerObj.name);
                                setHighlightedId(finalWinnerObj.id);
                                setWinner(finalWinnerObj);
                                playWin();

                                // DELAY Store update to prevent re-render/effect restart during the reveal
                                setTimeout(() => {
                                    // Update Store
                                    useLuckyDrawStore.setState(state => ({
                                        participants: state.participants.map(p =>
                                            p.id === finalWinnerObj.id
                                                ? { ...p, isWinner: true, wonPrizeId: state.currentPrizeId || undefined }
                                                : p
                                        ),
                                        prizes: state.prizes.map(p =>
                                            p.id === state.currentPrizeId
                                                ? { ...p, winners: [...p.winners, finalWinnerObj.id] }
                                                : p
                                        ),
                                        lastWinners: [finalWinnerObj.id],
                                        // Don't modify isDrawing here, completeDraw will do it
                                    }));

                                    completeDraw();
                                    setStage(4);
                                }, 2000); // 2s pause showing the winner before "UI Unlock"
                                return; // Stop the loop
                            }
                        } else {
                            // Still spinning
                            const randomIdx = Math.floor(Math.random() * candidates.length);
                            setHighlightedId(candidates[randomIdx].id);
                            playClick();
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [stage, deptCandidates, completeDraw, playClick, playWin, winner]);


    // Helper to get color for department (hashing) - Optional, kept if needed
    const getDeptColor = (dept: string) => {
        let hash = 0;
        for (let i = 0; i < dept.length; i++) hash = dept.charCodeAt(i) + ((hash << 5) - hash);
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };


    return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-8 max-w-7xl mx-auto p-4">
            {/* Header */}
            <div className="text-center space-y-2 shrink-0">
                <h2 className="text-3xl font-bold text-gray-700">部門抽獎模式</h2>
                <p className="text-gray-500">
                    {stage <= 1 ? "第一階段：抽出部門" : "第二階段：抽出幸運兒"}
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 w-full items-stretch justify-center flex-1 min-h-0">

                {/* LEFT: DEPT SLOT */}
                <div className="flex flex-col items-center gap-4 shrink-0 justify-center">
                    <div className="text-xl font-bold text-sakura-dark">部門</div>
                    <div className="w-64 h-64 bg-white rounded-3xl shadow-xl border-4 border-sakura-pink/50 flex items-center justify-center overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-100" />
                        <motion.div
                            key={displayDept}
                            // Only animate pop when locked (Stage 2+)
                            initial={stage >= 2 ? { scale: 0.5, opacity: 0 } : false}
                            animate={stage >= 2 ? { scale: 1, opacity: 1 } : false}
                            className="text-4xl font-black text-gray-800 z-10 text-center px-4"
                        >
                            {displayDept}
                        </motion.div>
                    </div>
                </div>

                {/* ARROW */}
                <div className="text-4xl text-gray-300 md:self-center hidden md:block">
                    ➜
                </div>

                {/* RIGHT: NAME GRID */}
                <div className="flex flex-col items-center gap-4 flex-1 min-w-0">
                    <div className="text-xl font-bold text-sakura-dark">
                        {selectedDept ? `${selectedDept} 候選名單 (${deptCandidates.length}人)` : "人員"}
                    </div>

                    <div className="w-full h-full min-h-[300px] bg-white/40 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/50 overflow-y-auto">
                        {!selectedDept ? (
                            <div className="h-full w-full flex items-center justify-center text-gray-300 font-bold text-2xl">
                                等待部門...
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3 justify-center content-start">
                                {deptCandidates.map(p => {
                                    const isHighlighted = highlightedId === p.id;
                                    const isWinner = winner?.id === p.id;

                                    return (
                                        <motion.div
                                            key={p.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{
                                                opacity: 1,
                                                scale: isHighlighted || isWinner ? 1.1 : 1,
                                                backgroundColor: isWinner
                                                    ? '#FFD700' // Gold
                                                    : isHighlighted
                                                        ? '#FDE047' // Yellow-300
                                                        : '#FFFFFF' // White
                                            }}
                                            className={`
                                                relative px-4 py-3 rounded-xl text-lg font-bold shadow-sm transition-colors duration-100 cursor-default select-none
                                                ${(isHighlighted || isWinner)
                                                    ? 'text-yellow-900 shadow-lg ring-4 ring-yellow-200 z-10'
                                                    : 'text-gray-600 hover:bg-white/80'
                                                }
                                            `}
                                        >
                                            {p.name}
                                            {/* Optional Badge for Win */}
                                            {isWinner && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-2 -right-2 text-xl"
                                                >
                                                    👑
                                                </motion.span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Removed Bottom List - It's now the main right panel */}
        </div>
    );
}
