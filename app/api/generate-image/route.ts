import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const hfKey = process.env.HUGGINGFACE_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!hfKey) {
      return NextResponse.json({ error: "No HUGGINGFACE_API_KEY configured." }, { status: 401 });
    }

    const { translated_text, existingPrompt } = await req.json();

    if (!translated_text && !existingPrompt) {
      return NextResponse.json({ error: "No text provided to generate image." }, { status: 400 });
    }

    let finalImagePrompt = existingPrompt;

    // 1. Prompt Engineering Hybrid with OpenRouter Pipeline
    if (!finalImagePrompt) {
      if (!openRouterKey) {
         return NextResponse.json({ error: "Necesitas configurar OPENROUTER_API_KEY para redacción de Prompts Visuales" }, { status: 401 });
      }

      const promptRequest = `
        Toma este concepto o texto: "${translated_text}".
        Imagínalo visualmente y crea un "prompt" maestro muy descriptivo en INGLÉS PERFECTO para un generador de imágenes de Inteligencia Artificial (Stable Diffusion).
        Debe ser fotorealista, diseño en 8k, ultra detallado, iluminación volumétrica, cinemático.
        REGLA DE ORO: No digas absolutamente nada más en tu respuesta. Solo devuelve el prompt de la imagen en inglés y nada más.
      `;

      try {
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
            messages: [{ role: "user", content: promptRequest }],
            temperature: 0.8
          })
        });

        if (orResponse.ok) {
           const data = await orResponse.json();
           finalImagePrompt = data.choices[0].message.content.trim();
        } else {
           throw new Error("OpenRouter Fallback Hit");
        }
      } catch {
        // Fallback robust security
        console.warn("OpenRouter generation hit error. Usando traduccion como Fallback.");
        finalImagePrompt = `${translated_text}, photorealistic, maximum detail, 8k`;
      }
    }

    // 2. Generate Image with Hugging Face Inference API
    const hfResponse = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: finalImagePrompt }),
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      if (errText.includes("currently loading")) {
         throw new Error("El modelo de imagen está encendiendo en Hugging Face. Por favor, intenta de nuevo en 20 segundos.");
      }
      throw new Error(`HF Error: ${errText}`);
    }

    const blob = await hfResponse.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:${blob.type};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ imageBase64: base64Image, imagePrompt: finalImagePrompt });

  } catch (error: unknown) {
    console.error("Image Generation Error:", error);
    const errMessage = error instanceof Error ? error.message : "Error inesperado al generar la imagen";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
