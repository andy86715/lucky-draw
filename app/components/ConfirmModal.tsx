'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-white relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className={`absolute top-0 left-0 right-0 h-32 ${type === 'danger' ? 'bg-red-50' : 'bg-blue-50'} -z-10 rounded-t-[2rem]`} />

                    <div className="flex flex-col items-center gap-4">
                        <div className={`
                            w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-2
                            ${type === 'danger' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}
                        `}>
                            <AlertTriangle size={40} strokeWidth={2.5} />
                        </div>

                        <h3 className="text-2xl font-black text-gray-800">
                            {title}
                        </h3>

                        <p className="text-gray-500 font-bold whitespace-pre-wrap leading-relaxed">
                            {message}
                        </p>

                        <div className="flex gap-4 w-full mt-6">
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`
                                    flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95
                                    ${type === 'danger'
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-200'
                                        : 'bg-sakura-pink hover:bg-sakura-dark shadow-pink-200'
                                    }
                                `}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
