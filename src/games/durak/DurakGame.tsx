import React, { useState, useEffect } from 'react';
import { Card, Suit } from '../../types/cards';
import { createDurakDeck, SUIT_SYMBOLS, SUIT_NAMES_RU, RANK_VALUE_DURAK } from '../../utils/deck';
import { CardView } from '../../components/CardView';
import { OddsMeter } from '../../components/OddsMeter';
import { TablePair, canBeatCard, canTossCard, calculateDurakOdds } from './DurakEngine';
import { sound } from '../../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Swords, RotateCcw, AlertCircle, ArrowDown } from 'lucide-react';

interface DurakGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number, delta: number, game: 'durak') => void;
}

export const DurakGame: React.FC<DurakGameProps> = ({ balance, onUpdateBalance }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [trumpCard, setTrumpCard] = useState<Card | null>(null);
  const [trumpSuit, setTrumpSuit] = useState<Suit>('spades');

  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [botHand, setBotHand] = useState<Card[]>([]);
  const [table, setTable] = useState<TablePair[]>([]);

  const [isPlayerAttacker, setIsPlayerAttacker] = useState<boolean>(true);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [gameResult, setGameResult] = useState<string>('');
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [matchBet, setMatchBet] = useState<number>(50);

  // Dynamic live odds
  const odds = calculateDurakOdds(
    playerHand,
    botHand,
    deck.length,
    trumpSuit,
    table,
    isPlayerAttacker
  );

  // Start new match
  const startMatch = () => {
    if (balance < matchBet) return;

    sound.playChips();
    const newDeck = createDurakDeck();

    // Last card in deck is the trump card
    const trump = newDeck[0]; // bottom of deck
    setTrumpCard(trump);
    setTrumpSuit(trump.suit);

    // Deal 6 cards to player and 6 to bot
    const pHand: Card[] = [];
    const bHand: Card[] = [];

    for (let i = 0; i < 6; i++) {
      pHand.push(newDeck.pop()!);
      bHand.push(newDeck.pop()!);
    }

    // Determine who has the lowest trump card to start first
    let playerLowestTrump = 99;
    let botLowestTrump = 99;

    pHand.forEach((c) => {
      if (c.suit === trump.suit) {
        playerLowestTrump = Math.min(playerLowestTrump, RANK_VALUE_DURAK[c.rank]);
      }
    });

    bHand.forEach((c) => {
      if (c.suit === trump.suit) {
        botLowestTrump = Math.min(botLowestTrump, RANK_VALUE_DURAK[c.rank]);
      }
    });

    const playerStarts = playerLowestTrump <= botLowestTrump;

    setDeck(newDeck);
    setPlayerHand(sortHand(pHand, trump.suit));
    setBotHand(bHand);
    setTable([]);
    setIsPlayerAttacker(playerStarts);
    setGameActive(true);
    setGameResult('');
    setStatusMessage(
      playerStarts
        ? 'Вы ходите первым (младший козырь). Выберите карту для атаки.'
        : 'Бот ходит первым (младший козырь). Ожидание атаки...'
    );

    sound.playCardDeal();

    if (!playerStarts) {
      setTimeout(() => {
        botAttack(bHand, [], newDeck, trump.suit, pHand);
      }, 900);
    }
  };

  // Helper to sort player hand ergonomically (non-trumps first by rank, trumps at the end)
  const sortHand = (hand: Card[], trump: Suit): Card[] => {
    return [...hand].sort((a, b) => {
      if (a.suit === trump && b.suit !== trump) return 1;
      if (a.suit !== trump && b.suit === trump) return -1;
      if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
      return RANK_VALUE_DURAK[a.rank] - RANK_VALUE_DURAK[b.rank];
    });
  };

  // Refill hands from deck
  const refillHands = (
    currentPHand: Card[],
    currentBHand: Card[],
    currentDeck: Card[],
    attackerIsPlayer: boolean,
    tCard: Card | null
  ) => {
    let d = [...currentDeck];
    let p = [...currentPHand];
    let b = [...currentBHand];

    const drawCard = (): Card | null => {
      if (d.length > 0) return d.pop()!;
      if (tCard) {
        const last = tCard;
        setTrumpCard(null); // trump taken
        return last;
      }
      return null;
    };

    if (attackerIsPlayer) {
      // Attacker draws first up to 6
      while (p.length < 6) {
        const card = drawCard();
        if (!card) break;
        p.push(card);
      }
      // Defender draws up to 6
      while (b.length < 6) {
        const card = drawCard();
        if (!card) break;
        b.push(card);
      }
    } else {
      // Bot was attacker
      while (b.length < 6) {
        const card = drawCard();
        if (!card) break;
        b.push(card);
      }
      while (p.length < 6) {
        const card = drawCard();
        if (!card) break;
        p.push(card);
      }
    }

    setDeck(d);
    setPlayerHand(sortHand(p, trumpSuit));
    setBotHand(b);

    // Check game over
    if (d.length === 0 && !trumpCard) {
      if (p.length === 0 && b.length === 0) {
        endGame('draw');
        return;
      } else if (p.length === 0) {
        endGame('player_win');
        return;
      } else if (b.length === 0) {
        endGame('bot_win');
        return;
      }
    }
  };

  // Bot attacks player
  const botAttack = (
    bHand: Card[],
    curTable: TablePair[],
    curDeck: Card[],
    tSuit: Suit,
    pHand: Card[]
  ) => {
    setIsBotThinking(true);
    setTimeout(() => {
      setIsBotThinking(false);

      if (curTable.length === 0) {
        // First card of attack: choose lowest non-trump, or lowest trump
        const nonTrumps = bHand.filter((c) => c.suit !== tSuit);
        const candidates = nonTrumps.length > 0 ? nonTrumps : bHand;
        candidates.sort((a, b) => RANK_VALUE_DURAK[a.rank] - RANK_VALUE_DURAK[b.rank]);

        const attackCard = candidates[0];
        const newBHand = bHand.filter((c) => c.id !== attackCard.id);
        const newTable = [{ attackCard }];

        sound.playCardDeal();
        setBotHand(newBHand);
        setTable(newTable);
        setStatusMessage(`Бот атакует картой: ${attackCard.rank} ${SUIT_SYMBOLS[attackCard.suit]}. Покройте её!`);
      } else {
        // Tossing more cards if possible
        const possibleTosses = bHand.filter((c) => canTossCard(c, curTable) && c.suit !== tSuit);
        if (possibleTosses.length > 0 && curTable.length < 6 && curTable.length < pHand.length) {
          possibleTosses.sort((a, b) => RANK_VALUE_DURAK[a.rank] - RANK_VALUE_DURAK[b.rank]);
          const tossCard = possibleTosses[0];
          const newBHand = bHand.filter((c) => c.id !== tossCard.id);
          const newTable = [...curTable, { attackCard: tossCard }];

          sound.playCardDeal();
          setBotHand(newBHand);
          setTable(newTable);
          setStatusMessage(`Бот подкидывает: ${tossCard.rank} ${SUIT_SYMBOLS[tossCard.suit]}.`);
        } else {
          // Bot cannot or chooses not to toss more -> Bito!
          handleBito(curTable, bHand, pHand, curDeck, false);
        }
      }
    }, 700);
  };

  // Bot defends against player's card
  const botDefend = (
    curTable: TablePair[],
    bHand: Card[],
    curDeck: Card[],
    tSuit: Suit,
    pHand: Card[]
  ) => {
    setIsBotThinking(true);
    setTimeout(() => {
      setIsBotThinking(false);

      // Find the last unbeaten pair
      const unbeatenIdx = curTable.findIndex((p) => !p.defendCard);
      if (unbeatenIdx === -1) return;

      const attackCard = curTable[unbeatenIdx].attackCard;
      // Valid defending cards in bot hand
      const validDefenders = bHand.filter((c) => canBeatCard(attackCard, c, tSuit));

      if (validDefenders.length > 0) {
        // Prefer beating with lowest non-trump, then lowest trump
        validDefenders.sort((a, b) => {
          if (a.suit === tSuit && b.suit !== tSuit) return 1;
          if (a.suit !== tSuit && b.suit === tSuit) return -1;
          return RANK_VALUE_DURAK[a.rank] - RANK_VALUE_DURAK[b.rank];
        });

        const defendCard = validDefenders[0];
        const newBHand = bHand.filter((c) => c.id !== defendCard.id);
        const newTable = [...curTable];
        newTable[unbeatenIdx] = { attackCard, defendCard };

        sound.playCardFlip();
        setBotHand(newBHand);
        setTable(newTable);
        setStatusMessage(`Бот покрыл: ${defendCard.rank} ${SUIT_SYMBOLS[defendCard.suit]}. Вы можете подкинуть или сказать «Бито».`);
      } else {
        // Bot cannot beat -> Takes all cards
        sound.playLose();
        const cardsToTake: Card[] = [];
        curTable.forEach((p) => {
          cardsToTake.push(p.attackCard);
          if (p.defendCard) cardsToTake.push(p.defendCard);
        });

        const newBHand = [...bHand, ...cardsToTake];
        setTable([]);
        setStatusMessage('Бот не смог отбиться и взял карты! Вы снова атакуете.');
        refillHands(pHand, newBHand, curDeck, true, trumpCard);
        setIsPlayerAttacker(true);
      }
    }, 800);
  };

  // Player plays a card
  const handlePlayCard = (card: Card) => {
    if (isBotThinking) return;

    if (isPlayerAttacker) {
      // Player is attacking or tossing
      if (table.length > 0 && !canTossCard(card, table)) {
        sound.playLose();
        setStatusMessage('Можно подкидывать только карты того же достоинства, что уже есть на столе!');
        return;
      }

      if (table.length >= 6 || table.length >= botHand.length) {
        setStatusMessage('Нельзя положить больше карт, чем на руках у защищающегося!');
        return;
      }

      sound.playCardDeal();
      const newPHand = playerHand.filter((c) => c.id !== card.id);
      const newTable = [...table, { attackCard: card }];
      setPlayerHand(newPHand);
      setTable(newTable);
      setStatusMessage(`Вы сыграли: ${card.rank} ${SUIT_SYMBOLS[card.suit]}. Бот защищается...`);

      // Trigger bot defense
      botDefend(newTable, botHand, deck, trumpSuit, newPHand);
    } else {
      // Player is defending against bot's attack
      const unbeatenIdx = table.findIndex((p) => !p.defendCard);
      if (unbeatenIdx === -1) return;

      const attackCard = table[unbeatenIdx].attackCard;
      if (!canBeatCard(attackCard, card, trumpSuit)) {
        sound.playLose();
        setStatusMessage('Эта карта не бьёт карту атаки!');
        return;
      }

      sound.playCardFlip();
      const newPHand = playerHand.filter((c) => c.id !== card.id);
      const newTable = [...table];
      newTable[unbeatenIdx] = { attackCard, defendCard: card };
      setPlayerHand(newPHand);
      setTable(newTable);
      setStatusMessage(`Вы отбились: ${card.rank} ${SUIT_SYMBOLS[card.suit]}. Ожидание хода бота...`);

      // Bot decides if it wants to toss more cards or pass
      botAttack(botHand, newTable, deck, trumpSuit, newPHand);
    }
  };

  // Player action: "Бито" (Pass when attacking)
  const handlePlayerBito = () => {
    if (!isPlayerAttacker || table.length === 0) return;
    const allBeaten = table.every((p) => p.defendCard);
    if (!allBeaten) {
      setStatusMessage('Нельзя объявить «Бито», пока на столе есть непокрытые карты!');
      return;
    }

    handleBito(table, botHand, playerHand, deck, true);
  };

  // Generic Bito handler
  const handleBito = (
    curTable: TablePair[],
    bHand: Card[],
    pHand: Card[],
    curDeck: Card[],
    playerWasAttacker: boolean
  ) => {
    sound.playChips();
    setTable([]);

    if (playerWasAttacker) {
      // Defender (Bot) becomes new attacker
      setStatusMessage('Бито! Стол очищен в отбой. Ход переходит к боту.');
      setIsPlayerAttacker(false);
      refillHands(pHand, bHand, curDeck, true, trumpCard);

      setTimeout(() => {
        botAttack(bHand, [], curDeck, trumpSuit, pHand);
      }, 900);
    } else {
      // Player defended successfully! Player becomes new attacker
      setStatusMessage('Бито! Вы успешно отбились! Теперь ваш ход для атаки.');
      setIsPlayerAttacker(true);
      refillHands(pHand, bHand, curDeck, false, trumpCard);
    }
  };

  // Player action: "Взять" (Take when defending)
  const handlePlayerTake = () => {
    if (isPlayerAttacker || table.length === 0) return;

    sound.playLose();
    const cardsToTake: Card[] = [];
    table.forEach((p) => {
      cardsToTake.push(p.attackCard);
      if (p.defendCard) cardsToTake.push(p.defendCard);
    });

    const newPHand = sortHand([...playerHand, ...cardsToTake], trumpSuit);
    setPlayerHand(newPHand);
    setTable([]);
    setStatusMessage('Вы взяли карты со стола. Бот снова атакует!');
    refillHands(newPHand, botHand, deck, false, trumpCard);
    setIsPlayerAttacker(false);

    setTimeout(() => {
      botAttack(botHand, [], deck, trumpSuit, newPHand);
    }, 800);
  };

  const endGame = (outcome: 'player_win' | 'bot_win' | 'draw') => {
    setGameActive(false);
    if (outcome === 'player_win') {
      sound.playWin();
      setGameResult(`ПОБЕДА! Бот остался в дураках! Вы выиграли +${matchBet * 2} 🪙!`);
      onUpdateBalance(balance + matchBet, matchBet, 'durak');
    } else if (outcome === 'bot_win') {
      sound.playLose();
      setGameResult('Вы остались в дураках! Попробуйте отыграться в следующем раунде.');
      onUpdateBalance(balance - matchBet, -matchBet, 'durak');
    } else {
      sound.playChips();
      setGameResult('Ничья! Оба игрока одновременно сбросили карты.');
    }
  };

  // Determine if card in player's hand is currently playable
  const isCardPlayable = (card: Card): boolean => {
    if (!gameActive || isBotThinking) return false;
    if (isPlayerAttacker) {
      if (table.length === 0) return true;
      return canTossCard(card, table);
    } else {
      const unbeaten = table.find((p) => !p.defendCard);
      if (!unbeaten) return false;
      return canBeatCard(unbeaten.attackCard, card, trumpSuit);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
      {/* 2-Column Grid: Sidebar + Felt Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 w-full">
        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <OddsMeter odds={odds} />

          <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5 flex flex-col justify-between flex-1">
            <div>
              <div className="label mb-2">Партия: Дурак</div>
              <div className="text-xs text-[#f2efeb]/70 leading-relaxed font-sans">
                Классический подкидной дурак на 36 карт. Козырная масть:{' '}
                <span className="font-bold text-[#ffdb58]">
                  {SUIT_SYMBOLS[trumpSuit]} {SUIT_NAMES_RU[trumpSuit]}
                </span>
                .
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(242,239,235,0.1)] flex items-center justify-between text-xs font-mono">
              <span className="text-[#f2efeb]/50">В колоде:</span>
              <span className="text-[#ffdb58] font-bold">
                {deck.length + (trumpCard ? 1 : 0)} карт
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Game Felt + Controls */}
        <div className="flex flex-col gap-5">
          {/* Game Area Felt */}
          <div className="game-felt min-h-[460px] p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl">
            {/* Top: Opponent Area */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="label">
                  Бот-Соперник · {botHand.length} карт
                </span>
                {!isPlayerAttacker && gameActive && (
                  <span className="label text-rose-400 opacity-100">[ Атакует ]</span>
                )}
              </div>

              {/* Bot cards fan */}
              <div className="flex items-center justify-center -space-x-3 sm:-space-x-5 overflow-hidden py-1 max-w-full min-h-[70px]">
                {botHand.length === 0 ? (
                  <div className="text-xs text-[#f2efeb]/30 italic font-mono">
                    Нет карт
                  </div>
                ) : (
                  botHand.map((c, i) => (
                    <CardView
                      key={c.id}
                      card={c}
                      hidden={true}
                      size="sm"
                      rotate={(i - botHand.length / 2) * 2.5}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Center: Trump Deck and Battle Table */}
            <div className="my-4 flex flex-col md:flex-row items-center justify-between gap-6 px-2">
              {/* Deck & Trump Stack */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-20 h-28 flex items-center justify-center">
                  {trumpCard && (
                    <div className="absolute transform rotate-90 translate-x-3 translate-y-1 shadow-md">
                      <CardView card={trumpCard} size="sm" />
                    </div>
                  )}

                  {deck.length > 0 ? (
                    <div className="relative shadow-xl">
                      <CardView
                        card={deck[deck.length - 1]}
                        hidden={true}
                        size="sm"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-[#111113] border border-[#ffdb58] text-[#ffdb58] font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[1px]">
                        {deck.length + (trumpCard ? 1 : 0)}
                      </div>
                    </div>
                  ) : trumpCard ? (
                    <div className="text-[10px] font-mono text-[#ffdb58] border border-dashed border-[#ffdb58]/40 p-2 text-center">
                      Последний козырь
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#f2efeb]/30 w-20 h-28 flex items-center justify-center text-[10px] font-mono text-[#f2efeb]/40 text-center p-2">
                      Колода пуста
                    </div>
                  )}
                </div>

                <div className="text-left">
                  <div className="label">Козырь</div>
                  <div className="text-xl sm:text-2xl font-display font-bold text-[#ffdb58]">
                    {SUIT_SYMBOLS[trumpSuit]} {SUIT_NAMES_RU[trumpSuit]}
                  </div>
                </div>
              </div>

              {/* Table Battle Zone */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-[140px]">
                {table.length === 0 ? (
                  <div className="w-full border border-dashed border-[rgba(242,239,235,0.15)] p-6 sm:p-8 text-center text-[#f2efeb]/40 text-xs font-mono">
                    {gameActive ? (
                      isPlayerAttacker ? (
                        <span className="text-[#4ade80]">
                          [ Сделайте первый ход картой из вашей руки ]
                        </span>
                      ) : (
                        <span>[ Ожидание атаки соперника... ]</span>
                      )
                    ) : (
                      <span>Начните партию кнопкой внизу</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
                    {table.map((pair, idx) => (
                      <div key={idx} className="relative w-16 h-24 sm:w-20 sm:h-28">
                        <div className="absolute inset-0">
                          <CardView card={pair.attackCard} size="sm" />
                        </div>
                        {pair.defendCard ? (
                          <div className="absolute inset-0 translate-x-2.5 translate-y-3 sm:translate-x-3.5 sm:translate-y-4 shadow-xl">
                            <CardView card={pair.defendCard} size="sm" glow="gold" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 translate-x-2.5 translate-y-3 sm:translate-x-3.5 sm:translate-y-4 border border-dashed border-[#ffdb58] bg-[#111113]/60 flex items-center justify-center text-[10px] font-mono text-[#ffdb58] font-bold">
                            БЕЙ
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notification / Message */}
            <div className="my-1 flex flex-col items-center justify-center min-h-[30px]">
              <AnimatePresence mode="wait">
                {gameResult ? (
                  <motion.div
                    key={gameResult}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#111113] border border-[#ffdb58] px-4 py-2 text-[#ffdb58] font-display font-bold text-xs sm:text-sm text-center shadow-xl"
                  >
                    {gameResult}
                  </motion.div>
                ) : (
                  <div className="text-xs font-mono text-[#f2efeb]/80 bg-[#111113]/80 border border-[rgba(242,239,235,0.15)] px-3 py-1 flex items-center gap-2">
                    {isBotThinking && <span className="animate-spin text-[#ffdb58]">⏳</span>}
                    <span>{statusMessage}</span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom: Player Area */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="label">
                  Ваши Карты ({playerHand.length})
                </span>
                {isPlayerAttacker && gameActive && (
                  <span className="label text-[#4ade80] opacity-100">[ Вы атакуете ]</span>
                )}
              </div>

              {/* Player hand */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 max-w-full px-2">
                {playerHand.length === 0 ? (
                  <div className="text-xs text-[#f2efeb]/30 italic font-mono">
                    Нет карт
                  </div>
                ) : (
                  playerHand.map((c) => {
                    const playable = isCardPlayable(c);
                    return (
                      <CardView
                        key={c.id}
                        card={c}
                        playable={playable}
                        disabled={!playable}
                        onClick={() => handlePlayCard(c)}
                        size="md"
                        glow={c.suit === trumpSuit ? 'gold' : 'none'}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls Panel */}
          <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            {!gameActive ? (
              <>
                <div>
                  <span className="label">Ставка на игру</span>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {[25, 50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          sound.playChips();
                          setMatchBet(amt);
                        }}
                        className={`px-3 py-2 text-xs font-mono transition-all border ${
                          matchBet === amt
                            ? 'bg-[#f2efeb] text-[#111113] border-[#f2efeb] font-bold'
                            : 'bg-transparent text-[#f2efeb] border-[rgba(242,239,235,0.15)] hover:border-[#f2efeb]'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startMatch}
                  disabled={balance < matchBet}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  Начать партию ({matchBet} 🪙)
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {isPlayerAttacker ? (
                    <button
                      onClick={handlePlayerBito}
                      disabled={table.length === 0 || !table.every((p) => p.defendCard)}
                      className="px-6 py-3 bg-[#f2efeb] text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Бито (Отбой)</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePlayerTake}
                      disabled={table.length === 0}
                      className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-display font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span>Взять карты</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono text-[#f2efeb]/60">
                  {isPlayerAttacker
                    ? '[ Нажмите на карту, чтобы подкинуть или начните отбой ]'
                    : '[ Нажмите на карту подходящей масти или козырь, чтобы отбиться ]'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
