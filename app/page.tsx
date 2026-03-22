import TranslatorBox from "@/components/translator/TranslatorBox";

export default function Home() {
  return (
    <main className="min-h-screen relative bg-background dark:bg-mesh-dark bg-mesh-light text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col items-center gap-10 z-10 mt-10 mb-20">
        
        <div className="text-center">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-4 text-zinc-900 dark:text-white">
             AI Translator <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">Pro</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Tu compañero personal para dominar idiomas. Traduce expresiones del mundo real, descubre modismos locales y practica conversando sin miedo a equivocarte.
          </p>
        </div>
        
        <TranslatorBox />
        
      </div>
    </main>
  );
}
