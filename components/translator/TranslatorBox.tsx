"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Languages, Loader2, Sparkles, RefreshCcw, Copy, Check, Settings as SettingsIcon } from "lucide-react";

interface TranslationResult {
  original_text: string;
  translated_text: string;
  detected_language: string;
  alternatives: string[];
  explanation: string;
}

export default function TranslatorBox() {
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Inglés");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // IA Settings
  const [showSettings, setShowSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          type: "Traducción y Explicación",
          temperature,
          max_tokens: maxTokens
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error de la IA al procesar.");
      }

      setResult(data);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado al conectar con el servidor.";
      setError(errMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleTranslate();
    }
  };

  const handleCopy = async () => {
    if (!result?.translated_text) return;
    try {
      await navigator.clipboard.writeText(result.translated_text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    setError(null);
    setIsCopied(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl bg-white/70 dark:bg-zinc-900/60 border border-white/50 dark:border-zinc-800/50"
    >
      <div className="p-6 sm:p-10 relative">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div 
              key="inputbox"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 relative z-10"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Languages size={18} />
                  Texto Origen
                </h2>
                <div className="flex items-center gap-2">
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
                          Creatividad <span className="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 rounded-md">{temperature}</span>
                        </label>
                        <input 
                          type="range" 
                          min="0" max="1" step="0.1" 
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between mt-2 text-[11px] font-medium text-zinc-400">
                          <span>Conservador</span><span>Creativo</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wider">
                          Límite de Tokens <span className="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 rounded-md">{maxTokens}</span>
                        </label>
                        <input 
                          type="range" 
                          min="50" max="2500" step="50"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between mt-2 text-[11px] font-medium text-zinc-400">
                          <span>Corto</span><span>Extenso</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative group mt-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type anything to translate it magically..."
                  className="w-full h-40 resize-none bg-transparent border-none outline-none text-2xl sm:text-4xl placeholder-zinc-300 dark:placeholder-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 leading-tight transition-all"
                />
              </div>

              <div className="flex justify-between items-end mt-6">
                <span className="text-xs text-zinc-400/80 font-mono hidden sm:block tracking-wide">Press <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Cmd</kbd> + <kbd className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Enter</kbd></span>
                <button
                  onClick={handleTranslate}
                  disabled={isLoading || !text.trim()}
                  className="w-full sm:w-auto ml-auto group flex justify-center items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Sparkles className="group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" size={20} />
                  )}
                  <span>{isLoading ? "Analizando Contexto..." : "Traducir Mágicamente"}</span>
                </button>
              </div>
              
              {error && (
                <motion.p initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium mt-4 border border-red-200 dark:border-red-900/50 text-center">
                  {error}
                </motion.p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="resultbox"
              initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-8 relative z-10"
            >
              <div className="flex justify-between items-center pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-500" />
                    Traducción al {targetLanguage}
                  </h2>
                  <span className="text-xs text-zinc-400 mt-1 font-medium">
                    Detectado base: <strong className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">{result.detected_language}</strong>
                  </span>
                </div>
                
                <button 
                  onClick={handleReset} 
                  className="text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-zinc-800 p-2.5 rounded-full shadow-sm hover:rotate-180 duration-500 ease-in-out border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 focus:outline-none"
                  title="Nueva Traducción"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>

              <div className="flex items-start justify-between gap-6">
                <h3 className="text-4xl sm:text-5xl text-zinc-900 dark:text-white font-black leading-tight tracking-tight">
                  {result.translated_text}
                </h3>
                <button 
                  onClick={handleCopy}
                  className="flex items-center justify-center p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-sm"
                  title="Copiar traducción"
                >
                  {isCopied ? <Check size={22} className="text-green-500" /> : <Copy size={22} />}
                </button>
              </div>

              <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md p-6 rounded-3xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-inner">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  <ArrowRight size={18} className="text-purple-500" /> Variaciones de nivel nativo
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {result.alternatives.map((alt, idx) => (
                    <motion.span 
                      whileHover={{ scale: 1.05, y: -2 }}
                      key={idx} 
                      className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-100 shadow-sm cursor-default transition-colors hover:border-purple-400 dark:hover:border-purple-500"
                    >
                      {alt}
                    </motion.span>
                  ))}
                </div>
              </div>

              <div className="mt-2 pr-4">
                <h4 className="text-xs font-bold uppercase tracking-widest mb-3 text-blue-500 dark:text-blue-400">
                  Desglose Cultural & Gramatical
                </h4>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-[16px] font-medium">
                  {result.explanation}
                </p>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
