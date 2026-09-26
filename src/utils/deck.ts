import { Card, Rank, Suit } from '../types/cards';

export const ALL_SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const FULL_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const DURAK_RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_NAMES_RU: Record<Suit, string> = {
  spades: 'Пики',
  hearts: 'Червы',
  diamonds: 'Бубны',
  clubs: 'Трефы',
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function createFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of FULL_RANKS) {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 7)}`,
        suit,
        rank,
        faceUp: true,
      });
    }
  }
  return shuffleDeck(deck);
}

export function createDurakDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of DURAK_RANKS) {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 7)}`,
        suit,
        rank,
        faceUp: true,
      });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const RANK_VALUE_DURAK: Record<Rank, number> = {
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
};

export const RANK_VALUE_POKER: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export function getRankDisplayName(rank: Rank): string {
  switch (rank) {
    case 'J': return 'В';
    case 'Q': return 'Д';
    case 'K': return 'К';
    case 'A': return 'Т';
    default: return rank;
  }
}
