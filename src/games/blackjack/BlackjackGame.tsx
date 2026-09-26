import React, { useState, useEffect } from 'react';
import { Card } from '../../types/cards';
import { createFullDeck } from '../../utils/deck';
import { CardView } from '../../components/CardView';
import { OddsMeter } from '../../components/OddsMeter';
import { calculateHandScore, calculateBlackjackOdds } from './BlackjackEngine';
import { sound } from '../../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Plus, Hand, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BlackjackGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number, delta: number, game: 'blackjack') => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ balance, onUpdateBalance }) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [bet, setBet] = useState<number>(50);
  const [gameStatus, setGameStatus] = useState<'betting' | 'playing' | 'dealerTurn' | 'gameOver'>('betting');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [isDealerCardHidden, setIsDealerCardHidden] = useState<boolean>(true);

  // Initialize deck on mount
  useEffect(() => {
    setDeck(createFullDeck());
  }, []);

  const playerScoreInfo = calculateHandScore(playerCards);
  const dealerScoreInfo = calculateHandScore(
    isDealerCardHidden && dealerCards.length > 0 ? [dealerCards[0]] : dealerCards
  );

  const odds = calculateBlackjackOdds(
    playerCards,
    dealerCards,
    deck
  );

  // Start round
  const handleDeal = () => {
    if (balance < bet) {
      sound.playLose();
      return;
    }

    sound.playChips();
    let currentDeck = [...deck];
    if (currentDeck.length < 15) {
      currentDeck = createFullDeck();
    }

    // Deal 2 cards to player, 2 cards to dealer
    const p1 = currentDeck.pop()!;
    const d1 = currentDeck.pop()!;
    const p2 = currentDeck.pop()!;
    const d2 = currentDeck.pop()!;

    setDeck(currentDeck);
    setPlayerCards([p1, p2]);
    setDealerCards([d1, d2]);
    setIsDealerCardHidden(true);
    setResultMessage('');

    sound.playCardDeal();
    setTimeout(() => sound.playCardDeal(), 150);

    const initialScore = calculateHandScore([p1, p2]);
    if (initialScore.isBlackjack) {
      // Natural Blackjack!
      setTimeout(() => {
        finishGame([p1, p2], [d1, d2], currentDeck);
      }, 500);
    } else {
      setGameStatus('playing');
    }
  };

  // Player hits
  const handleHit = () => {
    if (gameStatus !== 'playing') return;

    sound.playCardDeal();
    const currentDeck = [...deck];
    const newCard = currentDeck.pop();
    if (!newCard) return;

    const newPlayerCards = [...playerCards, newCard];
    setPlayerCards(newPlayerCards);
    setDeck(currentDeck);

    const scoreInfo = calculateHandScore(newPlayerCards);
    if (scoreInfo.score > 21) {
      sound.playLose();
      setIsDealerCardHidden(false);
      setGameStatus('gameOver');
      setResultMessage('Перебор! Вы проиграли раунд.');
      onUpdateBalance(balance - bet, -bet, 'blackjack');
    } else if (scoreInfo.score === 21) {
      // Auto stand on 21
      handleStand(newPlayerCards, currentDeck);
    }
  };

  // Player stands
  const handleStand = (cardsToEvaluate = playerCards, currentDeck = deck) => {
    if (gameStatus !== 'playing') return;
    setGameStatus('dealerTurn');
    setIsDealerCardHidden(false);
    sound.playCardFlip();

    let dCards = [...dealerCards];
    let dDeck = [...currentDeck];
    let dScore = calculateHandScore(dCards).score;

    // Dealer hits until 17 or higher
    const dealerStep = () => {
      if (dScore < 17) {
        sound.playCardDeal();
        const nextCard = dDeck.pop();
        if (nextCard) {
          dCards = [...dCards, nextCard];
          setDealerCards(dCards);
          setDeck(dDeck);
          dScore = calculateHandScore(dCards).score;
          setTimeout(dealerStep, 600);
        } else {
          finishGame(cardsToEvaluate, dCards, dDeck);
        }
      } else {
        finishGame(cardsToEvaluate, dCards, dDeck);
      }
    };

    setTimeout(dealerStep, 500);
  };

  // Player doubles down
  const handleDouble = () => {
    if (gameStatus !== 'playing' || playerCards.length !== 2) return;
    if (balance < bet * 2) return;

    sound.playChips();
    const doubleBet = bet * 2;
    setBet(doubleBet);

    const currentDeck = [...deck];
    const newCard = currentDeck.pop();
    if (!newCard) return;

    const newCards = [...playerCards, newCard];
    setPlayerCards(newCards);
    setDeck(currentDeck);
    sound.playCardDeal();

    const score = calculateHandScore(newCards).score;
    if (score > 21) {
      sound.playLose();
      setIsDealerCardHidden(false);
      setGameStatus('gameOver');
      setResultMessage('Перебор при удвоении!');
      onUpdateBalance(balance - doubleBet, -doubleBet, 'blackjack');
    } else {
      setTimeout(() => {
        handleStand(newCards, currentDeck);
      }, 400);
    }
  };

  // Finish game calculation
  const finishGame = (pCards: Card[], dCards: Card[], remainingDeck: Card[]) => {
    setIsDealerCardHidden(false);
    setGameStatus('gameOver');

    const pScoreInfo = calculateHandScore(pCards);
    const dScoreInfo = calculateHandScore(dCards);
    const pScore = pScoreInfo.score;
    const dScore = dScoreInfo.score;

    if (pScore > 21) {
      sound.playLose();
      setResultMessage('Перебор! Казино побеждает.');
      onUpdateBalance(balance - bet, -bet, 'blackjack');
    } else if (pScoreInfo.isBlackjack && !dScoreInfo.isBlackjack) {
      sound.playWin();
      const winAmount = Math.floor(bet * 1.5);
      setResultMessage(`Натуральный Блэкджек! Выигрыш: +${winAmount + bet} фишек!`);
      onUpdateBalance(balance + winAmount, winAmount, 'blackjack');
    } else if (dScore > 21) {
      sound.playWin();
      setResultMessage(`Дилер перебрал (${dScore})! Вы выиграли: +${bet * 2} фишек!`);
      onUpdateBalance(balance + bet, bet, 'blackjack');
    } else if (pScore > dScore) {
      sound.playWin();
      setResultMessage(`Победа по очкам (${pScore} против ${dScore})! +${bet * 2} фишек!`);
      onUpdateBalance(balance + bet, bet, 'blackjack');
    } else if (pScore === dScore) {
      sound.playChips();
      setResultMessage(`Ничья (Push) - очки равны (${pScore}). Ставка возвращена.`);
    } else {
      sound.playLose();
      setResultMessage(`Дилер побеждает (${dScore} против ${pScore}).`);
      onUpdateBalance(balance - bet, -bet, 'blackjack');
    }
  };

  const resetForNewRound = () => {
    sound.playClick();
    setGameStatus('betting');
    setPlayerCards([]);
    setDealerCards([]);
    setIsDealerCardHidden(true);
    setResultMessage('');
  };

  const BET_PRESETS = [10, 25, 50, 100, 250, 500];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
      {/* 2-Column Grid: Sidebar + Felt Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 w-full">
        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <OddsMeter odds={odds} />

          <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-5 flex flex-col justify-between flex-1">
            <div>
              <div className="label mb-2">Режим: 21 (Блэкджек)</div>
              <div className="text-xs text-[#f2efeb]/70 leading-relaxed font-sans mb-3">
                Дилер обязан добирать карты до 17 очков. Блэкджек (Туз + 10/картинка) оплачивается 3 к 2.
              </div>
              <div className="label">Очки игрока</div>
              <div className="text-sm font-mono font-bold text-[#ffdb58] mt-0.5">
                {playerScoreInfo.score} {playerScoreInfo.isBlackjack ? '★ БЛЭКДЖЕК' : ''}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(242,239,235,0.1)] flex items-center justify-between text-xs font-mono">
              <span className="text-[#f2efeb]/50">Очки дилера:</span>
              <span className="text-[#ffdb58] font-bold">
                {dealerCards.length > 0
                  ? isDealerCardHidden
                    ? `${dealerScoreInfo.score} + ?`
                    : dealerScoreInfo.score
                  : '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Game Felt + Controls */}
        <div className="flex flex-col gap-5">
          {/* Main Table Felt */}
          <div className="game-felt min-h-[460px] p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl">
            {/* Dealer Area */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="label">
                  Дилер {dealerCards.length > 0 && `· [ ${isDealerCardHidden ? `${dealerScoreInfo.score} + ?` : dealerScoreInfo.score} ]`}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2.5 min-h-[110px]">
                {dealerCards.length === 0 ? (
                  <div className="border border-dashed border-[rgba(242,239,235,0.2)] w-20 h-28 flex items-center justify-center text-[10px] font-mono text-[#f2efeb]/30 text-center p-2">
                    Карты дилера
                  </div>
                ) : (
                  dealerCards.map((c, i) => (
                    <CardView
                      key={c.id}
                      card={c}
                      hidden={i === 1 && isDealerCardHidden}
                      size="md"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Center Status / Outcome Banner */}
            <div className="my-2 flex flex-col items-center justify-center min-h-[44px]">
              <AnimatePresence mode="wait">
                {resultMessage ? (
                  <motion.div
                    key={resultMessage}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#111113] border border-[#ffdb58] px-5 py-2.5 text-[#ffdb58] font-display font-bold text-xs sm:text-sm text-center shadow-2xl max-w-lg"
                  >
                    {resultMessage}
                  </motion.div>
                ) : gameStatus === 'playing' ? (
                  <div className="text-xs font-mono text-[#f2efeb]/70 bg-[#111113]/80 border border-[rgba(242,239,235,0.15)] px-4 py-1.5">
                    [ Ваш ход: возьмите карту (Hit) или остановитесь (Stand) ]
                  </div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Player Area */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="label">
                  Ваша Рука {playerCards.length > 0 && `· [ ${playerScoreInfo.score} ]`}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2.5 min-h-[110px] flex-wrap">
                {playerCards.length === 0 ? (
                  <div className="border border-dashed border-[rgba(242,239,235,0.2)] w-20 h-28 flex items-center justify-center text-[10px] font-mono text-[#f2efeb]/30 text-center p-2">
                    Ваши карты
                  </div>
                ) : (
                  playerCards.map((c) => (
                    <CardView
                      key={c.id}
                      card={c}
                      size="md"
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Controls Panel */}
          <div className="bg-[#1a1a1c] border border-[rgba(242,239,235,0.1)] p-4 sm:p-5 flex flex-col gap-4">
            {gameStatus === 'betting' ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="label">Ставка на раунд</span>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {BET_PRESETS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => {
                          sound.playChips();
                          setBet(amount);
                        }}
                        className={`px-3 py-2 text-xs font-mono transition-all border cursor-pointer ${
                          bet === amount
                            ? 'bg-[#f2efeb] text-[#111113] border-[#f2efeb] font-bold'
                            : 'bg-transparent text-[#f2efeb] border-[rgba(242,239,235,0.15)] hover:border-[#f2efeb]'
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        sound.playChips();
                        setBet(Math.min(balance, 1000));
                      }}
                      className="px-3 py-2 text-xs font-mono uppercase bg-transparent border border-[#ffdb58]/50 text-[#ffdb58] hover:bg-[#ffdb58]/10 cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDeal}
                  disabled={balance < bet}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  Раздать карты ({bet} 🪙)
                </button>
              </div>
            ) : gameStatus === 'playing' ? (
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={handleHit}
                  className="px-7 py-3 bg-[#f2efeb] text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ещё (Hit)</span>
                </button>

                <button
                  onClick={() => handleStand()}
                  className="px-7 py-3 bg-transparent border border-[#f2efeb] hover:bg-[#f2efeb]/10 text-[#f2efeb] font-display font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Hand className="w-4 h-4" />
                  <span>Хватит (Stand)</span>
                </button>

                {playerCards.length === 2 && balance >= bet * 2 && (
                  <button
                    onClick={handleDouble}
                    className="px-7 py-3 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Удвоить (x2)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <button
                  onClick={resetForNewRound}
                  className="px-8 py-3.5 bg-[#ffdb58] hover:bg-[#ffdb58]/90 text-[#111113] font-display font-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Следующий раунд</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
