import React from 'react';
import { Card, Suit } from '../types/cards';
import { SUIT_SYMBOLS, isRedSuit, getRankDisplayName } from '../utils/deck';
import { motion } from 'motion/react';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  hidden?: boolean;
  rotate?: number;
  className?: string;
  glow?: 'gold' | 'green' | 'red' | 'none';
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  onClick,
  selected = false,
  playable = false,
  disabled = false,
  size = 'md',
  hidden = false,
  rotate = 0,
  className = '',
  glow = 'none',
}) => {
  const isRed = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];
  const rankLabel = getRankDisplayName(card.rank);

  const sizeClasses = {
    sm: 'w-14 h-20 text-xs rounded-[2px]',
    md: 'w-20 h-28 text-sm rounded-[2px] sm:w-24 sm:h-34 sm:text-base',
    lg: 'w-26 h-36 text-base rounded-[3px] sm:w-30 sm:h-42 sm:text-lg',
  }[size];

  const glowStyles = {
    gold: 'ring-2 ring-[#ffdb58] shadow-[0_0_15px_rgba(255,219,88,0.6)]',
    green: 'ring-2 ring-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.5)]',
    red: 'ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
    none: '',
  }[glow];

  if (hidden || !card.faceUp) {
    return (
      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`relative select-none shrink-0 ${sizeClasses} ${glowStyles} bg-[#1a1a1c] border-[1.5px] border-[#f2efeb] shadow-xl overflow-hidden cursor-default ${className}`}
      >
        {/* Card back graphic pattern */}
        <div className="absolute inset-1 border border-[rgba(242,239,235,0.2)] rounded-[2px] flex items-center justify-center p-1 overflow-hidden">
          <div className="w-full h-full border border-dashed border-[rgba(255,219,88,0.3)] rounded-[1px] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(#ffdb58_1px,transparent_1px)] [background-size:8px_8px] opacity-20" />
            <div className="w-8 h-8 rounded-full border border-[#ffdb58]/50 flex items-center justify-center text-[#ffdb58] font-mono text-xs font-bold">
              ♠
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0, y: 15 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: selected ? -18 : 0, 
        rotate,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      }}
      whileHover={playable && !disabled ? { y: selected ? -22 : -8, scale: 1.04 } : undefined}
      whileTap={playable && !disabled ? { scale: 0.97 } : undefined}
      onClick={() => {
        if (playable && !disabled && onClick) {
          onClick();
        }
      }}
      className={`relative select-none shrink-0 ${sizeClasses} ${glowStyles} ${
        isRed ? 'text-red-600' : 'text-[#111113]'
      } bg-[#fcfbfa] border-[1.5px] ${
        selected ? 'border-[#ffdb58] ring-2 ring-[#ffdb58] shadow-2xl' : 'border-[#111113] shadow-md'
      } ${
        playable && !disabled ? 'cursor-pointer hover:border-[#ffdb58] hover:shadow-[0_0_12px_rgba(255,219,88,0.4)]' : ''
      } ${
        disabled ? 'opacity-60 filter grayscale-[40%] cursor-not-allowed' : ''
      } transition-all duration-150 overflow-hidden ${className}`}
    >
      {/* Top Left Indicator */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none pointer-events-none font-mono">
        <span className="font-bold text-xs sm:text-sm tracking-tighter">{rankLabel}</span>
        <span className="text-xs sm:text-sm leading-none mt-0.5">{symbol}</span>
      </div>

      {/* Center Motif / Big Suit or Court Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {['J', 'Q', 'K'].includes(card.rank) ? (
          <div className="flex flex-col items-center opacity-90">
            <span className="text-xl sm:text-2xl font-display font-black text-neutral-900">
              {card.rank === 'J' ? '⚔' : card.rank === 'Q' ? '♕' : '♔'}
            </span>
            <span className="text-[10px] font-mono text-neutral-600 mt-0.5">{symbol}</span>
          </div>
        ) : card.rank === 'A' ? (
          <span className="text-3xl sm:text-4xl opacity-95 drop-shadow-sm font-serif">
            {symbol}
          </span>
        ) : (
          <div className="flex flex-col items-center justify-center opacity-90">
            <span className="text-2xl sm:text-3xl">{symbol}</span>
          </div>
        )}
      </div>

      {/* Bottom Right Indicator (Rotated 180) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 pointer-events-none font-mono">
        <span className="font-bold text-xs sm:text-sm tracking-tighter">{rankLabel}</span>
        <span className="text-xs sm:text-sm leading-none mt-0.5">{symbol}</span>
      </div>

      {/* Thin inner border */}
      <div className="absolute inset-0.5 border border-black/5 rounded-[1px] pointer-events-none" />
    </motion.div>
  );
};
