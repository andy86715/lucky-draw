'use client';

import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import ControlPanel from './components/ControlPanel';
import ResultModal from './components/ResultModal';
// import Garapon from './components/Garapon'; // Removed
import { useLuckyDrawStore } from './store/useLuckyDrawStore';
import clsx from 'clsx';
import SlotMachine from './components/SlotMachine';
import Roulette from './components/Roulette';
import BatchDraw from './components/BatchDraw';
import IdDraw from './components/IdDraw';

export default function Home() {
  const { mode, isDrawing, currentPrizeId, prizes } = useLuckyDrawStore();
  const currentPrize = prizes.find(p => p.id === currentPrizeId);

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl mx-auto relative">

        {/* Prize Label - Positioned Above Stage */}
        {currentPrize ? (
          <div className="bg-sakura-pink text-white px-8 py-3 rounded-full text-2xl font-bold shadow-lg mb-6 z-10 transition-all border-4 border-white">
            🏆 {currentPrize.name} <span className="text-lg ml-2 opacity-90">(共 {currentPrize.count} 名)</span>
          </div>
        ) : (
          <div className="bg-gray-300 text-white px-8 py-3 rounded-full text-2xl font-bold mb-6 z-10 transition-all border-4 border-white">
            請先選擇一個獎項
          </div>
        )}

        {/* Stage Area */}
        <div className="w-full aspect-video max-h-[600px] bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl border-8 border-white flex flex-col items-center justify-center p-10 relative overflow-hidden">

          {/* Visuals based on Mode */}
          {mode === 'SLOT' && <SlotMachine />}
          {mode === 'ROULETTE' && <Roulette />}
          {mode === 'BATCH' && <BatchDraw />}
          {mode === 'ID_DRAW' && <IdDraw />}

          {!currentPrize && !isDrawing && (
            <div className="mt-10 text-gray-400 font-bold text-xl">
              Import stats or add prizes using the panel below.
            </div>
          )}
        </div>

        {/* Start/Stop Button on Main Stage */}
        {/* Start/Stop Button - Fixed Position */}
        <div className="fixed top-6 right-6 z-50 w-64">
          <button
            onClick={() => {
              if (isDrawing && currentPrize) {
                if (mode === 'BATCH') {
                  // Batch Mode: Draw all remaining
                  const remaining = currentPrize.count - currentPrize.winners.length;
                  useLuckyDrawStore.getState().endDraw(remaining);
                } else {
                  // Other Modes: Draw ONE at a time
                  useLuckyDrawStore.getState().endDraw(1);
                }
              } else {
                useLuckyDrawStore.getState().startDraw();
              }
            }}
            disabled={!currentPrize || (!isDrawing && currentPrize.winners.length >= currentPrize.count)}
            className={clsx(
              "w-full py-4 text-white text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-wider border-2 border-white/50 backdrop-blur-sm",
              isDrawing
                ? "bg-red-500 animate-pulse"
                : "bg-sakura-pink"
            )}
          >
            {isDrawing ? "🛑 STOP" : "🚀 START"}
          </button>
          {isDrawing && (
            <div className="text-center mt-2 text-sakura-dark font-bold text-xs bg-white/80 px-2 py-1 rounded-lg">
              {mode === 'BATCH' ? "點擊停止抽出所有剩餘" : "點擊停止抽出一位"}
            </div>
          )}
        </div>

      </div>

      <ControlPanel />
      <ResultModal />
    </Layout >
  );
}
