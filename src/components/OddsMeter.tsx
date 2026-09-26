import React from 'react';
import { motion } from 'motion/react';
import { Flame, ShieldAlert, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

export interface OddsData {
  winRate: number; // 0 to 100
  tieRate?: number; // 0 to 100
  loseRate?: number; // 0 to 100
  tensionLevel: 'low' | 'medium' | 'high' | 'extreme';
  headline: string;
  subtext: string;
  factors: Array<{ label: string; value: string; positive?: boolean }>;
  ev?: number; // Expected value
}

interface OddsMeterProps {
  odds: OddsData;
  compact?: boolean;
}

export const OddsMeter: React.FC<OddsMeterProps> = ({ odds, compact = false }) => {
  const win = Math.max(0, Math.min(100, odds.winRate));
  
  const getTensionBadge = () => {
    switch (odds.tensionLevel) {
      case 'extreme':
        return {
          text: 'Критический азарт',
          color: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
          icon: <Flame className="w-3 h-3 text-rose-400 animate-pulse" />,
        };
      case 'high':
        return {
          text: 'Высокий накал',
          color: 'text-[#ffdb58] border-[#ffdb58]/40 bg-[#ffdb58]/10',
          icon: <Flame className="w-3 h-3 text-[#ffdb58]" />,
        };
      case 'medium':
        return {
          text: 'Борьба шансов',
          color: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
          icon: <TrendingUp className="w-3 h-3 text-sky-400" />,
        };
      default:
        return {
          text: 'Стабильно',
          color: 'text-[#4ade80] border-[#4ade80]/40 bg-[#4ade80]/10',
          icon: <Sparkles className="w-3 h-3 text-[#4ade80]" />,
        };
    }
  };

  const tension = getTensionBadge();

  return (
    <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5 sm:p-6 text-[#f2efeb] relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="label">Калькулятор Шансов</span>
        <div className="flex items-center gap-2">
          <span className="label text-[#4ade80] opacity-100">[ Live AI ]</span>
          <div className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono uppercase ${tension.color}`}>
            {tension.icon}
            <span>{tension.text}</span>
          </div>
        </div>
      </div>

      {/* Syne Huge Odds Value */}
      <div className="my-3">
        <div className="flex items-baseline gap-2">
          <motion.div
            key={win.toFixed(1)}
            initial={{ scale: 1.08, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display font-extrabold text-5xl sm:text-6xl tracking-tighter text-[#f2efeb] leading-none select-none"
          >
            {win.toFixed(0)}%
          </motion.div>
          {odds.tieRate !== undefined && odds.tieRate > 0 && (
            <span className="text-xs font-mono text-[#f2efeb]/60">
              (Ничья: {odds.tieRate.toFixed(0)}%)
            </span>
          )}
        </div>
        <div className="label mt-1">Вероятность победы</div>
      </div>

      {/* Progress track & bar */}
      <div className="h-1 w-full bg-[rgba(242,239,235,0.1)] my-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${win}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`h-full ${win >= 60 ? 'bg-[#ffdb58]' : win >= 35 ? 'bg-[#ffdb58]' : 'bg-rose-500'}`}
        />
      </div>

      {/* Headline & Subtext */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-[#f2efeb] font-sans">
          {odds.headline}
        </div>
        <p className="text-xs text-[#f2efeb]/70 mt-0.5 leading-relaxed font-sans">
          {odds.subtext}
        </p>
      </div>

      {/* Tactical Factors in Space Mono */}
      {!compact && odds.factors && odds.factors.length > 0 && (
        <div className="pt-3 border-t border-[rgba(242,239,235,0.1)] grid grid-cols-2 gap-3">
          {odds.factors.map((f, i) => (
            <div key={i} className="flex flex-col">
              <span className="label truncate">{f.label}</span>
              <span
                className={`font-mono font-bold text-xs sm:text-sm mt-0.5 truncate ${
                  f.positive ? 'text-[#4ade80]' : 'text-[#f2efeb]'
                }`}
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
