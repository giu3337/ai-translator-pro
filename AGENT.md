# Reglas del Orquestador

## Contexto del Proyecto
Estamos construyendo un AI Translator Pro con Next.js 14 (App Router), Tailwind y Framer Motion.

## Reglas de Oro (No negociables)
1. **Plan Mode First:** Antes de escribir CUALQUIER código, describe qué archivos vas a crear o modificar y espera mi "OK".
2. **Modularidad:** No crees archivos de más de 150 líneas. Si un componente es grande, divídelo.
3. **Tipado:** Usa TypeScript estricto. No permitas el uso de `any`.
4. **Clean UI:** Usa Tailwind y respeta una paleta de colores minimalista (Negro, Blanco, Gris de fondo, un color de acento).
5. **Testing:** Todo componente lógico debe tener una estructura que permita testing.

## Flujo de Trabajo
1. Lee `PRD.md` para entender el objetivo.
2. Lee `ARCHITECTURE.md` para saber qué librerías usar.
3. Lee `SYSTEM_PROMPT.md` para configurar la llamada a la API.