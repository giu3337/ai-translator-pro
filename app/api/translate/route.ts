import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";

// Inyectamos las instrucciones principales definidas en tu SYSTEM_PROMPT.md
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

export async function POST(req: Request) {
  try {
    const { 
      text, 
      type = "Traducción", 
      target_language, 
      temperature = 0.7, 
      max_tokens = 500 
    } = await req.json();

    if (!text || !target_language) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: text o target_language" }, 
        { status: 400 }
      );
    }

    // Construimos el prompt final con el contexto y la orden del usuario
    const prompt = `
      ${SYSTEM_PROMPT}

      Petición del Usuario:
      - Intent (Tipo): ${type}
      - Target Language: ${target_language}
      - Text to process: "${text}"
    `;

    // Ejecutamos Gemini con la configuración dinámica
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: parseFloat(temperature),
        maxOutputTokens: parseInt(max_tokens, 10),
        responseMimeType: "application/json" // Crítico mantenerlo aquí para sobreescritura segura
      }
    });
    
    // Al usar responseMimeType: "application/json", sabemos que response.text() es JSON válido
    const jsonResponseString = result.response.text();
    const parsedData = JSON.parse(jsonResponseString);

    return NextResponse.json(parsedData);
    
  } catch (error: unknown) {
    console.error("Gemini AI API Error:", error);
    const errMessage = error instanceof Error ? error.message : "Error inesperado durante la traducción";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
