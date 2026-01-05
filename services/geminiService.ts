import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Resolve API key in a browser-safe way. Prefer Vite client envs.
const resolveApiKey = (): string | undefined => {
  const fromImportMeta = (import.meta as any)?.env?.VITE_GEMINI_API_KEY as string | undefined;
  const fromProcess = typeof process !== 'undefined' ? (process.env?.API_KEY as string | undefined) : undefined;
  const key = (fromImportMeta || fromProcess || '').trim();
  return key.length > 0 ? key : undefined;
};

const SYSTEM_INSTRUCTION = `
You are an expert Laboratory Manager and Science Educator for High School laboratories. 
Your goal is to assist in cataloging scientific equipment accurately.
Ensure descriptions are educational yet concise, and safety notes are practical for a school environment.
Classify items into standard high school scientific domains: 'Chemistry', 'Biology', 'Physics', 'Earth Science', or 'General'.
Include typical storage locations or handling precautions.
`;

export const enrichTextData = async (itemName: string): Promise<AIAnalysisResult> => {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("AI Enrichment is disabled: API Key missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Provide inventory details for the scientific equipment or apparatus named: "${itemName}". Return structured JSON only.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: {
              type: Type.STRING,
              description: "Must be one of: Chemistry, Biology, Physics, Earth Science, or General"
            },
            description: { type: Type.STRING },
            safetyNotes: { type: Type.STRING }
          },
          required: ["name", "category", "description", "safetyNotes"]
        }
      }
    });

    if ((response as any).text) {
      const jsonStr = (response as any).text.trim();
      try {
        return JSON.parse(jsonStr) as AIAnalysisResult;
      } catch (parseError) {
        console.error("Failed to parse Gemini JSON response:", jsonStr);
        throw new Error("Invalid JSON response from AI");
      }
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini Text Enrichment Error:", error);
    throw error;
  }
};
