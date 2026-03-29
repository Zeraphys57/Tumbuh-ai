import { GoogleGenerativeAI } from "@google/generative-ai";

// Singleton — satu instance untuk seluruh aplikasi
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getGeminiModel = () => {
  // Kita tembak langsung ke seri 3 Flash
  return genAI.getGenerativeModel(
    { model: "gemini-2.5-flash" },
    { apiVersion: "v1" }
  );
};