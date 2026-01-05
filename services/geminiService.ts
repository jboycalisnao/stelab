import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Always use process.env.API_KEY exclusively and directly for initialization as per guidelines
// Initializing the GenAI client with direct environment variable access
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert Laboratory Manager and Science Educator for High School laboratories. 
Your goal is to assist in cataloging scientific equipment accurately.
Ensure descriptions are educational yet concise, and safety notes are practical for a school environment.
Classify items into standard high school scientific domains: 'Chemistry', 'Biology', 'Physics', 'Earth Science', or 'General'.
Include typical storage locations or handling precautions.
`;

export const enrichTextData = async (itemName: string): Promise<AIAnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("AI Enrichment is disabled: API Key missing.");
  }

  const prompt = `Provide inventory details for the scientific equipment or apparatus named: "${itemName}". Return structured JSON only.`;

  try {
    // Using gemini-3-pro-preview for STEM tasks and complex reasoning in cataloging
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

    // Directly accessing the .text property from GenerateContentResponse
    if (response.text) {
        const jsonStr = response.text.trim();
        
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