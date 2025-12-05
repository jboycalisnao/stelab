import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Laboratory Manager and Science Educator for High School laboratories. 
Your goal is to assist in cataloging equipment accurately.
Ensure descriptions are educational yet concise, and safety notes are practical.
Classify items into standard scientific categories (e.g., Chemistry, Biology, Physics, Earth Science) or General.
`;

export const enrichTextData = async (itemName: string): Promise<AIAnalysisResult> => {
  if (!GEMINI_API_KEY) {
    throw new Error("API Key is missing");
  }

  const prompt = `Provide inventory details for the scientific equipment named: "${itemName}".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            safetyNotes: { type: Type.STRING }
          },
          required: ["name", "category", "description", "safetyNotes"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini Text Enrichment Error:", error);
    throw error;
  }
};