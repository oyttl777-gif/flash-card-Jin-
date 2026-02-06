
import React, { useState, useEffect, useCallback } from 'react';
import { FlashcardData, AppState, QuizQuestion } from './types';
import { generateQuizQuestions } from './services/geminiService';
import Flashcard from './components/Flashcard';
import QuizEngine from './components/QuizEngine';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('setup');
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse CSV data based on specific headers from the user's Google Sheet
  const parseCSV = (csvText: string): FlashcardData[] => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Extract headers and clean them
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find column indices for '공부내용' (Word) and '뉴스요약' (Definition)
    const wordIdx = headers.indexOf('공부내용');
    const defIdx = headers.indexOf('뉴스요약');

    // Fallback indices if headers not found exactly as requested (C=2, D=3)
    const finalWordIdx = wordIdx !== -1 ? wordIdx : 2;
    const finalDefIdx = defIdx !== -1 ? defIdx : 3;

    const parsed: FlashcardData[] = [];
    lines.slice(1).forEach((line, idx) => {
      // Split by comma but handle cases where content might contain commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts[finalWordIdx] && parts[finalDefIdx]) {
        // Basic check to skip empty or header-like rows that might repeat
        if (parts[finalWordIdx] === '공부내용' || parts[finalWordIdx] === 'trip' && idx > 50) return;

        parsed.push({
          id: `card-${idx}-${Date.now()}`,
          word: parts[finalWordIdx],
          definition: parts[finalDefIdx]
        });
      }
    });
    return parsed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedCards = parseCSV(text);
      if (parsedCards.length > 0) {
        setCards(parsedCards);
        setError(null);
      } else {
        setError("'공부내용'과 '뉴스요약' 열을 찾을 수 없거나 데이터가 비어있습니다.");
      }
    };
    reader.readAsText(file);
  };

  const fetchGoogleSheet = async () => {
    if (!sheetUrl.includes('docs.google.com/spreadsheets')) {
      setError("유효한 구글 시트 URL을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const sheetIdMatch = sheetUrl.match(/\/d\/(.+?)\//);
      if (!sheetIdMatch) throw new Error("시트 ID를 찾을 수 없습니다.");
      
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/gviz/tq?tqx=out:csv`;
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error("시트를 불러오는데 실패했습니다. 시트가 '링크가 있는 모든 사용자'에게 공개되어 있는지 확인하세요.");
      
      const csvText = await response.text();
      const parsedCards = parseCSV(csvText);
      
      if (parsedCards.length > 0) {
        setCards(parsedCards);
        setAppState('study');
      } else {
        setError("'공부내용'과 '뉴스요약' 열의 데이터를 찾을 수 없습니다.");
      }
    } catch (err: any) {
      setError(err.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">영어 단어장</h1>
        </div>
        
        {cards.length > 0 && (
          <nav className="flex gap-2 md:gap-4">
            <button onClick={() => setAppState('study')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition ${appState === 'study' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>학습하기</button>
            <button onClick={() => setAppState('quiz')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition ${appState === 'quiz' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>AI 퀴즈</button>
            <button onClick={() => setAppState('setup')} className="px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-100">데이터 변경</button>
          </nav>
        )}
      </header>

      <main className="w-full max-w-4xl p-4 md:p-6 flex-grow">
        {appState === 'setup' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">구글 시트 연동하기</h2>
              <p className="text-slate-500 text-sm md:text-base">'공부내용'(영어)과 '뉴스요약'(뜻) 열을 자동으로 추출합니다.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 transition-colors bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
                  URL 붙여넣기
                </h3>
                <input 
                  type="text" 
                  placeholder="구글 시트 주소를 입력하세요"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 text-sm shadow-inner bg-white"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <button 
                  onClick={fetchGoogleSheet}
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md active:scale-95"
                >
                  {isLoading ? '연결 중...' : '시트 데이터 가져오기'}
                </button>
              </div>

              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  직접 파일 업로드
                </h3>
                <label className="block w-full text-center py-8 bg-white border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 transition shadow-sm">
                  <span className="text-sm text-slate-600 font-medium">CSV 파일 선택</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center font-medium">
                {error}
              </div>
            )}

            {cards.length > 0 && (
              <div className="text-center mt-6 animate-bounce">
                <p className="text-indigo-600 font-bold mb-4">✨ {cards.length}개의 영어 단어를 찾았습니다!</p>
                <button 
                  onClick={() => setAppState('study')}
                  className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition shadow-xl"
                >
                  학습 시작하기
                </button>
              </div>
            )}
          </div>
        )}

        {appState === 'study' && <StudyView cards={cards} />}
        {appState === 'quiz' && <QuizEngine cards={cards} />}
      </main>

      <footer className="py-8 text-slate-400 text-xs text-center px-4">
        제공해주신 '영아단어' 시트 형식을 기반으로 작동합니다.<br/>
        &copy; 2024 AI Smart Flashcards
      </footer>
    </div>
  );
};

const StudyView: React.FC<{ cards: FlashcardData[] }> = ({ cards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextCard = () => setCurrentIndex((prev) => (prev + 1) % cards.length);
  const prevCard = () => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-in zoom-in-95 duration-300">
      <div className="w-full flex justify-between items-center text-slate-500 font-bold px-2">
        <span className="text-sm">PROGRESS</span>
        <span className="text-sm">{currentIndex + 1} / {cards.length}</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      <Flashcard card={cards[currentIndex]} />

      <div className="flex gap-6 items-center mt-2">
        <button onClick={prevCard} className="p-5 rounded-full bg-white shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 transition active:scale-90">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <button onClick={nextCard} className="p-5 rounded-full bg-indigo-600 shadow-lg text-white hover:bg-indigo-700 transition active:scale-90">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    </div>
  );
};

export default App;
