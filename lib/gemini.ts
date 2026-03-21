import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error("Manejador de error: falta GOOGLE_GENERATIVE_AI_API_KEY en .env.local");
}

// Inicializar el SDK de Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Exportar el modelo configurado para respuestas estrictas en JSON
export const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  // Esta es la magia: obliga a Gemini a responder en formato JSON
  generationConfig: {
    responseMimeType: "application/json",
  },
});
