import { Card, Rank, Suit } from '../../types/cards';
import { RANK_VALUE_POKER, ALL_SUITS } from '../../utils/deck';
import { OddsData } from '../../components/OddsMeter';

export type PokerHandRank =
  | 'HIGH_CARD'
  | 'PAIR'
  | 'TWO_PAIR'
  | 'THREE_OF_A_KIND'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'STRAIGHT_FLUSH'
  | 'ROYAL_FLUSH';

export interface EvaluatedHand {
  rank: PokerHandRank;
  score: number;
  nameRu: string;
  bestFive: Card[];
}

export const HAND_NAMES_RU: Record<PokerHandRank, string> = {
  ROYAL_FLUSH: 'Роял-флеш',
  STRAIGHT_FLUSH: 'Стрит-флеш',
  FOUR_OF_A_KIND: 'Каре',
  FULL_HOUSE: 'Фулл-хаус',
  FLUSH: 'Флеш',
  STRAIGHT: 'Стрит',
  THREE_OF_A_KIND: 'Тройка (Сет)',
  TWO_PAIR: 'Две пары',
  PAIR: 'Пара',
  HIGH_CARD: 'Старшая карта',
};

const HAND_RANK_BASE: Record<PokerHandRank, number> = {
  HIGH_CARD: 1000000,
  PAIR: 2000000,
  TWO_PAIR: 3000000,
  THREE_OF_A_KIND: 4000000,
  STRAIGHT: 5000000,
  FLUSH: 6000000,
  FULL_HOUSE: 7000000,
  FOUR_OF_A_KIND: 8000000,
  STRAIGHT_FLUSH: 9000000,
  ROYAL_FLUSH: 10000000,
};

/**
 * Evaluates the best 5-card poker hand from 5, 6, or 7 cards.
 */
export function evaluatePokerHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    // If fewer than 5 cards (e.g. hole cards only), evaluate based on pair or high card
    if (cards.length === 2 && cards[0].rank === cards[1].rank) {
      return {
        rank: 'PAIR',
        score: HAND_RANK_BASE.PAIR + RANK_VALUE_POKER[cards[0].rank] * 100,
        nameRu: `Карманная пара ${cards[0].rank}`,
        bestFive: cards,
      };
    }
    const high = cards.reduce((acc, c) => Math.max(acc, RANK_VALUE_POKER[c.rank]), 0);
    return {
      rank: 'HIGH_CARD',
      score: HAND_RANK_BASE.HIGH_CARD + high,
      nameRu: 'Старшая карта',
      bestFive: cards,
    };
  }

  // Generate all 5-card combinations if 6 or 7 cards
  const combinations = get5CardCombinations(cards);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combinations) {
    const evalResult = score5Cards(combo);
    if (!bestHand || evalResult.score > bestHand.score) {
      bestHand = evalResult;
    }
  }

  return bestHand!;
}

function get5CardCombinations(cards: Card[]): Card[][] {
  const result: Card[][] = [];
  const n = cards.length;

  if (n === 5) return [cards];

  function combine(start: number, chosen: Card[]) {
    if (chosen.length === 5) {
      result.push([...chosen]);
      return;
    }
    for (let i = start; i < n; i++) {
      chosen.push(cards[i]);
      combine(i + 1, chosen);
      chosen.pop();
    }
  }

  combine(0, []);
  return result;
}

