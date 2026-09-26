export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp?: boolean;
}

export type GameMode = 'durak' | 'poker' | 'blackjack';

export interface PlayerStats {
  balance: number;
  totalGames: number;
  totalWins: number;
  durakWins: number;
  durakGames: number;
  pokerWins: number;
  pokerGames: number;
  blackjackWins: number;
  blackjackGames: number;
  biggestWin: number;
}
