
import { GoogleGenAI, Type } from "@google/genai";
import { FlashcardData, QuizQuestion } from "../types.ts";

export const generateQuizQuestions = async (cards: FlashcardData[]): Promise<QuizQuestion[]> => {
  if (!cards || cards.length === 0) return [];
  
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
  
  // 퀴즈를 위해 5~10개의 단어 무작위 선택
  const selectedCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 10);

  // 비상용 퀴즈 생성 함수 (AI가 없어도 작동하도록)
  const createFallbackQuiz = () => {
    return selectedCards.map((card, index) => {
      // 현재 단어의 뜻을 제외한 다른 모든 뜻들을 수집
      const otherDefinitions = cards
        .filter(c => c.id !== card.id)
        .map(c => c.definition);
      
      // 다른 뜻들 중 무작위로 3개 선택 (오답으로 사용)
      const distractors = [...otherDefinitions]
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      // 만약 다른 단어가 부족하면 기본값 추가
      while (distractors.length < 3) {
        distractors.push(`오답 후보 ${distractors.length + 1}`);
      }

      return {
        id: `fallback-${index}-${Date.now()}`,
        word: card.word,
        correctAnswer: card.definition,
        options: [card.definition, ...distractors].sort(() => Math.random() - 0.5),
        explanation: "현재는 단어장의 데이터만으로 생성된 퀴즈입니다. (AI 연결 확인 필요)"
      };
    });
  };

  // API Key가 없으면 즉시 비상용 퀴즈 반환
  if (!apiKey) {
    console.warn("API Key missing. Using local data for quiz.");
    return createFallbackQuiz();
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `당신은 전문 영어 교육 전문가입니다. 
  사용자의 단어장 데이터를 바탕으로 학습 효과가 높은 4지선다형 퀴즈를 만드세요.
  
  [지침]
  1. 각 단어의 'correctAnswer'는 제공된 정의와 일치해야 합니다.
  2. 3개의 오답(distractors)은 정답과 혼동될 수 있을 정도로 그럴듯해야 합니다.
  3. 모든 텍스트(오답, 설명)는 한국어로 작성하세요.
  4. 'explanation'에는 해당 단어가 들어간 간단한 영어 예문과 한국어 해석을 포함하세요.

  [데이터]
  ${JSON.stringify(selectedCards.map(c => ({ word: c.word, definition: c.definition })))}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
                description: "정답 1개와 오답 3개를 포함한 총 4개의 선택지"
              },
              explanation: { type: Type.STRING }
            },
            required: ["word", "correctAnswer", "options", "explanation"]
          }
        }
      }
    });

    if (!response.text) throw new Error("Empty response");

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json\n?|```$/g, '');
    }

    const result = JSON.parse(jsonStr);
    return result.map((q: any, index: number) => ({
      ...q,
      id: `quiz-${index}-${Date.now()}`
    }));
  } catch (error) {
    console.error("Gemini API Error, falling back to local quiz:", error);
    return createFallbackQuiz();
  }
};
