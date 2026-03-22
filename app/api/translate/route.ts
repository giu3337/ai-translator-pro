import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
Eres un Experto en Lingüística Comparada y Políglota de alta precisión.
Tu tarea es traducir texto manteniendo el contexto cultural, tono (formal/informal) y detectar modismos.

Constraints:
- "Traducción": Solo entrega el texto traducido.
- "Explicación": Análisis gramatical súper conciso y directo (máx. 2 líneas).
- "Mejora": Sugiere 3 alternativas cortas y nativas.

Output Format: Siempre responder utilizando esta estructura JSON exacta:
{
  "original_text": "string",
  "translated_text": "string",
  "detected_language": "string",
  "alternatives": ["string"],
  "explanation": "string"
}

REGLA CRÍTICA: Debes responder ÚNICA Y EXCLUSIVAMENTE con el payload en formato JSON. Nada de backticks, nada de saludos. Solo el Text JSON válido.
`;

export async function POST(req: Request) {
  try {
    const { 
      text, 
      type = "Traducción", 
      target_language, 
      temperature = 0.7, 
      max_tokens = 500,
      previousTranslation,
      question
    } = await req.json();

    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        { error: "Migración completada. Ahora inserta tu OPENROUTER_API_KEY en el archivo .env.local para re-conectar el cerebro." }, 
        { status: 401 }
      );
    }

    if (!text || !target_language) {
      return NextResponse.json({ error: "Faltan campos requeridos: text o target_language" }, { status: 400 });
    }

    const messages = [];

    // Modo Maestro (Follow-up)
    if (question && previousTranslation) {
      messages.push({ role: "system", content: SYSTEM_PROMPT });
      messages.push({ role: "user", content: `Traduce al ${target_language}: "${text}"` });
      messages.push({ role: "assistant", content: JSON.stringify(previousTranslation) });
      
      const followUpPrompt = `
        ATENCIÓN MAESTRO: El usuario tiene una duda gramatical/lingüística de seguimiento sobre tu traducción anterior.
        Responde su duda actuando como Maestro de Idiomas Nativo.
        MANTÉN OBLIGATORIAMENTE EL FORMATO JSON EXACTO. Tus enseñanzas e interactividad deben ir SOLAMENTE dentro del campo "explanation". Conserva las "alternatives" y el "translated_text" de la versión anterior a menos que la pregunta requiera que los cambies.

        Pregunta del usuario: "${question}"
      `;
      messages.push({ role: "user", content: followUpPrompt });

    // Modo Normal (Traductor Puesto Base)
    } else {
      messages.push({ role: "system", content: SYSTEM_PROMPT });
      const prompt = `
        Petición del Usuario:
        - Intent (Tipo): ${type}
        - Target Language: ${target_language}
        - Text to process: "${text}"
      `;
      messages.push({ role: "user", content: prompt });
    }

    // Petición Agnostica al Proxy de OpenRouter (Usando Gemini 2.5)
    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Translator Pro"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        temperature: Number(temperature) || 0.7,
        max_tokens: Number(max_tokens) || 500,
        response_format: { type: "json_object" }
      })
    });

    if (!orResponse.ok) {
        const errText = await orResponse.text();
        throw new Error(`OpenRouter Error: ${errText}`);
    }

    const dataInfo = await orResponse.json();
    const cleanJsonString = dataInfo.choices[0].message.content.trim().replace(/^```json/, "").replace(/```$/, "");
    const parsedData = JSON.parse(cleanJsonString);

    return NextResponse.json(parsedData);
    
  } catch (error: unknown) {
    console.error("OpenRouter API Error:", error);
    const errMessage = error instanceof Error ? error.message : "Error inesperado al invocar OpenRouter";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
