import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, target_language } = await req.json();
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json({ error: "Falta configurar OPENROUTER_API_KEY en .env.local" }, { status: 401 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Faltan mensajes interactivos en la petición" }, { status: 400 });
    }

    const systemPrompt = `
      Eres un amigable profesor y compañero de intercambio de idiomas nativo. 
      El usuario está aprendiendo a hablar tu idioma nativo: ${target_language}.
      Tu objetivo:
      1. Si el usuario comete un error gramatical o de vocabulario grave en su idioma al escribirte, corrígelo brevemente de forma muy amable antes de continuar la charla.
      2. Responde a su conversación de forma natural, interesante y humana en el idioma ${target_language} (usa emojis sutiles).
      3. Hazle una pregunta corta de vuelta o dale hilo a la conversación para que siga practicando.
      4. Mantén tus respuestas cortas y digeribles (1 a 3 párrafos como máximo), como en una app de mensajería inmersiva (WhatsApp). No des manuales largos.
    `;

    const mappedMessages = [];
    mappedMessages.push({ role: "system", content: systemPrompt });

    // Seed context
    mappedMessages.push({ role: "assistant", content: "¡Claro! Entendido. Empecemos a platicar." });

    // Build chat history matching OpenRouter spec
    for (const msg of messages) {
       mappedMessages.push({
         role: msg.role === "tutor" ? "assistant" : "user",
         content: msg.content
       });
    }

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
        messages: mappedMessages,
        temperature: 0.8,
        max_tokens: 2048,
      })
    });

    if (!orResponse.ok) {
        const errText = await orResponse.text();
        throw new Error(`OpenRouter Error: ${errText}`);
    }

    const dataInfo = await orResponse.json();
    const reply = dataInfo.choices[0].message.content;

    return NextResponse.json({ reply });

  } catch (error: unknown) {
    console.error("Tutor API OpenRouter Error:", error);
    return NextResponse.json(
      { error: "El tutor no pudo responder libremente. " + (error instanceof Error ? error.message : "") },
      { status: 500 }
    );
  }
}
