import React, { useState, useEffect } from 'react';
import { Card } from '../../types/cards';
import { createFullDeck } from '../../utils/deck';
import { CardView } from '../../components/CardView';
import { OddsMeter } from '../../components/OddsMeter';
import { evaluatePokerHand, calculatePokerEquity, EvaluatedHand } from './PokerEngine';
import { sound } from '../../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, User, Bot, HelpCircle, Trophy } from 'lucide-react';

interface PokerGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number, delta: number, game: 'poker') => void;
}

interface BotPersona {
  id: string;
  name: string;
  title: string;
  style: string;
  avatar: string;
  bluffRate: number; // 0 to 1
  aggression: number; // 0 to 1
}

const BOTS: BotPersona[] = [
  {
    id: 'bragin',
    name: 'Капитан Брагин',
    title: 'Агрессивный рейзер',
    style: 'Любит давить ставками и часто блефует на тёрне',
    avatar: '⚓',
    bluffRate: 0.35,
    aggression: 0.8,
  },
  {
    id: 'sofia',
    name: 'София Штейн',
    title: 'Тайтовый стратег',
    style: 'Играет строго по шансам банка, почти не рискует вслепую',
    avatar: '🦉',
    bluffRate: 0.1,
    aggression: 0.45,
  },
  {
    id: 'dmitry',
    name: 'Дмитрий Взрывной',
    title: 'Непредсказуемый азартник',
    style: 'Может пойти олл-ин с любой рукой ради куража',
    avatar: '⚡',
    bluffRate: 0.5,
    aggression: 0.9,
  },
];

