'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useLuckyDrawStore } from '../store/useLuckyDrawStore';

export default function Garapon() {
    const { isDrawing } = useLuckyDrawStore();
    const controls = useAnimation();
    const [ballState, setBallState] = useState<'IDLE' | 'DROPPING' | 'REVEALED'>('IDLE');

    // Audio Refs
    const spinAudioRef = useRef<HTMLAudioElement | null>(null);
    const dropAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize Audio (Client-side only)
        spinAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'); // Rattle
        spinAudioRef.current.loop = true;
        dropAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1601/1601-preview.mp3'); // Bell
    }, []);

    // Reset state when drawing starts
    const startSpin = async () => {
        // Play Sound
        if (spinAudioRef.current) {
            try {
                spinAudioRef.current.currentTime = 0;
                spinAudioRef.current.loop = true;
                await spinAudioRef.current.play();
            } catch (e) {
                console.error("Audio play failed", e);
            }
        }

        controls.start({
            rotate: 3600, // Spin 10 times fast
            transition: { duration: 10, ease: "linear", repeat: Infinity }
        });
    };

    const stopSpinAndDrop = async () => {
        // Stop spinning
        controls.stop();

        // Stop sound
        if (spinAudioRef.current) {
            spinAudioRef.current.pause();
        }

        // Play Drop Sound
        if (dropAudioRef.current) {
            dropAudioRef.current.currentTime = 0;
            dropAudioRef.current.play().catch(e => console.error(e));
        }

        // Animate Drop (Ball comes out)
        setBallState('DROPPING'); // Assuming setIsDropping maps to setBallState('DROPPING')
        // completeDraw() is not defined in the original context, so I'll keep the original setBallState('REVEALED') logic
        // If completeDraw is meant to be called, it needs to be passed as a prop or accessed from store.

        setTimeout(() => {
            setBallState('REVEALED'); // Assuming setIsDropping(false) and completeDraw() maps to setBallState('REVEALED')
        }, 1000); // Wait for drop animation
    };

    useEffect(() => {
        if (isDrawing) {
            setBallState('IDLE');
            startSpin();
        } else {
            stopSpinAndDrop();
        }

        return () => {
            if (spinAudioRef.current) spinAudioRef.current.pause();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDrawing]);

    return (
        <div className="relative w-80 h-80 flex items-center justify-center">
            {/* The Machine Body (Octagon) */}
            <motion.div
                animate={controls}
                className="w-64 h-64 bg-amber-700 rounded-3xl relative flex items-center justify-center border-4 border-amber-900 shadow-xl z-10"
                style={{
                    clipPath: "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)"
                }}
            >
                {/* Center Axis */}
                <div className="w-4 h-4 bg-gray-300 rounded-full absolute" />

                {/* Visual decorations (stripes) */}
                <div className="absolute inset-0 border-4 border-amber-600 opacity-30 rounded-full m-4" />
            </motion.div>

            {/* Stand */}
            <div className="absolute bottom-0 w-32 h-10 bg-amber-900 translate-y-full rounded-b-xl" />
            <div className="absolute bottom-0 w-4 h-20 bg-amber-800 translate-y-1/2 -z-10" />

            {/* Dropping Ball */}
            {ballState !== 'IDLE' && (
                <motion.div
                    initial={{ y: 0, opacity: 0, scale: 0.5 }}
                    animate={
                        ballState === 'DROPPING'
                            ? { y: 150, opacity: 1, scale: 1 }
                            : { y: 150, scale: 5, opacity: 0 } // Explode/Reveal
                    }
                    transition={{ duration: 0.8, ease: "backOut" }}
                    className="absolute z-20 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-red-500 shadow-md border-2 border-white"
                />
            )}
        </div>
    );
}
