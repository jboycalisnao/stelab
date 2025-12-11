import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Safely retrieve API Key to prevent runtime crashes if process is undefined
const getApiKey = (AIzaSyDnTjbL0XCdV4XbuBR5MhOP5sd1hssQI0s) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Failed to access process.env");
  }
  return "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const SYSTEM_INSTRUCTION = `
You are an expert Laboratory Manager and Science Educator for High School laboratories. 
Your goal is to assist in cataloging equipment accurately.
Ensure descriptions are educational yet concise, and safety notes are practical.
Classify items into standard scientific categories (e.g., Chemistry, Biology, Physics, Earth Science) or General.
`;

export const enrichTextData = async (itemName: string): Promise<AIAnalysisResult> => {
  const key = getApiKey();
  if (!key) {
    console.error("Gemini API Key is missing.");
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
        let jsonStr = response.text.trim();
        
        // Sanitize: Remove markdown code blocks if present (e.g., ```json ... ```)
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }

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