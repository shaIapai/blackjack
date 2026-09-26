import { Card, Rank } from '../../types/cards';
import { createFullDeck, shuffleDeck } from '../../utils/deck';
import { OddsData } from '../../components/OddsMeter';

export interface BlackjackState {
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  playerScore: number;
  dealerScore: number;
  dealerRevealed: boolean;
  gameStatus: 'betting' | 'playing' | 'dealerTurn' | 'gameOver';
  outcome: 'in_progress' | 'player_win' | 'dealer_win' | 'push' | 'player_blackjack' | 'player_bust' | 'dealer_bust';
  bet: number;
  message: string;
}

export function getCardBlackjackValue(rank: Rank): number[] {
  if (['J', 'Q', 'K'].includes(rank)) return [10];
  if (rank === 'A') return [1, 11];
  return [parseInt(rank, 10)];
}

export function calculateHandScore(cards: Card[]): { score: number; isSoft: boolean; isBlackjack: boolean } {
  let aces = 0;
  let total = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank, 10);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  const isSoft = aces > 0;
  const isBlackjack = cards.length === 2 && total === 21;

  return { score: total, isSoft, isBlackjack };
}

/**
 * Calculates real-time mathematical odds for the player in Blackjack
 */
export function calculateBlackjackOdds(
  playerCards: Card[],
  dealerCards: Card[],
  remainingDeck: Card[]
): OddsData {
  if (playerCards.length === 0) {
    return {
      winRate: 48.5,
      tensionLevel: 'low',
      headline: 'Сделайте вашу ставку',
      subtext: 'Классическое преимущество казино: 1.5%',
      factors: [
        { label: 'Базовый шанс', value: '48.5%' },
        { label: 'Выплата Блэкджек', value: '3 к 2' },
        { label: 'Колода', value: '52 карты' },
      ],
    };
  }

  const playerScoreInfo = calculateHandScore(playerCards);
  const playerScore = playerScoreInfo.score;

  // 1. Calculate Bust Probability if player takes 1 more card
  let bustCount = 0;
  const deckSize = remainingDeck.length > 0 ? remainingDeck.length : 40;

  if (playerScore >= 12) {
    for (const card of remainingDeck) {
      const vals = getCardBlackjackValue(card.rank);
      const minVal = vals[0];
      if (playerScore + minVal > 21) {
        bustCount++;
      }
    }
  }

  const bustRate = playerScore >= 21 ? 100 : (bustCount / deckSize) * 100;

  // 2. Dealer upcard analysis
  const dealerUpcard = dealerCards[0];
  let dealerBustProb = 28.0;
  if (dealerUpcard) {
    const r = dealerUpcard.rank;
    if (['4', '5', '6'].includes(r)) dealerBustProb = 42.5;
    else if (['2', '3'].includes(r)) dealerBustProb = 35.8;
    else if (['7', '8', '9'].includes(r)) dealerBustProb = 24.2;
    else if (['10', 'J', 'Q', 'K'].includes(r)) dealerBustProb = 21.4;
    else if (r === 'A') dealerBustProb = 17.0;
  }

  // 3. Overall Win Rate estimation
  let winRate = 50;
  if (playerScore > 21) {
    winRate = 0;
  } else if (playerScoreInfo.isBlackjack) {
    winRate = 96.0;
  } else if (playerScore === 21) {
    winRate = 89.0;
  } else if (playerScore >= 19) {
    winRate = 72.0 + (dealerBustProb / 5);
  } else if (playerScore >= 17) {
    winRate = 52.0 + (dealerBustProb / 4);
  } else if (playerScore >= 13) {
    winRate = 38.0 + (dealerBustProb * 0.4);
  } else {
    // 12 or less: hitting has very little bust risk
    winRate = 46.0;
  }

  // Card counting (Hi-Lo system) to give authentic thrill!
  let runningCount = 0;
  for (const c of [...playerCards, ...dealerCards]) {
    if (['2', '3', '4', '5', '6'].includes(c.rank)) runningCount++;
    else if (['10', 'J', 'Q', 'K', 'A'].includes(c.rank)) runningCount--;
  }

  let tension: OddsData['tensionLevel'] = 'medium';
  if (playerScore >= 14 && playerScore <= 16) {
    tension = 'extreme';
  } else if (playerScore >= 17 || bustRate > 50) {
    tension = 'high';
  } else {
    tension = 'low';
  }

  return {
    winRate: Math.max(0, Math.min(100, winRate)),
    tensionLevel: tension,
    headline: playerScore > 21 ? 'Перебор!' : playerScore === 21 ? '21 Очко!' : `Очки руки: ${playerScore}`,
    subtext: playerScore >= 12 && playerScore < 21 ? `Риск перебора при доборе: ${bustRate.toFixed(1)}%` : 'Стабильная позиция',
    factors: [
      { label: 'Шанс перебора дилера', value: `${dealerBustProb.toFixed(1)}%`, positive: dealerBustProb > 30 },
      { label: 'Риск сгореть при +1 карте', value: `${bustRate.toFixed(1)}%`, positive: bustRate < 35 },
      { label: 'Индекс счёта (Hi-Lo)', value: runningCount > 0 ? `+${runningCount}` : `${runningCount}`, positive: runningCount > 0 },
    ],
  };
}
