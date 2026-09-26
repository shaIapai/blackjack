/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, PlayerStats } from './types/cards';
import { DurakGame } from './games/durak/DurakGame';
import { PokerGame } from './games/poker/PokerGame';
import { BlackjackGame } from './games/blackjack/BlackjackGame';
import { ClubLoungeInfo } from './components/ClubLoungeInfo';
import { sound } from './utils/audio';
import { Volume2, VolumeX, Plus, Sparkles } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
  balance: 2500,
  totalGames: 0,
  totalWins: 0,
  durakWins: 0,
  durakGames: 0,
  pokerWins: 0,
  pokerGames: 0,
  blackjackWins: 0,
  blackjackGames: 0,
  biggestWin: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<GameMode | 'bank'>('durak');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem('royal_cards_stats');
      return saved ? JSON.parse(saved) : INITIAL_STATS;
    } catch {
      return INITIAL_STATS;
    }
  });

  // Sync stats with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('royal_cards_stats', JSON.stringify(stats));
    } catch {
      // Ignored
    }
  }, [stats]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playClick();
  };

  const handleUpdateBalance = (
    newBalance: number,
    delta: number,
    game: 'durak' | 'poker' | 'blackjack'
  ) => {
    setStats((prev) => {
      const isWin = delta > 0;
      const biggestWin = Math.max(prev.biggestWin, isWin ? delta : 0);

      return {
        ...prev,
        balance: Math.max(0, newBalance),
        totalGames: prev.totalGames + 1,
        totalWins: prev.totalWins + (isWin ? 1 : 0),
        durakWins: prev.durakWins + (game === 'durak' && isWin ? 1 : 0),
        durakGames: prev.durakGames + (game === 'durak' ? 1 : 0),
        pokerWins: prev.pokerWins + (game === 'poker' && isWin ? 1 : 0),
        pokerGames: prev.pokerGames + (game === 'poker' ? 1 : 0),
        blackjackWins: prev.blackjackWins + (game === 'blackjack' && isWin ? 1 : 0),
        blackjackGames: prev.blackjackGames + (game === 'blackjack' ? 1 : 0),
        biggestWin,
      };
    });
  };

  const handleAddChips = (amount: number) => {
    setStats((prev) => ({
      ...prev,
      balance: prev.balance + amount,
    }));
  };

  const handleResetStats = () => {
    setStats(INITIAL_STATS);
  };

  return (
    <div className="min-h-screen bg-[#111113] text-[#f2efeb] flex flex-col selection:bg-[#ffdb58] selection:text-[#111113]">
      {/* Variation 2 Header */}
      <header className="px-4 sm:px-8 py-4 border-b-[1.5px] border-[#f2efeb] bg-[#111113] sticky top-0 z-50 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="font-display font-extrabold text-xl sm:text-2xl uppercase tracking-tighter text-[#f2efeb] select-none">
          Royal Cards Club
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('durak');
            }}
            className={`text-xs uppercase font-semibold tracking-wider transition-all cursor-pointer pb-1 ${
              activeTab === 'durak'
                ? 'opacity-100 border-b-2 border-[#ffdb58] text-[#f2efeb]'
                : 'opacity-50 hover:opacity-80 text-[#f2efeb]'
            }`}
          >
            Дурак
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('poker');
            }}
            className={`text-xs uppercase font-semibold tracking-wider transition-all cursor-pointer pb-1 ${
              activeTab === 'poker'
                ? 'opacity-100 border-b-2 border-[#ffdb58] text-[#f2efeb]'
                : 'opacity-50 hover:opacity-80 text-[#f2efeb]'
            }`}
          >
            Покер
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('blackjack');
            }}
            className={`text-xs uppercase font-semibold tracking-wider transition-all cursor-pointer pb-1 ${
              activeTab === 'blackjack'
                ? 'opacity-100 border-b-2 border-[#ffdb58] text-[#f2efeb]'
                : 'opacity-50 hover:opacity-80 text-[#f2efeb]'
            }`}
          >
            21 (Очко)
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('bank');
            }}
            className={`text-xs uppercase font-semibold tracking-wider transition-all cursor-pointer pb-1 ${
              activeTab === 'bank'
                ? 'opacity-100 border-b-2 border-[#ffdb58] text-[#f2efeb]'
                : 'opacity-50 hover:opacity-80 text-[#f2efeb]'
            }`}
          >
            Банк & Info
          </button>
        </nav>

        {/* User Stats / Balance & Sound */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => {
              sound.playClick();
              setActiveTab('bank');
            }}
            className="bg-[#f2efeb] text-[#111113] px-3.5 py-1.5 sm:px-4 sm:py-2 font-mono font-bold text-xs sm:text-sm rounded-[2px] cursor-pointer hover:bg-white transition-colors tabular-nums"
            title="Касса фишек"
          >
            🪙 {stats.balance.toLocaleString()}
          </div>

          <button
            onClick={toggleSound}
            className="w-9 h-9 sm:w-10 sm:h-10 border-[1.5px] border-[#f2efeb] text-[#ffdb58] flex items-center justify-center cursor-pointer hover:bg-[rgba(242,239,235,0.05)] transition-colors"
            title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#ffdb58]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#f2efeb]/40" />
            )}
          </button>
        </div>
      </header>

      {/* Main Playing Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        {activeTab === 'durak' && (
          <DurakGame
            balance={stats.balance}
            onUpdateBalance={handleUpdateBalance}
          />
        )}

        {activeTab === 'poker' && (
          <PokerGame
            balance={stats.balance}
            onUpdateBalance={handleUpdateBalance}
          />
        )}

        {activeTab === 'blackjack' && (
          <BlackjackGame
            balance={stats.balance}
            onUpdateBalance={handleUpdateBalance}
          />
        )}

        {activeTab === 'bank' && (
          <ClubLoungeInfo
            stats={stats}
            onAddChips={handleAddChips}
            onResetStats={handleResetStats}
          />
        )}
      </main>

      {/* Variation 2 Footer */}
      <footer className="px-4 sm:px-8 py-3.5 border-t border-[rgba(242,239,235,0.1)] flex items-center justify-between flex-wrap gap-2 text-[#f2efeb]">
        <div className="label">© Royal Cards Club</div>
        <div className="label hidden sm:block">
          Интерактивный клуб карточных игр · Живой расчёт вероятностей
        </div>
      </footer>
    </div>
  );
}
