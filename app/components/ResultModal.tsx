'use client';

import { useEffect, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check } from 'lucide-react';

export default function ResultModal() {
    const { currentPrizeId, prizes, participants, lastWinners, isDecelerating, clearLastWinners, redraw, startDraw } = useLuckyDrawStore();

    const show = lastWinners.length > 0 && !isDecelerating;
    const currentPrize = prizes.find(p => p.id === currentPrizeId);
    const winners = participants.filter(p => lastWinners.includes(p.id));

    // Audio Ref
    const winAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio
        winAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); // Fanfare/Cheer
    }, []);

    useEffect(() => {
        if (show) {
            // Play Sound
            winAudioRef.current?.play().catch(() => { });

            // Confetti explosion
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFB7C5', '#89CFF0', '#FFFDD0']
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFB7C5', '#89CFF0', '#FFFDD0']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [show]);

    if (!show || !currentPrize) return null;

    const handleRedraw = (winnerId: string) => {
        if (confirm(`Are you sure you want to Re-draw? \n${winnerId} will be disqualified.`)) {
            redraw(currentPrize.id, winnerId);
            clearLastWinners();
            startDraw();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    className="bg-white rounded-[2rem] shadow-2xl p-6 max-w-2xl w-full text-center border-4 border-sakura-pink relative overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header: Fixed */}
                    <div className="shrink-0 mb-4">
                        <h2 className="text-xl font-bold text-gray-400 mb-1 uppercase tracking-widest">{currentPrize.name}</h2>
                        <div className="text-sakura-dark text-4xl font-black drop-shadow-md">
                            🎉 CONGRATULATIONS 🎉
                        </div>
                    </div>

                    {/* Content: Scrollable */}
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 px-2 py-2 scrollbar-thin scrollbar-thumb-sakura-pink scrollbar-track-transparent">
                        {winners.map(w => (
                            <div key={w.id} className="bg-sakura-light/50 p-4 rounded-xl border-2 border-sakura-pink/30 flex items-center justify-between gap-4 shrink-0">
                                <h3 className="text-3xl font-extrabold text-warm-text truncate flex-1 text-left">{w.name}</h3>
                                <button
                                    onClick={() => handleRedraw(w.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors text-xs font-bold whitespace-nowrap shrink-0"
                                >
                                    <RefreshCw size={14} /> 重抽
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer: Fixed */}
                    <div className="shrink-0 mt-6 pt-4 border-t border-gray-100">
                        <button
                            onClick={clearLastWinners}
                            className="w-full py-3 bg-sakura-pink text-white text-xl font-bold rounded-xl shadow-lg hover:bg-sakura-dark hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={24} /> 關閉 (Close)
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
