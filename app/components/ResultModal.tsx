'use client';

import { useEffect, useState } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check } from 'lucide-react';
import { useSound } from '../context/SoundContext';
import ConfirmModal from './ConfirmModal';

export default function ResultModal() {
    const {
        currentPrizeId, prizes, participants, lastWinners, isDecelerating,
        clearLastWinners, redraw, startDraw, mode,
        setIdDrawCount, setSlotDrawCount
    } = useLuckyDrawStore();
    const { playCongrats } = useSound();

    const [confirmData, setConfirmData] = useState<{ winnerIds: string[]; winnerNames: string[] } | null>(null);
    const [selectedWinners, setSelectedWinners] = useState<Set<string>>(new Set());

    const show = lastWinners.length > 0 && !isDecelerating;
    const currentPrize = prizes.find(p => p.id === currentPrizeId);
    const winners = participants.filter(p => lastWinners.includes(p.id));

    useEffect(() => {
        if (show) {
            playCongrats();
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
        } else {
            setSelectedWinners(new Set()); // Reset selection on close
        }
    }, [show, playCongrats]);

    if (!show || !currentPrize) return null;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedWinners);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedWinners(newSet);
    };

    const handleSingleRedraw = (id: string, name: string) => {
        setConfirmData({ winnerIds: [id], winnerNames: [name] });
    };

    const handleBatchRedraw = () => {
        const selected = winners.filter(w => selectedWinners.has(w.id));
        setConfirmData({
            winnerIds: selected.map(w => w.id),
            winnerNames: selected.map(w => w.name)
        });
    };

    const handleConfirmRedraw = () => {
        if (confirmData) {
            const count = confirmData.winnerIds.length;

            // 1. Disqualify Winners
            redraw(currentPrize.id, confirmData.winnerIds);

            // 2. Set Draw Count for next round
            if (mode === 'ID_DRAW') {
                setIdDrawCount(count);
            } else if (mode === 'SLOT') {
                setSlotDrawCount(count);
            }
            // For others, typically count is 1, but if we support batch later...

            // 3. Restart
            clearLastWinners();
            startDraw();
            setConfirmData(null);
            setSelectedWinners(new Set());
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                key="result-modal"
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
                    <div className="shrink-0 mb-4">
                        <h2 className="text-xl font-bold text-gray-400 mb-1 uppercase tracking-widest">{currentPrize.name}</h2>
                        <div className="text-sakura-dark text-4xl font-black drop-shadow-md">
                            🎉 CONGRATULATIONS 🎉
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 px-2 py-2 scrollbar-thin scrollbar-thumb-sakura-pink scrollbar-track-transparent">
                        {winners.map(w => (
                            <div key={w.id}
                                onClick={() => toggleSelection(w.id)}
                                className={`
                                    p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 shrink-0
                                    ${selectedWinners.has(w.id)
                                        ? 'bg-red-50 border-red-400 shadow-md'
                                        : 'bg-sakura-light/50 border-sakura-pink/30 hover:bg-white'}
                                `}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                                    {/* Checkbox UI */}
                                    <div className={`
                                        w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors
                                        ${selectedWinners.has(w.id) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}
                                    `}>
                                        {selectedWinners.has(w.id) && <Check size={16} strokeWidth={4} />}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-3xl font-extrabold text-warm-text truncate">{w.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 opacity-80">
                                            <span className="text-sm font-bold bg-white/50 px-2 py-0.5 rounded text-gray-600 border border-sakura-pink/20">{w.department || '無部門'}</span>
                                            <span className="text-sm font-mono text-gray-500">#{w.employeeId || '---'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSingleRedraw(w.id, w.name); }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 hover:text-red-500 transition-colors text-xs font-bold whitespace-nowrap shrink-0 z-10"
                                >
                                    <RefreshCw size={14} className="inline mr-1" /> 重抽此人
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="shrink-0 mt-6 pt-4 border-t border-gray-100 flex gap-4">
                        <button
                            onClick={clearLastWinners}
                            className="flex-1 py-3 bg-gray-500 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={24} /> 關閉 (Close)
                        </button>

                        {selectedWinners.size > 0 && (
                            <button
                                onClick={handleBatchRedraw}
                                className="flex-1 py-3 bg-red-500 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-red-600 animate-pulse transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={24} /> 重抽選取 ({selectedWinners.size})
                            </button>
                        )}
                    </div>

                </motion.div>
            </motion.div>

            {confirmData && (
                <ConfirmModal
                    isOpen={!!confirmData}
                    title="確定要重抽嗎？"
                    message={
                        confirmData.winnerNames.length === 1
                            ? `這將會取消 ${confirmData.winnerNames[0]} 的得獎資格，並立即重新抽出一位！`
                            : `這將會取消 ${confirmData.winnerNames.length} 位得獎者的資格 (${confirmData.winnerNames.join(', ')})，並立即重新抽出！`
                    }
                    confirmText="確定重抽"
                    cancelText="取消"
                    type="danger"
                    onConfirm={handleConfirmRedraw}
                    onCancel={() => setConfirmData(null)}
                />
            )}
        </AnimatePresence>
    );
}
