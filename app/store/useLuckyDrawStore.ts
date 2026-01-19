import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Participant {
    id: string;
    name: string;
    department: string;
    isWinner: boolean;
    wonPrizeId?: string;
    disqualified?: boolean;
}

export interface Prize {
    id: string;
    name: string;
    count: number;
    winners: string[]; // Participant IDs
}

interface LuckyDrawState {
    participants: Participant[];
    prizes: Prize[];
    currentPrizeId: string | null;
    mode: 'SLOT' | 'ROULETTE' | 'BATCH';
    isDrawing: boolean;
    isDecelerating: boolean; // Added missing type
    lastWinners: string[];
    history: string[]; // Log of past draws

    // Actions
    setParticipants: (data: Omit<Participant, 'isWinner' | 'wonPrizeId' | 'disqualified'>[]) => void;
    addParticipant: (name: string, department: string) => void;
    removeParticipant: (id: string) => void;

    addPrize: (name: string, count: number) => void;
    setCurrentPrize: (prizeId: string) => void;
    removePrize: (id: string) => void;
    setMode: (mode: 'SLOT' | 'ROULETTE' | 'BATCH') => void;
    updatePrize: (id: string, updates: Partial<Prize>) => void;

    // Draw Logic
    startDraw: () => void;
    endDraw: (winnerCount?: number) => void; // Calculates winners, enters deceleration
    completeDraw: () => void; // Finishes deceleration, shows result
    clearLastWinners: () => void;
    redraw: (prizeId: string, previousWinnerId: string) => void; // Added missing action definition
    reset: () => void; // Added missing action definition
}

export const useLuckyDrawStore = create<LuckyDrawState>()(
    persist(
        (set, get) => ({
            participants: [],
            prizes: [],
            currentPrizeId: null,
            mode: 'SLOT',
            isDrawing: false,
            isDecelerating: false,
            lastWinners: [],
            history: [],

            setParticipants: (data) => set({
                participants: data.map(p => ({ ...p, isWinner: false, disqualified: false }))
            }),

            addParticipant: (name, department) => set((state) => ({
                participants: [
                    ...state.participants,
                    {
                        id: crypto.randomUUID(),
                        name,
                        department,
                        isWinner: false,
                        disqualified: false
                    }
                ]
            })),

            removeParticipant: (id) => set((state) => ({
                participants: state.participants.filter(p => p.id !== id)
            })),

            addPrize: (name, count) => set((state) => ({
                prizes: [
                    ...state.prizes,
                    {
                        id: crypto.randomUUID(),
                        name,
                        count,
                        winners: []
                    }
                ]
            })),

            removePrize: (id) => set((state) => ({
                prizes: state.prizes.filter(p => p.id !== id)
            })),

            setCurrentPrize: (prizeId) => set({ currentPrizeId: prizeId }),

            // Reset animation state when switching modes
            setMode: (mode) => set({
                mode,
                isDrawing: false,
                isDecelerating: false,
                lastWinners: []
            }),

            clearLastWinners: () => set({ lastWinners: [] }),

            updatePrize: (id, updates) => set((state) => ({
                prizes: state.prizes.map(p => p.id === id ? { ...p, ...updates } : p)
            })),

            startDraw: () => set({ isDrawing: true, isDecelerating: false, lastWinners: [] }),

            endDraw: (winnerCount = 1) => {
                const state = get();
                if (!state.currentPrizeId) return;

                const currentPrize = state.prizes.find(p => p.id === state.currentPrizeId);
                if (!currentPrize) return;

                // Filter eligible participants
                const eligible = state.participants.filter(p => !p.isWinner && !p.disqualified);

                if (eligible.length === 0) {
                    set({ isDrawing: false });
                    alert('No eligible participants left!');
                    return;
                }

                // Randomly select winners
                const winnersToPick = Math.min(winnerCount, currentPrize.count - currentPrize.winners.length, eligible.length);
                const newWinners: string[] = [];

                const tempEligible = [...eligible];
                for (let i = 0; i < winnersToPick; i++) {
                    if (tempEligible.length === 0) break;
                    const randomIndex = Math.floor(Math.random() * tempEligible.length);
                    const winner = tempEligible[randomIndex];
                    newWinners.push(winner.id);
                    tempEligible.splice(randomIndex, 1);
                }

                // If winners found, set them and enter Deceleration phase
                // We do NOT update the prize/participant data yet? 
                // Actually, to show them in Roulette, we usually need to know who they are.
                // Let's update the data immediately, but keep isDrawing = true.

                if (newWinners.length > 0) {
                    set((state) => ({
                        isDecelerating: true, // Signal components to stop
                        lastWinners: newWinners,
                        participants: state.participants.map(p =>
                            newWinners.includes(p.id)
                                ? { ...p, isWinner: true, wonPrizeId: state.currentPrizeId! }
                                : p
                        ),
                        prizes: state.prizes.map(p =>
                            p.id === state.currentPrizeId
                                ? { ...p, winners: [...p.winners, ...newWinners] }
                                : p
                        ),
                        history: [...state.history, `Draw result for ${currentPrize.name}: ${newWinners.join(', ')}`]
                    }));
                } else {
                    set({ isDrawing: false, lastWinners: [] });
                }
            },

            completeDraw: () => set({ isDrawing: false, isDecelerating: false }),

            redraw: (prizeId, previousWinnerId) => {
                set((state) => {
                    const prize = state.prizes.find(p => p.id === prizeId);
                    if (!prize) return state;

                    return {
                        participants: state.participants.map(p =>
                            p.id === previousWinnerId
                                ? { ...p, isWinner: false, wonPrizeId: undefined, disqualified: true } // DQ the previous winner
                                : p
                        ),
                        prizes: state.prizes.map(p =>
                            p.id === prizeId
                                ? { ...p, winners: p.winners.filter(id => id !== previousWinnerId) }
                                : p
                        ),
                        history: [...state.history, `Redraw triggered for ${prize.name}. Disqualified ${previousWinnerId}`]
                    };
                });
            },

            reset: () => set({ participants: [], prizes: [], currentPrizeId: null, history: [] }),
        }),
        {
            name: 'lucky-draw-storage',
        }
    )
);
