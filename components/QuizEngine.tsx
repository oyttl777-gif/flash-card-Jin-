
import React, { useState, useEffect } from 'react';
import { FlashcardData, QuizQuestion } from '../types.ts';
import { generateQuizQuestions } from '../services/geminiService.ts';

interface QuizEngineProps {
  cards: FlashcardData[];
}

const QuizEngine: React.FC<QuizEngineProps> = ({ cards }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateQuizQuestions(cards);
      setQuestions(generated);
      setCurrentIndex(0);
      setScore(0);
      setIsFinished(false);
      setSelectedOption(null);
    } catch (err) {
      setError("AI 퀴즈 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionClick = (option: string) => {
    if (selectedOption !== null) return;
    
    setSelectedOption(option);
    if (option === questions[currentIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-semibold text-slate-700">Gemini AI가 맞춤 퀴즈를 생성하고 있습니다...</h2>
        <p className="text-slate-500 mt-2">단어들의 뜻과 예문을 분석 중입니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={loadQuiz} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">다시 시도</button>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="bg-white rounded-3xl shadow-lg p-12 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">퀴즈 완료!</h2>
        <p className="text-slate-500 mb-8">당신의 학습 성과입니다.</p>
        
        <div className="text-6xl font-black text-indigo-600 mb-4">{percentage}%</div>
        <p className="text-xl font-medium text-slate-700 mb-8">{questions.length}개 중 {score}개 정답</p>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={loadQuiz}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
          >
            새로운 퀴즈 시작
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="w-full space-y-8 animate-in slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-center px-2">
        <span className="text-sm font-semibold text-slate-500">Question {currentIndex + 1}/{questions.length}</span>
        <span className="text-sm font-semibold text-indigo-600">Score: {score}</span>
      </div>
      
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h3 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">다음 단어의 뜻은 무엇인가요?</h3>
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800">{currentQ.word}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQ.options.map((option, idx) => {
            const isCorrect = option === currentQ.correctAnswer;
            const isSelected = selectedOption === option;
            let bgColor = 'bg-white hover:border-indigo-300 hover:bg-slate-50';
            
            if (selectedOption !== null) {
              if (isCorrect) bgColor = 'bg-green-100 border-green-500 text-green-700';
              else if (isSelected) bgColor = 'bg-red-100 border-red-500 text-red-700';
              else bgColor = 'bg-slate-50 opacity-50';
            }

            return (
              <button
                key={idx}
                disabled={selectedOption !== null}
                onClick={() => handleOptionClick(option)}
                className={`p-5 rounded-2xl border-2 transition-all text-left font-medium ${bgColor} flex justify-between items-center`}
              >
                <span>{option}</span>
                {selectedOption !== null && isCorrect && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                )}
              </button>
            );
          })}
        </div>

        {selectedOption !== null && (
          <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-4">
            <h4 className="font-bold text-slate-800 mb-2">💡 AI 예문 설명</h4>
            <p className="text-slate-600 leading-relaxed italic">{currentQ.explanation}</p>
            <button 
              onClick={nextQuestion}
              className="mt-6 w-full py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2"
            >
              다음 문제
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizEngine;
