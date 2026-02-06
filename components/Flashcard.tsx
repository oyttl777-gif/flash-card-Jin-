
import React, { useState, useEffect } from 'react';
import { FlashcardData } from '../types';

interface FlashcardProps {
  card: FlashcardData;
}

const Flashcard: React.FC<FlashcardProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [card]);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't flip the card when clicking speaker
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(card.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div 
      className={`flip-card w-full h-[350px] md:h-[450px] cursor-pointer ${isFlipped ? 'flipped' : ''}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className="flip-card-inner relative w-full h-full text-center shadow-2xl rounded-3xl">
        {/* Front - English Word */}
        <div className="flip-card-front absolute w-full h-full bg-white border-2 border-slate-100 rounded-3xl flex flex-col items-center justify-center p-8">
          <div className="absolute top-6 right-6 flex gap-2">
             <button 
              onClick={speak}
              className="p-3 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-full transition-colors group shadow-sm"
              title="발음 듣기"
            >
              <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>

          <span className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 bg-indigo-50 px-3 py-1 rounded-full">English</span>
          <h2 className="text-4xl md:text-6xl font-bold text-slate-800 break-words max-w-full leading-tight">
            {card.word}
          </h2>
          
          <div className="mt-12 flex items-center gap-2 text-slate-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Click to Flip</span>
          </div>
        </div>
        
        {/* Back - Korean Meaning */}
        <div className="flip-card-back absolute w-full h-full bg-indigo-600 text-white rounded-3xl flex flex-col items-center justify-center p-8">
          <span className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em] mb-6 bg-indigo-700 bg-opacity-50 px-3 py-1 rounded-full">Meaning</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 break-words max-w-full leading-snug">
            {card.definition}
          </h2>
          <div className="mt-8 p-4 bg-white/10 rounded-2xl max-w-md border border-white/10">
             <p className="text-xs md:text-sm text-indigo-100 font-medium">단어의 뜻을 확인하고 다음으로 넘어가세요.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
