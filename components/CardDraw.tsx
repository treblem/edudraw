import React, { useEffect, useState } from 'react';
import { WHEEL_COLORS } from '../types';
import { playDrawSound } from '../utils';

interface CardDrawProps {
  names: string[];
  winnerName: string | null;
  isRunning: boolean;
  onEnd: () => void;
}

interface CardProps {
  index: number;
  state: string;
  winnerName: string | null;
}

const Card: React.FC<CardProps> = ({ index, state, winnerName }) => {
  // Calculate simple shuffle transform
  // If shuffling, oscillate X position. If picking, center one card, fade others.
  let transformClass = '';
  let opacityClass = 'opacity-100';

  if (state === 'shuffling') {
      const animationName = index % 2 === 0 ? 'animate-pulse' : 'animate-bounce'; // Simple Tailwind animations
      transformClass = `translate-x-0 ${animationName}`;
  } else if (state === 'picking' || state === 'revealed') {
      if (index === 1) { // Center card is the "chosen" one visually
          transformClass = 'scale-125 z-10 translate-y-[-20px] transition-all duration-700';
      } else {
          opacityClass = 'opacity-0 transition-opacity duration-500';
      }
  }

  const isCenter = index === 1;
  const isRevealed = state === 'revealed' && isCenter;

  return (
    <div 
      className={`relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl shadow-xl transition-all duration-500 transform ${transformClass} ${opacityClass}`}
      style={{ perspective: '1000px' }}
    >
      <div className={`relative w-full h-full text-center transition-transform duration-700`} style={{ transformStyle: 'preserve-3d', transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          
          {/* Front (Back of card design) */}
          <div className="absolute w-full h-full bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl flex items-center justify-center backface-hidden border-2 border-white/20">
              <span className="text-4xl">?</span>
          </div>

          {/* Back (Result face) */}
          <div 
              className="absolute w-full h-full bg-white rounded-xl flex flex-col items-center justify-center backface-hidden border-4 border-yellow-400"
              style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Winner</div>
              <div className="text-lg sm:text-xl font-extrabold text-indigo-800 px-1 break-words w-full text-center">
                  {winnerName}
              </div>
          </div>
      </div>
    </div>
  );
};

const CardDraw: React.FC<CardDrawProps> = ({ winnerName, isRunning, onEnd }) => {
  const [step, setStep] = useState<'idle' | 'shuffling' | 'picking' | 'revealed'>('idle');

  useEffect(() => {
    if (isRunning && winnerName) {
      setStep('shuffling');

      // Shuffle animation time
      setTimeout(() => {
        setStep('picking');
      }, 2000);

      // Reveal time
      setTimeout(() => {
        playDrawSound();
        setStep('revealed');
      }, 3000);

      // End callback time
      setTimeout(() => {
        onEnd();
      }, 5000);
    } else {
        setStep('idle');
    }
  }, [isRunning, winnerName, onEnd]);

  return (
    <div className="w-full h-full flex flex-col justify-center items-center bg-gray-100 rounded-xl border-4 border-indigo-200 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      
      <h3 className={`text-2xl font-bold text-indigo-600 mb-8 transition-opacity duration-300 ${step === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
        Lucky Card Draw
      </h3>

      <div className="flex gap-4 sm:gap-8 items-center justify-center">
         {/* Render 3 abstract cards to represent the deck */}
         {[0, 1, 2].map(i => (
             <Card key={i} index={i} state={step} winnerName={winnerName} />
         ))}
      </div>

      {step === 'shuffling' && <p className="mt-8 text-indigo-500 font-semibold animate-pulse">Shuffling...</p>}
      {step === 'revealed' && <p className="mt-8 text-yellow-600 font-bold text-xl animate-bounce">Congratulations!</p>}
    </div>
  );
};

export default CardDraw;