import fs from "fs";

const envFile = fs.readFileSync(".env.local", "utf8");
const match = envFile.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : "";

async function checkModels() {
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(listUrl);
    const data = await res.json();
    
    if (data.error) {
      console.error("API ERROR:", data.error.message);
      return;
    }
    
    console.log("AVAILABLE MODELS:", data.models?.map((m: {name: string}) => m.name).join("\n"));
  } catch(e) { console.error(e); }
}

checkModels();
