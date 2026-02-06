
import { GoogleGenAI, Type } from "@google/genai";
import { FlashcardData, QuizQuestion } from "../types.ts";

export const generateQuizQuestions = async (cards: FlashcardData[]): Promise<QuizQuestion[]> => {
  if (!cards || cards.length === 0) return [];
  
  // 빌드 환경에서 process.env.API_KEY 참조 에러 방지
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
  
  if (!apiKey) {
    console.error("API Key is missing. Please check your environment configuration.");
    return cards.slice(0, 5).map((card, index) => ({
      id: `error-${index}`,
      word: card.word,
      correctAnswer: card.definition,
      options: [card.definition, "오답 1", "오답 2", "오답 3"].sort(() => Math.random() - 0.5),
      explanation: "API 키 설정이 필요합니다."
    }));
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // 퀴즈를 위해 최대 10개의 단어 무작위 선택
  const selectedCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, 10);
  
  const prompt = `당신은 유능한 영어 강사입니다. 다음 단어 리스트를 바탕으로 4지선다형 객관식 퀴즈를 생성하세요.
  각 문제마다 정답과 유사한 맥락의 오답 3개를 만드세요. 오답은 반드시 정답과 같은 언어(한국어)여야 합니다.
  단어 리스트: ${JSON.stringify(selectedCards.map(c => ({ word: c.word, definition: c.definition })))}
  
  반드시 제공된 JSON 스키마 형식에 맞춰서 순수한 JSON 배열만 반환하세요.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // 복잡한 추론을 위해 Pro 모델 사용
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
                description: "정답을 포함하여 총 4개의 선택지를 제공하세요."
              },
              explanation: { type: Type.STRING, description: "해당 단어가 사용된 아주 짧은 예문 하나를 한국어로 제공하세요." }
            },
            required: ["word", "correctAnswer", "options", "explanation"]
          }
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("AI 응답이 비어있습니다.");
    }

    // AI 응답 텍스트 정제 (불필요한 마크다운 제거)
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
    console.error("Gemini Quiz Generation Error:", error);
    // 실패 시 사용자에게 알리고 학습 데이터를 바탕으로 기본 퀴즈 생성
    return selectedCards.map((card, index) => ({
      id: `fallback-${index}`,
      word: card.word,
      correctAnswer: card.definition,
      options: [card.definition, "잘못된 뜻 1", "잘못된 뜻 2", "잘못된 뜻 3"].sort(() => Math.random() - 0.5),
      explanation: "AI 서비스 일시적 오류로 기본 퀴즈를 제공합니다."
    }));
  }
};
