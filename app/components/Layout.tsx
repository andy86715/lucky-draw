'use client';

import { Github } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
    // Floating icons for background decoration
    const icons = ['🍼', '👶', '🧸', '💖', '🏥', '🕊️'];
    const [floatingElements, setFloatingElements] = useState<{ x: number, y: number, duration: number, icon: string }[]>([]);

    useEffect(() => {
        setFloatingElements(Array.from({ length: 15 }).map(() => ({
            x: Math.random() * (window.innerWidth),
            y: Math.random() * (window.innerHeight),
            duration: 5 + Math.random() * 5,
            icon: icons[Math.floor(Math.random() * icons.length)]
        })));
    }, []);

    return (
        <div className="min-h-screen bg-sakura-light overflow-hidden text-warm-text font-sans selection:bg-sakura-pink selection:text-white">

            {/* Background Floating Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 select-none z-0">
                {floatingElements.map((el, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: el.x,
                            y: el.y
                        }}
                        animate={{
                            y: [0, -20, 0],
                            x: [0, 10, 0],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{
                            duration: el.duration,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute text-4xl"
                        style={{
                            left: 0,
                            top: 0
                        }}
                    >
                        {el.icon}
                    </motion.div>
                ))}
            </div>

            <header className="relative z-10 py-6 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-sakura-dark drop-shadow-sm tracking-tight">
                    🌸 溫馨好孕 2026 尾牙 🌸
                </h1>
                <p className="text-sakura-pink font-bold mt-2 text-xl">OB/GYN Department Lucky Draw</p>
            </header>

            <main className="relative z-10 min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
                {children}
            </main>

            <footer className="fixed bottom-4 right-4 z-10 opacity-60 hover:opacity-100 transition-opacity">
                <a href="https://github.com/andy86715" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-warm-text bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Github size={14} />
                    <span>Open Source</span>
                </a>
            </footer>
        </div>
    );
}
