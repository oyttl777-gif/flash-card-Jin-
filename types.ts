
export interface FlashcardData {
  id: string;
  word: string;
  definition: string;
  example?: string;
}

export interface QuizQuestion {
  id: string;
  word: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
}

export type AppState = 'setup' | 'study' | 'quiz' | 'history';
