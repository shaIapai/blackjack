import { Card, Rank, Suit } from '../../types/cards';
import { createDurakDeck, RANK_VALUE_DURAK } from '../../utils/deck';
import { OddsData } from '../../components/OddsMeter';

export interface TablePair {
  attackCard: Card;
  defendCard?: Card;
}

export function canBeatCard(attackCard: Card, defendCard: Card, trumpSuit: Suit): boolean {
  // If attack card is trump, defender must play higher trump
  if (attackCard.suit === trumpSuit) {
    if (defendCard.suit === trumpSuit) {
      return RANK_VALUE_DURAK[defendCard.rank] > RANK_VALUE_DURAK[attackCard.rank];
    }
    return false;
  }

  // If attack card is not trump:
  // Defender can beat with higher card of same suit OR any trump
  if (defendCard.suit === attackCard.suit) {
    return RANK_VALUE_DURAK[defendCard.rank] > RANK_VALUE_DURAK[attackCard.rank];
  }

  if (defendCard.suit === trumpSuit) {
    return true;
  }

  return false;
}

export function canTossCard(card: Card, table: TablePair[]): boolean {
  if (table.length === 0) return true;
  const ranksOnTable = new Set<Rank>();
  for (const pair of table) {
    ranksOnTable.add(pair.attackCard.rank);
    if (pair.defendCard) {
      ranksOnTable.add(pair.defendCard.rank);
    }
  }
  return ranksOnTable.has(card.rank);
}

/**
 * Calculates dynamic live win expectancy in Durak
 */
export function calculateDurakOdds(
  playerHand: Card[],
  botHand: Card[],
  deckCount: number,
  trumpSuit: Suit,
  table: TablePair[],
  isPlayerAttacker: boolean
): OddsData {
  if (playerHand.length === 0 && deckCount === 0) {
    return {
      winRate: 100,
      tensionLevel: 'low',
      headline: 'Чистая победа!',
      subtext: 'Вы вышли из игры без карт',
      factors: [
        { label: 'Статус', value: 'Победитель', positive: true },
        { label: 'Карты в руке', value: '0' },
      ],
    };
  }

  if (botHand.length === 0 && deckCount === 0) {
    return {
      winRate: 0,
      tensionLevel: 'low',
      headline: 'Вы остались в дураках',
      subtext: 'Бот первым избавился от карт',
      factors: [
        { label: 'Статус', value: 'Дурак', positive: false },
        { label: 'Карты в руке', value: `${playerHand.length}` },
      ],
    };
  }

  // Count player trumps and high cards
  let playerTrumps = 0;
  let playerTrumpPower = 0;
  let playerHighCards = 0;

  for (const c of playerHand) {
    if (c.suit === trumpSuit) {
      playerTrumps++;
      playerTrumpPower += RANK_VALUE_DURAK[c.rank];
    } else if (['J', 'Q', 'K', 'A'].includes(c.rank)) {
      playerHighCards++;
    }
  }

  // Count bot cards remaining vs player cards
  const handDiff = botHand.length - playerHand.length; // positive is good for player

  // Calculate base score
  let score = 50;

  // Hand difference factor
  score += handDiff * 6;

  // Trump advantage
  score += playerTrumps * 7;
  if (playerHand.some(c => c.suit === trumpSuit && c.rank === 'A')) {
    score += 8; // Trump Ace is invincible
  }

  // High cards
  score += playerHighCards * 2;

  // Table tension
  const unbeatenCards = table.filter(p => !p.defendCard).length;
  if (isPlayerAttacker) {
    score += 4; // Attacker has initiative
  } else {
    // If defending and many unbeaten cards, stress rises
    score -= unbeatenCards * 4;
  }

  // Deck depth weighting: in endgame (deck empty), hand diff and trumps matter 2x more
  if (deckCount === 0) {
    score = 50 + (handDiff * 12) + (playerTrumps * 14) + (playerTrumpPower * 0.5);
  }

  const winRate = Math.max(5, Math.min(95, score));

  let tension: OddsData['tensionLevel'] = 'medium';
  if (deckCount <= 4 && Math.abs(handDiff) <= 1) {
    tension = 'extreme';
  } else if (unbeatenCards >= 2 || Math.abs(winRate - 50) < 15) {
    tension = 'high';
  } else {
    tension = 'low';
  }

  return {
    winRate,
    tensionLevel: tension,
    headline: winRate > 65 ? 'Преимущество по козырям' : winRate < 35 ? 'Опасная оборона' : 'Равный бой',
    subtext: `Козырей на руках: ${playerTrumps} · В колоде осталось: ${deckCount}`,
    factors: [
      { label: 'Козырей в руке', value: `${playerTrumps} шт.`, positive: playerTrumps >= 2 },
      { label: 'Карт у соперника', value: `${botHand.length} шт.` },
      { label: 'Инициатива', value: isPlayerAttacker ? 'Ваша атака' : 'Оборона', positive: isPlayerAttacker },
    ],
  };
}
