# Data Model

## Message Object (Typescript Interface)
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string; // El JSON del System Prompt o el input del usuario
  timestamp: number;
  type: 'translation' | 'chat';
}

## Translation Settings
interface Settings {
  model: "gpt-4o" | "gpt-4-turbo";
  temperature: number; // 0 para precisión, 0.7 para fluidez
  max_tokens: number;
  target_language: string;
}