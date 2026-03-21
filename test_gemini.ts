import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

// Leer la llave de .env.local directamente y quitar nuevas líneas
const envFile = fs.readFileSync(".env.local", "utf8");
const match = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : "";

if (!apiKey) {
  console.error("FATAL ERROR: No se encontró la llave GOOGLE_GENERATIVE_AI_API_KEY en .env.local");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  },
});

const SYSTEM_PROMPT = `
Eres un Experto en Lingüística Comparada y Políglota de alta precisión.
Tu tarea es traducir texto manteniendo el contexto cultural, tono (formal/informal) y detectar modismos.

Constraints:
- "Traducción": Solo entrega el texto traducido.
- "Explicación": Analiza la gramática y por qué se usó esa palabra.
- "Mejora": Sugiere 3 formas más naturales (nativas) de decir lo mismo.

Output Format: Siempre responder utilizando esta misma estructura JSON exacta, sin saltarse campos:
{
  "original_text": "string",
  "translated_text": "string",
  "detected_language": "string",
  "alternatives": ["string"],
  "explanation": "string"
}
`;

const prompt = `
${SYSTEM_PROMPT}

Petición del Usuario:
- Intent (Tipo): Explicación
- Target Language: Español
- Text to process: "It's raining cats and dogs"
`;

async function main() {
  console.log("Enviando frase: 'It's raining cats and dogs'\nEsperando la respuesta de Gemini...");
  try {
    const result = await model.generateContent(prompt);
    console.log("--- RESPUESTA JSON DE GEMINI ---");
    console.log(result.response.text());
  } catch (err) {
    console.error("Oops! Hubo un error:", err);
  }
}

main();
