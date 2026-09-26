import React from 'react';
import { PlayerStats } from '../types/cards';
import { sound } from '../utils/audio';
import { Trophy, Coins, BookOpen, Sparkles, Shield, Flame } from 'lucide-react';

interface ClubLoungeInfoProps {
  stats: PlayerStats;
  onAddChips: (amount: number) => void;
  onResetStats: () => void;
}

export const ClubLoungeInfo: React.FC<ClubLoungeInfoProps> = ({
  stats,
  onAddChips,
  onResetStats,
}) => {
  const winRate =
    stats.totalGames > 0
      ? ((stats.totalWins / stats.totalGames) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full text-[#f2efeb]">
      {/* Top Banner / Bankroll Status */}
      <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#ffdb58] text-[#111113] flex items-center justify-center font-display font-extrabold text-2xl">
            🪙
          </div>
          <div>
            <div className="label mb-1 text-[#ffdb58] opacity-100">
              Касса Клуба & Баланс
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-[#f2efeb] tabular-nums">
              {stats.balance.toLocaleString()} <span className="text-[#ffdb58] text-xl">🪙</span>
            </div>
            <div className="text-xs text-[#f2efeb]/60 mt-1 font-sans">
              Бесплатное пополнение фишек в любое время
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              sound.playChips();
              onAddChips(1000);
            }}
            className="flex-1 md:flex-none px-6 py-3 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all"
          >
            Получить +1,000 🪙
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onResetStats();
            }}
            className="px-4 py-3 bg-transparent border border-[rgba(242,239,235,0.2)] hover:border-[#f2efeb] text-[#f2efeb] font-mono text-xs uppercase transition-colors"
          >
            Сброс статистики
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5">
          <div className="label mb-1">Всего сыграно</div>
          <div className="text-3xl font-display font-extrabold text-[#f2efeb] tabular-nums">
            {stats.totalGames}
          </div>
          <div className="text-[11px] font-mono text-[#f2efeb]/50 mt-1">партий сыграно</div>
        </div>

        <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5">
          <div className="label mb-1">Всего побед</div>
          <div className="text-3xl font-display font-extrabold text-[#4ade80] tabular-nums">
            {stats.totalWins}
          </div>
          <div className="text-[11px] font-mono text-[#f2efeb]/50 mt-1">триумфов в клубе</div>
        </div>

        <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5">
          <div className="label mb-1">Винрейт</div>
          <div className="text-3xl font-display font-extrabold text-[#ffdb58] tabular-nums">
            {winRate}%
          </div>
          <div className="text-[11px] font-mono text-[#f2efeb]/50 mt-1">доля побед</div>
        </div>

        <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5">
          <div className="label mb-1">Рекордный выигрыш</div>
          <div className="text-3xl font-display font-extrabold text-[#f2efeb] tabular-nums">
            {stats.biggestWin} 🪙
          </div>
          <div className="text-[11px] font-mono text-[#f2efeb]/50 mt-1">за одну партию</div>
        </div>
      </div>

      {/* Rules and Mathematics Guide */}
      <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[rgba(242,239,235,0.1)] pb-3">
          <div className="label text-[#ffdb58] opacity-100 text-xs">
            [ Руководство & Механика Живых Шансов ]
          </div>
          <span className="label">Live Probability System</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#f2efeb]/80">
          {/* Durak Rules */}
          <div className="flex flex-col gap-2 p-4 bg-[#111113] border border-[rgba(242,239,235,0.1)]">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-[#ffdb58]">
              <span>🃏</span>
              <span>Подкидной Дурак (36 карт)</span>
            </div>
            <p className="text-[#f2efeb]/70 leading-relaxed font-sans mt-1">
              Цель — первым избавиться от всех карт на руках при опустевшей колоде. 
              Козырь бьёт любую не козырную карту. Атакующий может подкидывать карты того же достоинства, что уже на столе.
            </p>
            <div className="mt-3 text-[11px] text-[#f2efeb]/60 border-t border-[rgba(242,239,235,0.1)] pt-2 font-mono">
              <strong className="text-[#4ade80] block mb-0.5">Динамика шансов:</strong>
              Учитывает количество козырей, непокрытые карты и размер руки соперника.
            </div>
          </div>

          {/* Poker Rules */}
          <div className="flex flex-col gap-2 p-4 bg-[#111113] border border-[rgba(242,239,235,0.1)]">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-[#ffdb58]">
              <span>♠️</span>
              <span>Техасский Холдем (52 карты)</span>
            </div>
            <p className="text-[#f2efeb]/70 leading-relaxed font-sans mt-1">
              Каждый игрок получает по 2 закрытые карты. Затем на стол последовательно выкладываются 5 общих карт (флоп, тёрн, ривер). Соберите сильнейшую комбинацию из 5 карт.
            </p>
            <div className="mt-3 text-[11px] text-[#f2efeb]/60 border-t border-[rgba(242,239,235,0.1)] pt-2 font-mono">
              <strong className="text-[#ffdb58] block mb-0.5">Динамика шансов:</strong>
              Живой симулятор Монте-Карло оценивает эквити вашей руки, шансы банка и вероятность аутов.
            </div>
          </div>

          {/* 21 Rules */}
          <div className="flex flex-col gap-2 p-4 bg-[#111113] border border-[rgba(242,239,235,0.1)]">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-[#ffdb58]">
              <span>🎲</span>
              <span>21 / Блэкджек (52 карты)</span>
            </div>
            <p className="text-[#f2efeb]/70 leading-relaxed font-sans mt-1">
              Наберите больше очков, чем дилер, но не более 21. Туз считается за 1 или 11 очков, картинки — за 10. Дилер обязан брать карты до 17 очков.
            </p>
            <div className="mt-3 text-[11px] text-[#f2efeb]/60 border-t border-[rgba(242,239,235,0.1)] pt-2 font-mono">
              <strong className="text-sky-400 block mb-0.5">Динамика шансов:</strong>
              Точный математический расчёт вероятности перебора при взятии карты и оценка руки дилера.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
