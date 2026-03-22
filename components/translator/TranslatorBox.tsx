"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Languages, Loader2, Sparkles, RefreshCcw, Copy, Check, Settings as SettingsIcon, History, Send, Camera, Image as ImageIcon, X, Trash2, MessageCircle } from "lucide-react";

interface TranslationResult {
  original_text: string;
  translated_text: string;
  detected_language: string;
  alternatives: string[];
  explanation: string;
}

interface SavedTranslation {
  id: string;
  timestamp: number;
  text: string;
  targetLanguage: string;
  result: TranslationResult;
  imagePrompt?: string;
}

type TabMode = "translator" | "tutor";

interface ChatMessage {
  id: string;
  role: "user" | "tutor";
  content: string;
}

export default function TranslatorBox() {
  // Tabs State
  const [activeTab, setActiveTab] = useState<TabMode>("translator");

  // Translator State
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Inglés");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // IA Settings
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Modo Maestro y Persistencia Translator
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [history, setHistory] = useState<SavedTranslation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Generación de Imagen
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageResult, setImageResult] = useState<{ base64: string; prompt: string } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Tutor Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  // Cargar historiales de LocalStorage al inicio
  useEffect(() => {
    // History Traductor
    const savedTranslator = localStorage.getItem("ai_translator_history");
    if (savedTranslator) {
      try { setHistory(JSON.parse(savedTranslator)); } catch (e) { }
    }
    // History Tutor
    const savedTutor = localStorage.getItem("ai_tutor_history");
    if (savedTutor) {
      try { setChatHistory(JSON.parse(savedTutor)); } catch (e) { }
    }
  }, []);

  // --------------- LÓGICA TRADUCTOR ---------------
  const saveToHistory = (newText: string, newTarget: string, newResult: TranslationResult) => {
    const newItem: SavedTranslation = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      text: newText,
      targetLanguage: newTarget,
      result: newResult
    };
    setHistory((prev) => {
      const filtered = prev.filter(h => h.result.translated_text !== newResult.translated_text);
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem("ai_translator_history", JSON.stringify(updated));
      return updated;
    });
  };

  const loadFromHistory = (item: SavedTranslation) => {
    setText(item.text);
    setTargetLanguage(item.targetLanguage);
    setResult(item.result);
    setError(null);
    setQuestion("");
    setShowHistory(false);
    setImageResult(null);
    setImageError(null);
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem("ai_translator_history", JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllHistory = () => {
    if (window.confirm("¿Estás seguro de que quieres borrar todo tu historial de traducciones?")) {
      setHistory([]);
      localStorage.removeItem("ai_translator_history");
      setShowHistory(false);
    }
  };

  const handleTranslate = async (isFollowUp = false) => {
    if (!text.trim()) return;
    
    if (isFollowUp) setIsAsking(true);
    else setIsLoading(true);
    
    setError(null);
    setImageResult(null);
    setImageError(null);

    const activeResultBackup = result;
    if (!isFollowUp) setResult(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          temperature,
          max_tokens: maxTokens,
          previousTranslation: isFollowUp ? activeResultBackup : undefined,
          question: isFollowUp ? question : undefined
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error de la IA al procesar.");

      setResult(data);
      if (!isFollowUp) saveToHistory(text, targetLanguage, data);
      else setQuestion(""); 
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      if (isFollowUp) setIsAsking(false);
      else setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!result) return;
    setIsGeneratingImage(true);
    setImageError(null);

    const currentHistoryItem = history.find(h => h.result.translated_text === result.translated_text);
    const existingPrompt = currentHistoryItem?.imagePrompt;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translated_text: result.translated_text,
          existingPrompt
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || data.error.includes("No HUGGINGFACE_API_KEY")) {
           throw new Error("Agrega tu llave en .env.local (HUGGINGFACE_API_KEY) para habilitar esta fusión mágica externa.");
        }
        throw new Error(data.error || "Falla en el API de Imágenes.");
      }

      setImageResult({ base64: data.imageBase64, prompt: data.imagePrompt });

      setHistory(prev => {
        const updated = prev.map(h => 
          h.result.translated_text === result.translated_text ? { ...h, imagePrompt: data.imagePrompt } : h
        );
        localStorage.setItem("ai_translator_history", JSON.stringify(updated));
        return updated;
      });
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : "No se pudo generar la imagen fotorealista.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.translated_text) return;
    try {
      await navigator.clipboard.writeText(result.translated_text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {}
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    setError(null);
    setIsCopied(false);
    setQuestion("");
    setImageResult(null);
    setImageError(null);
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTranslate(false);
    }
  };

  const handleKeyDownQuestion = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTranslate(true);
    }
  };

  // --------------- LÓGICA TUTOR CHAT ---------------
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: chatInput.trim() };
    const updatedHistory = [...chatHistory, newUserMsg];
    
    setChatHistory(updatedHistory);
    setChatInput("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory,
          target_language: targetLanguage
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const newTutorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "tutor", content: data.reply };
      const finalHistory = [...updatedHistory, newTutorMsg];
      
      setChatHistory(finalHistory);
      localStorage.setItem("ai_tutor_history", JSON.stringify(finalHistory));

    } catch (err: unknown) {
      const newErrorMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: "tutor", 
        content: `⚠️ Error de Conexión: ${err instanceof Error ? err.message : "Error desconocido"}` 
      };
      setChatHistory([...updatedHistory, newErrorMsg]);
    } finally {
      setIsChatting(false);
    }
  };

  const clearTutorHistory = () => {
    if (window.confirm("¿Vaciar memoria del profesor y empezar una nueva clase?")) {
      setChatHistory([]);
      localStorage.removeItem("ai_tutor_history");
    }
  };


  return (
    <div className="w-full flex flex-col gap-6 items-center">
      
      {/* Controles de Navegación de Arquitectura */}
      <div className="flex bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-1.5 rounded-[2rem] border border-white/60 dark:border-zinc-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-max max-w-full overflow-x-auto relative z-20">
         <button 
           onClick={() => setActiveTab("translator")}
           className={`px-4 sm:px-6 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === "translator" ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
         >
           <Languages size={18} /> Traductor Rápido
         </button>
         <button 
           onClick={() => setActiveTab("tutor")}
           className={`px-4 sm:px-6 py-2.5 rounded-full font-bold text-sm sm:text-base transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === "tutor" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md shadow-purple-500/20" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
         >
           <MessageCircle size={18} /> Tutor Inmersivo
         </button>
      </div>

      <div className="relative w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* BLOQUE CENTRAL CONDICIONAL PESTAÑAS */}
        {activeTab === "translator" ? (
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex-1 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl bg-white/70 dark:bg-zinc-900/60 border border-white/50 dark:border-zinc-800/50 flex flex-col"
          >
            {/* VIEW A: TRADUCTOR CLASICO */}
            <div className="p-6 sm:p-10 flex-col flex h-full">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div 
                    key="inputbox"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4 relative z-10 w-full"
                  >
                    <div className="flex justify-between items-center pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                      <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <Languages size={18} /> Texto
                      </h2>
                      <div className="flex items-center gap-2">
                        {history.length > 0 && (
                          <button 
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-2 rounded-full transition-all md:hidden ${showHistory ? 'bg-zinc-200 text-zinc-800' : 'text-zinc-400 hover:bg-zinc-200/60'}`}
                            title="Ver Historial"
                          >
                            <History size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => setShowSettings(!showSettings)}
                          className={`p-2 rounded-full transition-all ${showSettings ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' : 'text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                          title="Ajustes de IA"
                        >
                          <SettingsIcon size={18} />
                        </button>
                        <div className="ml-2 bg-zinc-300 dark:bg-zinc-700 w-px h-5 hidden sm:block"></div>
                        <span className="text-xs text-zinc-500 ml-2 hidden sm:block font-medium">Traducir a:</span>
                        <select 
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value)}
                          className="bg-zinc-200/50 dark:bg-zinc-800/80 font-semibold text-sm py-2 px-3 sm:px-5 rounded-full border border-transparent outline-none focus:border-blue-500/50 transition-all cursor-pointer text-zinc-800 dark:text-zinc-200 backdrop-blur-md"
                        >
                          <option value="Inglés">Inglés</option>
                          <option value="Alemán">Alemán</option>
                          <option value="Portugués">Portugués</option>
                          <option value="Español">Español</option>
                          <option value="Italiano">Italiano</option>
                        </select>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showSettings && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: -10 }}
                          animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                          exit={{ height: 0, opacity: 0, marginTop: -10 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md p-5 rounded-2xl border border-white/60 dark:border-zinc-700/50 flex flex-col sm:flex-row gap-8 mb-2 shadow-inner">
                            <div className="flex-1">
                              <label className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wider">
                                Creatividad <span className="text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 rounded-md">{temperature}</span>
                              </label>
                              <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                              <div className="flex justify-between mt-2 text-[11px] font-medium text-zinc-400">
                                <span>Técnico</span><span>Fléxico</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wider">
                                Tokens <span className="text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 rounded-md">{maxTokens}</span>
                              </label>
                              <input 
                                type="range" 
                                min="256" max="8192" step="256"
                                value={maxTokens}
                                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                                className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="relative group mt-2">
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDownTextarea}
                        placeholder="Escribe textualmente o un modismo complejo..."
                        className="w-full h-40 resize-none bg-transparent border-none outline-none text-2xl sm:text-4xl placeholder-indigo-200 dark:placeholder-indigo-800/50 font-semibold text-slate-800 dark:text-slate-100 leading-tight transition-all focus:ring-0"
                      />
                    </div>

                    <div className="flex justify-between items-end mt-6">
                      <span className="text-xs text-zinc-400/80 hidden sm:block tracking-wide">Press <kbd className="bg-indigo-50/50 dark:bg-indigo-900/20 px-1 py-0.5 rounded border border-indigo-200/50">Cmd</kbd> + <kbd className="bg-indigo-50/50 dark:bg-indigo-900/20">Enter</kbd></span>
                      <button
                        onClick={() => handleTranslate(false)}
                        disabled={isLoading || !text.trim()}
                        className="w-full sm:w-auto ml-auto group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3.5 rounded-full font-bold shadow-lg"
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                        <span>Traducir Mágicamente</span>
                      </button>
                    </div>
                    {error && <motion.p className="text-red-500 text-center font-medium mt-4">{error}</motion.p>}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="resultbox"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-6 relative z-10 w-full"
                  >
                    <div className="flex justify-between items-center pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                      <div className="flex flex-col">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase flex items-center gap-2">
                          <Sparkles size={18} className="text-blue-500" /> Traducción al {targetLanguage}
                        </h2>
                        <span className="text-xs text-zinc-400 mt-1">Detectado: <strong className="text-purple-600">{result.detected_language}</strong></span>
                      </div>
                      <button onClick={handleReset} className="text-zinc-500 hover:text-blue-600 bg-white dark:bg-zinc-800 p-2.5 rounded-full">
                        <RefreshCcw size={18} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between gap-6">
                      <h3 className="text-4xl sm:text-5xl font-black leading-tight text-slate-800 dark:text-white drop-shadow-sm">
                        {result.translated_text}
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={handleGenerateImage} className="group relative p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-900/20 border border-indigo-200/50 dark:border-indigo-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                          {isGeneratingImage ? <Loader2 size={22} className="text-indigo-500 animate-spin" /> : <Camera size={22} className="text-indigo-600 dark:text-indigo-400 group-hover:rotate-3 transition-transform" />}
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white text-[10px] uppercase font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">Generar Foto (IA)</span>
                        </button>
                        <button onClick={handleCopy} className="group relative p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          {isCopied ? <Check size={22} className="text-emerald-600 dark:text-emerald-400 scale-110 transition-transform" /> : <Copy size={22} className="text-emerald-600 dark:text-emerald-400 group-hover:-rotate-3 transition-transform" />}
                          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white text-[10px] uppercase font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">{isCopied ? "¡Copiado!" : "Copiar Texto"}</span>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {imageResult && (
                        <motion.div className="text-center flex flex-col items-center bg-black/5 p-4 rounded-3xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageResult.base64} alt="Generado" className="rounded-2xl shadow-lg border-4 border-white/80 w-full max-w-sm object-cover" />
                          <p className="text-[10px] text-zinc-500/80 mt-1 italic max-w-xs truncate">&quot;{imageResult.prompt}&quot;</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30 shadow-inner mt-2 backdrop-blur-sm">
                      <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-indigo-900 dark:text-indigo-200"><ArrowRight size={18} className="text-purple-500" /> Variaciones nativas</h4>
                      <div className="flex flex-wrap gap-2.5">
                        {result.alternatives.map((alt, idx) => (
                          <span key={idx} className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-purple-500/20 dark:border-purple-400/20 px-4 py-2 rounded-full text-sm font-semibold text-zinc-800 dark:text-zinc-100 shadow-[0_2px_10px_rgba(168,85,247,0.05)] hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:border-purple-400/50 transition-all duration-300 cursor-default">{alt}</span>
                        ))}
                      </div>
                    </div>

                    <div className="pr-4">
                      <h4 className="text-xs font-bold text-blue-500 mb-3">Modo Maestro</h4>
                      <p className="text-zinc-700 leading-relaxed font-medium">{result.explanation}</p>
                    </div>

                    <div className="mt-2 bg-white/60 dark:bg-black/30 backdrop-blur-xl rounded-full p-2 flex items-center border border-blue-100 dark:border-blue-900/30 shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-within:border-blue-300 dark:focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDownQuestion}
                        placeholder="Escribe otra duda, ej. 'Explícame el tiempo verbal...'"
                        className="flex-1 bg-transparent px-4 border-none outline-none text-sm font-medium text-slate-800 dark:text-slate-200 placeholder-indigo-300 dark:placeholder-indigo-700"
                      />
                      <button onClick={() => handleTranslate(true)} className="bg-zinc-800 text-white p-2 rounded-full">
                        {isAsking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        ) : (

          /* VIEW B: TUTOR INMERSIVO CHAT */
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full flex-1 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl bg-white/70 dark:bg-zinc-900/60 border border-white/50 dark:border-zinc-800/50 flex flex-col h-[700px] max-h-[85vh]"
          >
            {/* Header del Chat */}
            <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center bg-white/30 dark:bg-zinc-900/30">
               <div className="flex items-center gap-3">
                 <div className="bg-gradient-to-tr from-purple-500 to-indigo-500 p-2 rounded-full text-white shadow-md">
                   <MessageCircle size={20} />
                 </div>
                 <div>
                   <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                     Profesor Nativo
                   </h2>
                   <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                     <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Online ({targetLanguage})</span>
                   </div>
                 </div>
               </div>
               <div className="flex gap-2">
                 <select 
                   value={targetLanguage}
                   onChange={(e) => setTargetLanguage(e.target.value)}
                   className="bg-white dark:bg-zinc-800 text-xs py-1.5 px-3 rounded-full border border-zinc-200 dark:border-zinc-700 outline-none"
                 >
                    <option value="Inglés">Inglés</option>
                    <option value="Alemán">Alemán</option>
                    <option value="Portugués">Portugués</option>
                    <option value="Español">Español</option>
                    <option value="Italiano">Italiano</option>
                 </select>
                 <button onClick={clearTutorHistory} className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-white dark:hover:bg-zinc-800" title="Reiniciar Sesión">
                   <Trash2 size={16} />
                 </button>
               </div>
            </div>

            {/* Area de Mensajes (Scroll) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar flex flex-col">
               {chatHistory.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center opacity-70 mt-10">
                   <div className="bg-white/50 dark:bg-zinc-800/50 p-6 rounded-3xl mb-4 border border-zinc-200/50">
                      <Sparkles size={40} className="text-purple-400 mx-auto opacity-70 mb-3" />
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">¡Hola! Soy tu tutor nativo de Inteligencia Artificial.</p>
                      <p className="text-xs mt-2 max-w-xs mx-auto">Comienza escribiendo para practicar tu {targetLanguage}. Te corregiré si te equivocas y seguiremos la plática.</p>
                   </div>
                 </div>
               ) : (
                 chatHistory.map((msg) => (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] sm:max-w-[75%] px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm border border-zinc-100 dark:border-zinc-700/50'}`}>
                       {msg.content}
                     </div>
                   </motion.div>
                 ))
               )}
               {isChatting && (
                 <div className="flex w-full justify-start">
                   <div className="max-w-[75%] px-5 py-5 rounded-3xl bg-white dark:bg-zinc-800 rounded-tl-sm border border-zinc-100 dark:border-zinc-700/50 shadow-sm flex gap-1.5 items-center">
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-zinc-400"></motion.span>
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-zinc-400"></motion.span>
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-zinc-400"></motion.span>
                   </div>
                 </div>
               )}
            </div>

            {/* Input de Envio de Chat */}
            <div className="p-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border-t border-white/50 dark:border-zinc-800/50">
              <div className="relative flex items-center bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-2 shadow-[0_2px_10px_rgb(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                  placeholder={`Escribe o responde en ${targetLanguage}...`}
                  className="flex-1 bg-transparent border-none outline-none px-4 py-2 font-medium text-zinc-800 dark:text-zinc-100 placeholder-zinc-400"
                />
                <button 
                  onClick={handleSendChat}
                  disabled={isChatting || !chatInput.trim()}
                  className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-md text-white rounded-full transition-all active:scale-95 disabled:opacity-50"
                  title="Enviar mensaje"
                >
                  <Send size={18} className={isChatting ? "opacity-50" : ""} />
                </button>
              </div>
            </div>
          </motion.div>

        )}

        {/* Panel Lateral: Historial (Solo en Modo Traductor o Abierto) */}
        <AnimatePresence>
          {activeTab === "translator" && (showHistory || (history.length > 0)) && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`w-full md:w-64 shrink-0 flex flex-col gap-3 ${showHistory ? 'block' : 'hidden md:flex'}`}
            >
              <div className="flex justify-between items-center px-2 mt-2">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <History size={16} /> Tus Traducciones
                </h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearAllHistory}
                    className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-white"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pb-10 custom-scrollbar pr-2">
                {history.map((item) => (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="group text-left w-full bg-white/40 dark:bg-black/20 backdrop-blur-md p-4 rounded-3xl border border-white/60 dark:border-zinc-700/50 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-blue-400/30 transition-all flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div 
                      onClick={(e) => deleteFromHistory(item.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-100/80 dark:bg-red-900/50 text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200 dark:hover:bg-red-800 hover:scale-110 z-10"
                    >
                      <X size={14} />
                    </div>
                    {item.imagePrompt && (
                      <div className="absolute bottom-2 right-2 p-1.5 opacity-40">
                         <ImageIcon size={10} className="text-blue-500" />
                      </div>
                    )}
                    <div className="flex justify-between items-center w-full pr-6">
                      <span className="text-[10px] uppercase font-bold text-blue-500">{item.targetLanguage}</span>
                    </div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm truncate w-full block">
                      &quot;{item.text}&quot;
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate w-full block">
                      {item.result.translated_text}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