function score5Cards(cards: Card[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => RANK_VALUE_POKER[b.rank] - RANK_VALUE_POKER[a.rank]);
  const values = sorted.map((c) => RANK_VALUE_POKER[c.rank]);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  // Normal straight check
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    // Ace-low straight (A-2-3-4-5)
    isStraight = true;
    straightHigh = 5;
  }

  // Count ranks
  const counts: Record<number, number> = {};
  values.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });

  const countEntries = Object.entries(counts).map(([v, count]) => ({
    val: parseInt(v, 10),
    count,
  }));
  countEntries.sort((a, b) => b.count - a.count || b.val - a.val);

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { rank: 'ROYAL_FLUSH', score: HAND_RANK_BASE.ROYAL_FLUSH, nameRu: HAND_NAMES_RU.ROYAL_FLUSH, bestFive: sorted };
    }
    return {
      rank: 'STRAIGHT_FLUSH',
      score: HAND_RANK_BASE.STRAIGHT_FLUSH + straightHigh,
      nameRu: HAND_NAMES_RU.STRAIGHT_FLUSH,
      bestFive: sorted,
    };
  }

  if (countEntries[0].count === 4) {
    return {
      rank: 'FOUR_OF_A_KIND',
      score: HAND_RANK_BASE.FOUR_OF_A_KIND + countEntries[0].val * 100 + countEntries[1].val,
      nameRu: HAND_NAMES_RU.FOUR_OF_A_KIND,
      bestFive: sorted,
    };
  }

  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    return {
      rank: 'FULL_HOUSE',
      score: HAND_RANK_BASE.FULL_HOUSE + countEntries[0].val * 100 + countEntries[1].val,
      nameRu: HAND_NAMES_RU.FULL_HOUSE,
      bestFive: sorted,
    };
  }

  if (isFlush) {
    const tieBreak = values.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);
    return {
      rank: 'FLUSH',
      score: HAND_RANK_BASE.FLUSH + tieBreak,
      nameRu: HAND_NAMES_RU.FLUSH,
      bestFive: sorted,
    };
  }

  if (isStraight) {
    return {
      rank: 'STRAIGHT',
      score: HAND_RANK_BASE.STRAIGHT + straightHigh,
      nameRu: HAND_NAMES_RU.STRAIGHT,
      bestFive: sorted,
    };
  }

  if (countEntries[0].count === 3) {
    const kickers = countEntries.slice(1).map((e) => e.val);
    return {
      rank: 'THREE_OF_A_KIND',
      score: HAND_RANK_BASE.THREE_OF_A_KIND + countEntries[0].val * 1000 + kickers[0] * 15 + kickers[1],
      nameRu: HAND_NAMES_RU.THREE_OF_A_KIND,
      bestFive: sorted,
    };
  }

  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const highPair = Math.max(countEntries[0].val, countEntries[1].val);
    const lowPair = Math.min(countEntries[0].val, countEntries[1].val);
    const kicker = countEntries[2].val;
    return {
      rank: 'TWO_PAIR',
      score: HAND_RANK_BASE.TWO_PAIR + highPair * 1000 + lowPair * 50 + kicker,
      nameRu: HAND_NAMES_RU.TWO_PAIR,
      bestFive: sorted,
    };
  }

  if (countEntries[0].count === 2) {
    const kickers = countEntries.slice(1).map((e) => e.val);
    return {
      rank: 'PAIR',
      score: HAND_RANK_BASE.PAIR + countEntries[0].val * 10000 + kickers[0] * 100 + kickers[1] * 10 + kickers[2],
      nameRu: HAND_NAMES_RU.PAIR,
      bestFive: sorted,
    };
  }

  const highTie = values.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);
  return {
    rank: 'HIGH_CARD',
    score: HAND_RANK_BASE.HIGH_CARD + highTie,
    nameRu: HAND_NAMES_RU.HIGH_CARD,
    bestFive: sorted,
  };
}

/**
 * Fast Monte Carlo Equity Simulator for Texas Hold'em
 * Evaluates real-time equity (Win / Tie / Lose %) and outs for maximum excitement
 */