type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export const PokerGame: React.FC<PokerGameProps> = ({ balance, onUpdateBalance }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHole, setPlayerHole] = useState<Card[]>([]);
  const [botHole, setBotHole] = useState<Card[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [street, setStreet] = useState<Street>('preflop');
  
  const [selectedBot, setSelectedBot] = useState<BotPersona>(BOTS[0]);
  const [pot, setPot] = useState<number>(0);
  const [playerCurrentBet, setPlayerCurrentBet] = useState<number>(0);
  const [botCurrentBet, setBotCurrentBet] = useState<number>(0);
  const [currentCallAmount, setCurrentCallAmount] = useState<number>(0);
  const [raiseAmount, setRaiseAmount] = useState<number>(50);

  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(false);
  const [botMessage, setBotMessage] = useState<string>('');
  const [gameOutcome, setGameOutcome] = useState<string>('');
  const [roundInProgress, setRoundInProgress] = useState<boolean>(false);

  // Big blind and small blind
  const SMALL_BLIND = 10;
  const BIG_BLIND = 20;

  // Real-time odds
  const odds = calculatePokerEquity(
    playerHole,
    communityCards,
    botHole,
    deck,
    street,
    pot,
    currentCallAmount
  );

  const playerHandEval: EvaluatedHand = evaluatePokerHand([...playerHole, ...communityCards]);
  const botHandEval: EvaluatedHand = evaluatePokerHand([...botHole, ...communityCards]);

  // Start a new poker hand
  const startHand = () => {
    if (balance < BIG_BLIND) return;

    sound.playChips();
    const newDeck = createFullDeck();

    // Deal hole cards
    const p1 = newDeck.pop()!;
    const b1 = newDeck.pop()!;
    const p2 = newDeck.pop()!;
    const b2 = newDeck.pop()!;

    setDeck(newDeck);
    setPlayerHole([p1, p2]);
    setBotHole([b1, b2]);
    setCommunityCards([]);
    setStreet('preflop');
    setGameOutcome('');
    setRoundInProgress(true);

    // Initial Blinds: Player is SB, Bot is BB
    const initialPot = SMALL_BLIND + BIG_BLIND;
    setPot(initialPot);
    setPlayerCurrentBet(SMALL_BLIND);
    setBotCurrentBet(BIG_BLIND);
    setCurrentCallAmount(BIG_BLIND - SMALL_BLIND); // 10 to call
    setRaiseAmount(BIG_BLIND * 2);

    sound.playCardDeal();
    setTimeout(() => sound.playCardDeal(), 200);

    setBotMessage(`${selectedBot.name}: Большой блайнд ${BIG_BLIND} 🪙. Ваше слово.`);
    setIsPlayerTurn(true);
  };

  // Move to next street
  const advanceStreet = (currentStreet: Street, currentD: Card[], currentPot: number) => {
    const d = [...currentD];
    let nextStreet: Street = 'flop';
    let newComm: Card[] = [...communityCards];

    if (currentStreet === 'preflop') {
      nextStreet = 'flop';
      // Burn 1, Deal 3
      d.pop();
      newComm = [d.pop()!, d.pop()!, d.pop()!];
    } else if (currentStreet === 'flop') {
      nextStreet = 'turn';
      // Burn 1, Deal 1
      d.pop();
      newComm = [...communityCards, d.pop()!];
    } else if (currentStreet === 'turn') {
      nextStreet = 'river';
      // Burn 1, Deal 1
      d.pop();
      newComm = [...communityCards, d.pop()!];
    } else if (currentStreet === 'river') {
      // Showdown!
      handleShowdown(currentPot);
      return;
    }

    sound.playCardDeal();
    setDeck(d);
    setCommunityCards(newComm);
    setStreet(nextStreet);
    setPlayerCurrentBet(0);
    setBotCurrentBet(0);
    setCurrentCallAmount(0);

    // Bot acts first post-flop
    setTimeout(() => {
      botAction(nextStreet, newComm, d, currentPot);
    }, 700);
  };

  // Bot AI action logic
  const botAction = (curStreet: Street, comm: Card[], curDeck: Card[], curPot: number) => {
    setIsPlayerTurn(false);
    const bHand = evaluatePokerHand([...botHole, ...comm]);
    const isBluffing = Math.random() < selectedBot.bluffRate;

    // Evaluate bot hand strength (simplified pro heuristic)
    const isStrong = ['ROYAL_FLUSH', 'STRAIGHT_FLUSH', 'FOUR_OF_A_KIND', 'FULL_HOUSE', 'FLUSH', 'STRAIGHT', 'THREE_OF_A_KIND', 'TWO_PAIR'].includes(bHand.rank);
    const hasPair = bHand.rank === 'PAIR';

    if (isStrong || (isBluffing && Math.random() < selectedBot.aggression)) {
      // Bot raises or bets
      sound.playChips();
      const betSize = Math.min(Math.floor(curPot * 0.5) || 40, balance);
      setBotMessage(`${selectedBot.name}: «Чувствую силу!» — ставка ${betSize} 🪙`);
      setPot(curPot + betSize);
      setBotCurrentBet(betSize);
      setCurrentCallAmount(betSize);
      setIsPlayerTurn(true);
    } else if (hasPair || Math.random() > 0.4) {
      // Bot checks or calls
      sound.playClick();
      setBotMessage(`${selectedBot.name}: Чек / Поддержка.`);
      setCurrentCallAmount(0);
      setIsPlayerTurn(true);
    } else {
      // Bot checks
      sound.playClick();
      setBotMessage(`${selectedBot.name}: Чек.`);
      setCurrentCallAmount(0);
      setIsPlayerTurn(true);
    }
  };

  // Player action: Fold
  const handleFold = () => {
    sound.playLose();
    setGameOutcome(`Вы сбросили карты. ${selectedBot.name} забирает банк ${pot} 🪙.`);
    setIsPlayerTurn(false);
    setRoundInProgress(false);
    onUpdateBalance(balance - playerCurrentBet, -playerCurrentBet, 'poker');
  };

  // Player action: Check
  const handleCheck = () => {
    if (currentCallAmount > 0) return;
    sound.playClick();

    // Player checks, advance to next street
    advanceStreet(street, deck, pot);
  };

  // Player action: Call
  const handleCall = () => {
    sound.playChips();
    const callCost = currentCallAmount;
    const newPot = pot + callCost;
    setPot(newPot);
    setPlayerCurrentBet(playerCurrentBet + callCost);
    setCurrentCallAmount(0);

    // Player called, now advance street
    advanceStreet(street, deck, newPot);
  };

  // Player action: Raise / Bet
  const handleRaise = () => {
    const totalBet = currentCallAmount + raiseAmount;
    if (balance < totalBet) return;

    sound.playChips();
    const newPot = pot + totalBet;
    setPot(newPot);
    setPlayerCurrentBet(playerCurrentBet + totalBet);
    setCurrentCallAmount(0);
    setIsPlayerTurn(false);

    // Bot decides to call, fold, or re-raise
    setTimeout(() => {
      const bHand = evaluatePokerHand([...botHole, ...communityCards]);
      const folds = bHand.rank === 'HIGH_CARD' && Math.random() > selectedBot.bluffRate;

      if (folds) {
        sound.playWin();
        const profit = pot;
        setGameOutcome(`${selectedBot.name} сбросил карты (Фолд)! Вы забираете банк +${newPot} 🪙!`);
        setRoundInProgress(false);
        onUpdateBalance(balance + newPot - totalBet, newPot - totalBet, 'poker');
      } else {
        // Bot calls raise
        sound.playChips();
        setBotMessage(`${selectedBot.name}: «Уравниваю твой рейз!» (+${raiseAmount} 🪙)`);
        const finalPot = newPot + raiseAmount;
        setPot(finalPot);
        advanceStreet(street, deck, finalPot);
      }
    }, 800);
  };

  // Showdown calculation
  const handleShowdown = (finalPot: number) => {
    setStreet('showdown');
    setIsPlayerTurn(false);
    setRoundInProgress(false);
    sound.playCardFlip();

    const pFinal = evaluatePokerHand([...playerHole, ...communityCards]);
    const bFinal = evaluatePokerHand([...botHole, ...communityCards]);

    if (pFinal.score > bFinal.score) {
      sound.playWin();
      setGameOutcome(`Вскрытие! Ваш ${pFinal.nameRu} бьёт ${bFinal.nameRu} бота! Вы выиграли +${finalPot} 🪙!`);
      onUpdateBalance(balance + finalPot - playerCurrentBet, finalPot - playerCurrentBet, 'poker');
    } else if (pFinal.score === bFinal.score) {
      sound.playChips();
      setGameOutcome(`Вскрытие! Ничья: ${pFinal.nameRu} у обоих. Банк разделён.`);
    } else {
      sound.playLose();
      setGameOutcome(`Вскрытие! ${selectedBot.name} побеждает с комбинацией: ${bFinal.nameRu}.`);
      onUpdateBalance(balance - playerCurrentBet, -playerCurrentBet, 'poker');
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
              <div className="label mb-2">Оппонент: {selectedBot.name}</div>
              <div className="text-xs text-[#f2efeb]/70 leading-relaxed font-sans mb-3">
                {selectedBot.style}
              </div>
              <div className="label">Ваша рука</div>
              <div className="text-sm font-mono font-bold text-[#ffdb58] mt-0.5">
                {playerHandEval.nameRu}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(242,239,235,0.1)] flex items-center justify-between text-xs font-mono">
              <span className="text-[#f2efeb]/50">Стадия игры:</span>
              <span className="text-[#ffdb58] font-bold uppercase">{street}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Game Felt + Controls */}
        <div className="flex flex-col gap-5">
          {/* Main Poker Felt Table */}
          <div className="game-felt min-h-[460px] p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl">
            {/* Top: Opponent Bot */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedBot.avatar}</span>
                <span className="label">
                  {selectedBot.name} · {selectedBot.title}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 mt-1 min-h-[110px]">
                {botHole.length === 0 ? (
                  <div className="border border-dashed border-[rgba(242,239,235,0.2)] w-20 h-28 flex items-center justify-center text-[10px] font-mono text-[#f2efeb]/30 text-center p-2">
                    Карты соперника
                  </div>
                ) : (
                  botHole.map((c) => (
                    <CardView
                      key={c.id}
                      card={c}
                      hidden={street !== 'showdown'}
                      size="md"
                    />
                  ))
                )}
              </div>

              {botMessage && (
                <div className="text-xs font-mono text-[#ffdb58] bg-[#111113]/90 border border-[rgba(242,239,235,0.15)] px-3 py-1 text-center max-w-md">
                  {botMessage}
                </div>
              )}
            </div>

            {/* Center: Community Cards & Pot */}
            <div className="flex flex-col items-center justify-center my-3 gap-3">
              {/* Pot display */}
              <div className="flex items-center gap-2 bg-[#111113] border border-[#ffdb58] px-4 py-1.5 shadow-md">
                <span className="label text-[#ffdb58] opacity-100">Банк:</span>
                <span className="font-mono text-base font-bold text-[#ffdb58] tabular-nums">
                  {pot} 🪙
                </span>
              </div>

              {/* Community cards row */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 min-h-[110px]">
                {communityCards.length === 0 ? (
                  <div className="border border-dashed border-[rgba(242,239,235,0.2)] px-8 py-7 text-xs font-mono text-[#f2efeb]/40 text-center">
                    [ Флоп · Тёрн · Ривер ]
                  </div>
                ) : (
                  communityCards.map((c) => (
                    <CardView key={c.id} card={c} size="md" />
                  ))
                )}
              </div>

              {/* Showdown / Outcome announcement */}
              <AnimatePresence>
                {gameOutcome && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#111113] border border-[#ffdb58] px-5 py-2.5 text-[#ffdb58] font-display font-bold text-xs sm:text-sm text-center shadow-2xl max-w-lg"
                  >
                    {gameOutcome}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom: Player Area */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <span className="label">Ваши карманные карты</span>
                {playerHole.length > 0 && (
                  <span className="label text-[#ffdb58] opacity-100">
                    [ {playerHandEval.nameRu} ]
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 min-h-[110px]">
                {playerHole.length === 0 ? (
                  <div className="border border-dashed border-[rgba(242,239,235,0.2)] w-20 h-28 flex items-center justify-center text-[10px] font-mono text-[#f2efeb]/30 text-center p-2">
                    Ваши карты
                  </div>
                ) : (
                  playerHole.map((c) => (
                    <CardView key={c.id} card={c} size="md" />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls Panel */}
          <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-4 sm:p-5 flex flex-col gap-4">
            {!roundInProgress ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Opponent Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="label">Оппонент:</span>
                  {BOTS.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedBot(bot);
                      }}
                      className={`px-3 py-2 text-xs font-mono transition-all border flex items-center gap-1.5 cursor-pointer ${
                        selectedBot.id === bot.id
                          ? 'bg-[#f2efeb] text-[#111113] border-[#f2efeb] font-bold'
                          : 'bg-transparent text-[#f2efeb] border-[rgba(242,239,235,0.15)] hover:border-[#f2efeb]'
                      }`}
                    >
                      <span>{bot.avatar}</span>
                      <span>{bot.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={startHand}
                  disabled={balance < BIG_BLIND}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  Сыграть раздачу ({BIG_BLIND} 🪙)
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleFold}
                    disabled={!isPlayerTurn}
                    className="px-5 py-2.5 bg-transparent border border-rose-500/50 hover:bg-rose-950/60 text-rose-300 font-mono text-xs uppercase transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Пас (Fold)
                  </button>

                  {currentCallAmount === 0 ? (
                    <button
                      onClick={handleCheck}
                      disabled={!isPlayerTurn}
                      className="px-6 py-2.5 bg-[#f2efeb] text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Чек (Check)
                    </button>
                  ) : (
                    <button
                      onClick={handleCall}
                      disabled={!isPlayerTurn || balance < currentCallAmount}
                      className="px-6 py-2.5 bg-[#f2efeb] text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Колл ({currentCallAmount} 🪙)
                    </button>
                  )}

                  {/* Raise / Bet */}
                  <div className="flex items-center gap-2 border border-[rgba(242,239,235,0.15)] p-1">
                    <button
                      onClick={handleRaise}
                      disabled={!isPlayerTurn || balance < currentCallAmount + raiseAmount}
                      className="px-4 py-1.5 bg-[#ffdb58] text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Рейз +{raiseAmount}
                    </button>

                    <div className="flex items-center gap-1 px-1 font-mono">
                      {[20, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setRaiseAmount(amt)}
                          className={`px-2 py-1 text-xs cursor-pointer ${
                            raiseAmount === amt
                              ? 'bg-[#f2efeb] text-[#111113] font-bold'
                              : 'text-[#f2efeb]/60 hover:text-[#f2efeb]'
                          }`}
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-mono text-[#f2efeb]/60">
                  Ход: <span className={isPlayerTurn ? 'text-[#4ade80] font-bold' : 'text-[#ffdb58]'}>{isPlayerTurn ? 'Ваш' : 'Оппонента'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
