"use client";
import { useState } from "react";

interface AIPromptOptimizerProps {
  currentPrompt: string;
  setPrompt: (newPrompt: string) => void; // Fungsi untuk mengubah teks di AITrainer
}

interface OptimizationResult {
  optimized_prompt: string;
  improvements: string[];
}

export default function AIPromptOptimizer({ currentPrompt, setPrompt }: AIPromptOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const runOptimizer = async () => {
    setIsOptimizing(true);
    setResult(null);

    try {
      const response = await fetch('/api/addons-api/AIPromptOptimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPrompt }),
      });

      if (!response.ok) throw new Error("Gagal mengambil data AI Server");

      const data = await response.json();
      setResult(data.optimization);

    } catch (error) {
      console.error("Prompt Optimizer failed", error);
      alert("AI Optimizer sedang sibuk. Coba sebentar lagi ya!");
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyPrompt = () => {
    if (result) {
      setPrompt(result.optimized_prompt); // Ini akan langsung mengubah isi kotak AITrainer!
      setResult(null); // Tutup hasil setelah di-apply
    }
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-[2.5rem] border border-blue-200 shadow-lg transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.15)] mb-6 h-fit flex flex-col group z-10">
      
      {/* Ornamen Clean UI */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-50 rounded-br-full pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-110"></div>
      
      <div className="relative z-10 p-6 flex justify-between items-start border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              Standard Core
            </span>
            <span className="text-blue-500 text-[10px] font-bold uppercase tracking-widest italic">Prompt Engineering</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 italic tracking-tight leading-none mb-1">
            Prompt <span className="text-blue-500">Optimizer</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-medium mt-1">
            Sihir instruksi sederhana Anda menjadi System Prompt tingkat dewa agar bot makin cerdas.
          </p>
        </div>

        <button
          onClick={runOptimizer}
          disabled={isOptimizing}
          className={`flex-shrink-0 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 border ${
            isOptimizing 
              ? 'bg-slate-50 text-slate-400 border-slate-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700 border-transparent hover:shadow-blue-500/30 hover:shadow-lg'
          }`}
        >
          {isOptimizing ? (
            <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Optimizing...</>
          ) : (
            <>✨ Enhance Prompt</>
          )}
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col relative z-10 bg-slate-50/50">
        {isOptimizing ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-32">
              <svg className="w-8 h-8 mb-3 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic animate-pulse text-blue-600">Writing Guardrails...</p>
           </div>
        ) : result ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm">
               <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-blue-50 pb-2">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                 AI Improvements Made:
               </p>
               <ul className="space-y-1 mb-4">
                 {result.improvements.map((imp, idx) => (
                   <li key={idx} className="text-[10px] text-slate-600 font-medium flex items-start gap-1.5">
                     <span className="text-blue-500 mt-0.5">•</span> {imp}
                   </li>
                 ))}
               </ul>

               <button 
                  onClick={applyPrompt}
                  className="w-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-transparent py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Apply to AI Brain
                </button>
            </div>
            <p className="text-[8px] text-center text-slate-400 font-bold">
              *Klik tombol di atas untuk langsung menimpa instruksi di kotak AI Trainer. Jangan lupa klik "Save Prompt" setelahnya.
            </p>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-32 text-center">
              <svg className="w-8 h-8 mb-2 opacity-30 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <p className="text-[10px] font-bold italic text-slate-500">Klik tombol di atas untuk menyempurnakan<br/>instruksi bot Anda.</p>
           </div>
        )}
      </div>
    </div>
  );
}