export function calculatePokerEquity(
  playerHole: Card[],
  communityCards: Card[],
  botHole: Card[],
  deck: Card[],
  stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown',
  pot: number,
  callAmount: number
): OddsData {
  if (playerHole.length < 2) {
    return {
      winRate: 50,
      tensionLevel: 'low',
      headline: 'Ожидание раздачи',
      subtext: 'Уравновешенные шансы',
      factors: [
        { label: 'Банк', value: `${pot} 🪙` },
        { label: 'Стадия', value: 'Префлоп' },
      ],
    };
  }

  const knownCards = [...playerHole, ...communityCards, ...(stage === 'showdown' ? botHole : [])];
  const remaining = deck.filter((c) => !knownCards.some((k) => k.id === c.id));

  // Current player hand
  const currentHand = evaluatePokerHand([...playerHole, ...communityCards]);

  // If showdown, exact winner calculation
  if (stage === 'showdown') {
    const botHand = evaluatePokerHand([...botHole, ...communityCards]);
    const win = currentHand.score > botHand.score ? 100 : currentHand.score === botHand.score ? 50 : 0;
    return {
      winRate: win,
      tensionLevel: 'low',
      headline: win === 100 ? 'Победа!' : win === 50 ? 'Ничья' : 'Поражение',
      subtext: `${currentHand.nameRu} против ${botHand.nameRu}`,
      factors: [
        { label: 'Ваша комбинация', value: currentHand.nameRu, positive: win === 100 },
        { label: 'Комбинация бота', value: botHand.nameRu },
        { label: 'Банк', value: `${pot} 🪙` },
      ],
    };
  }

  // Monte Carlo simulation with 250 iterations for snappy real-time performance
  let wins = 0;
  let ties = 0;
  const iterations = 250;
  const cardsNeeded = 5 - communityCards.length;

  for (let i = 0; i < iterations; i++) {
    // Shuffle remaining subset
    const simDeck = [...remaining];
    for (let k = simDeck.length - 1; k > 0 && k > simDeck.length - 8; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [simDeck[k], simDeck[j]] = [simDeck[j], simDeck[k]];
    }

    const simBotHole: Card[] = botHole.length === 2 ? botHole : [simDeck.pop()!, simDeck.pop()!];
    const simCommunity = [...communityCards];
    for (let c = 0; c < cardsNeeded; c++) {
      if (simDeck.length > 0) simCommunity.push(simDeck.pop()!);
    }

    const pScore = evaluatePokerHand([...playerHole, ...simCommunity]).score;
    const bScore = evaluatePokerHand([...simBotHole, ...simCommunity]).score;

    if (pScore > bScore) wins++;
    else if (pScore === bScore) ties++;
  }

  const winRate = (wins / iterations) * 100;
  const tieRate = (ties / iterations) * 100;

  // Outs calculation for draws
  let drawInfo = 'Готовая рука';
  if (communityCards.length >= 3 && communityCards.length < 5) {
    const suitsCount: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
    [...playerHole, ...communityCards].forEach((c) => {
      suitsCount[c.suit]++;
    });
    const maxSuitCount = Math.max(...Object.values(suitsCount));
    if (maxSuitCount === 4) {
      drawInfo = 'Флеш-дро (9 аутов)';
    } else if (currentHand.rank === 'HIGH_CARD') {
      drawInfo = 'Поиск совпадений';
    }
  }

  // Tension level based on pot size and win probability volatility
  let tension: OddsData['tensionLevel'] = 'medium';
  if (pot > 400 || (winRate >= 35 && winRate <= 65 && stage !== 'preflop')) {
    tension = 'extreme';
  } else if (winRate < 35 || winRate > 75) {
    tension = 'high';
  } else {
    tension = 'medium';
  }

  // Pot odds calculation
  const potOddsPct = callAmount > 0 ? ((callAmount / (pot + callAmount)) * 100).toFixed(1) : '0';

  return {
    winRate,
    tieRate,
    tensionLevel: tension,
    headline: currentHand.nameRu,
    subtext: `Стадия: ${stage.toUpperCase()} · ${drawInfo}`,
    factors: [
      { label: 'Шансы банка (Pot Odds)', value: `${potOddsPct}%`, positive: winRate > parseFloat(potOddsPct) },
      { label: 'Ауты / Дро', value: drawInfo, positive: drawInfo.includes('дро') },
      { label: 'Банк раздачи', value: `${pot} 🪙` },
    ],
  };
}
