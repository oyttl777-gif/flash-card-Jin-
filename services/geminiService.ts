
import { GoogleGenAI, Type } from "@google/genai";
import { FlashcardData, QuizQuestion } from "../types.ts";

export const generateQuizQuestions = async (cards: FlashcardData[]): Promise<QuizQuestion[]> => {
  if (!cards || cards.length === 0) return [];
  
  // Create AI instance inside function to ensure API_KEY is loaded correctly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const selectedCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 10);
  
  const prompt = `Generate a multiple-choice quiz based on these flashcards. 
  For each word, provide 3 plausible but incorrect distractors in the same language as the definition.
  Flashcards: ${JSON.stringify(selectedCards.map(c => ({ word: c.word, definition: c.definition })))}
  Return the quiz as a JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              correctAnswer: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Must include the correct answer and 3 distractors."
              },
              explanation: { type: Type.STRING, description: "A short sentence using the word." }
            },
            required: ["word", "correctAnswer", "options", "explanation"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    return result.map((q: any, index: number) => ({
      ...q,
      id: `quiz-${index}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Gemini Quiz Generation Error:", error);
    return selectedCards.map((card, index) => ({
      id: `fallback-${index}`,
      word: card.word,
      correctAnswer: card.definition,
      options: [card.definition, "오답 1", "오답 2", "오답 3"].sort(() => Math.random() - 0.5),
      explanation: "AI 생성을 불러오지 못했습니다."
    }));
  }
};
