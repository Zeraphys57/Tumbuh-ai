"use client";
import { useState } from "react";

interface AIPromptOptimizerProps {
  currentPrompt: string;
  setPrompt: (newPrompt: string) => void;
  clientId: string; // [FIX 🟢]: Wajib untuk validasi Auth & Kuota di Backend
}

interface OptimizationResult {
  optimized_prompt: string;
  improvements: string[];
}

export default function AIPromptOptimizer({ currentPrompt, setPrompt, clientId }: AIPromptOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const MAX_CHARS = 8000;

  const runOptimizer = async () => {
    setLocalError(null);

    if (!currentPrompt || currentPrompt.trim().length < 10) {
      setLocalError("Tuliskan instruksi minimal beberapa kata dulu ya Kak.");
      return;
    }

    if (currentPrompt.length > MAX_CHARS) {
      setLocalError("Prompt sudah terlalu panjang untuk dioptimasi. Gunakan RAG (Neural Injector) untuk informasi tambahan.");
      return;
    }

    setIsOptimizing(true);
    setResult(null);

    try {
      const response = await fetch('/api/addons-api/AIPromptOptimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // [FIX 🟢]: Kirim clientId ke backend
        body: JSON.stringify({ currentPrompt, clientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data AI Server");
      }

      if (data.optimization.optimized_prompt.length > MAX_CHARS) {
        setLocalError("Hasil optimasi terlalu panjang. Coba ringkas instruksi awal Anda.");
        return;
      }

      setResult(data.optimization);

    } catch (error: any) {
      console.error("Prompt Optimizer failed", error);
      setLocalError(error.message || "AI Optimizer sedang sibuk. Coba sebentar lagi ya!");
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyPrompt = () => {
    if (result) {
      setPrompt(result.optimized_prompt);
      setResult(null); 
    }
  };

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a] rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)] transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(59,130,246,0.5)] mb-6 h-fit flex flex-col group z-10">
      
      {/* GLOWING ORB BACKGROUND */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-125 group-hover:bg-blue-500/30"></div>
      
      {/* HEADER SECTION */}
      <div className="relative z-10 p-6 flex justify-between items-start border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(96,165,250,0.8)]"></span>
              Optimization Engine
            </span>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Core Addon</span>
          </div>
          <h2 className="text-xl font-black text-white italic tracking-tight leading-none mb-1 drop-shadow-md">
            Prompt <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Optimizer</span>
          </h2>
          <p className="text-slate-400 text-[10px] font-medium mt-1">
            Ubah instruksi sederhana menjadi System Prompt tingkat tinggi.
          </p>
        </div>

        <button
          onClick={runOptimizer}
          disabled={isOptimizing}
          className={`flex-shrink-0 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center gap-2 border ${
            isOptimizing 
              ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-white/10 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:from-blue-500 hover:to-indigo-500'
          }`}
        >
          {isOptimizing ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin"></span> Processing</>
          ) : (
            <>✨ Enhance Prompt</>
          )}
        </button>
      </div>

      {/* BODY SECTION */}
      <div className="p-6 flex-1 flex flex-col relative z-10 bg-[#060913]/50">
        {localError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[9px] font-bold tracking-widest uppercase text-center animate-in fade-in zoom-in-95 backdrop-blur-md">
            ⚠️ {localError}
          </div>
        )}

        {isOptimizing ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-32">
              <svg className="w-10 h-10 mb-3 text-blue-500 animate-spin drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] italic animate-pulse text-blue-400">Re-engineering Persona...</p>
           </div>
        ) : result ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 shadow-inner backdrop-blur-sm relative overflow-hidden">
                {/* Accent line on the left */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  Improvements Made ({result.optimized_prompt.length} chars):
                </p>
                <ul className="space-y-2 mb-5">
                  {result.improvements.map((imp, idx) => (
                    <li key={idx} className="text-[11px] text-slate-300 font-medium flex items-start gap-2 leading-relaxed">
                      <span className="text-blue-400 mt-[2px] text-xs">✦</span> {imp}
                    </li>
                  ))}
                </ul>

                <button 
                   onClick={applyPrompt}
                   className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/50 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                 >
                  <svg className="w-4 h-4 transition-transform group-hover/btn:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Apply to Master Prompt
                </button>
            </div>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-32 text-center group-hover:text-slate-400 transition-colors duration-500">
              <svg className="w-10 h-10 mb-3 opacity-20 text-blue-400 group-hover:opacity-40 transition-opacity duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-[11px] font-bold italic text-slate-500 text-center px-4 leading-relaxed max-w-xs">
                Tekan tombol di atas untuk menyulap instruksi Anda menjadi <span className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]">Master Prompt</span> profesional.
              </p>
           </div>
        )}
      </div>
    </div>
  );
}