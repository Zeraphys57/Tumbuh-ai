"use client";
import React, { useState, useRef, useEffect } from "react";

interface AITrainerProps {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleUpdatePrompt: () => void;
  isSaving: boolean;
  setShowToast: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AITrainer({ 
  prompt, 
  setPrompt, 
  handleUpdatePrompt, 
  isSaving,
  setShowToast
}: AITrainerProps) {

  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  const isPdfJsLoading = useRef(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_CHARS = 8000;
  const isOverLimit = prompt.length > MAX_CHARS;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);
    const MAX_SIZE = 2 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      setLocalError("File Overlimit (Max 2MB). Use RAG for Large Files.");
      return;
    }
    setFileName(file.name);
    setIsParsing(true);

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPrompt((prev) => `${prev}\n\n[Data ${file.name}]:\n${ev.target?.result}`);
        setIsParsing(false);
        triggerToast();
      };
      reader.readAsText(file);
    } 
    else if (file.type === "application/pdf") {
      try {
        if (!(window as any).pdfjsLib && !isPdfJsLoading.current) {
          isPdfJsLoading.current = true;
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
          isPdfJsLoading.current = false;
        }
        if (!(window as any).pdfjsLib) throw new Error("PDF Parser Load Failed");
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        if (!fullText.trim() || fullText.length < 10) throw new Error("OCR Failed: No readable text found.");
        setPrompt((prev) => `${prev}\n\n[Data ${file.name}]:\n${fullText}`);
        setIsParsing(false);
        triggerToast();
      } catch (error: any) {
        setIsParsing(false);
        setLocalError(error.message || "PDF Read Error.");
      }
    } else {
      setIsParsing(false);
      setLocalError("Unsupported Format! Use .txt or .pdf");
    }
  };

  return (
    <>
      {/* WRAPPER UTAMA: Glassmorphism Dark Mode */}
      <div className="bg-slate-900/40 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white h-fit border border-slate-800/60 sticky top-8 z-0 overflow-hidden group">
        
        {/* Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all duration-700"></div>

        {/* HEADER AI TRAINER */}
        <div className="flex items-start justify-between mb-8 gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)] flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-xl italic uppercase tracking-tighter text-white drop-shadow-md">AI Trainer</h3>
              <p className="text-[9px] text-blue-400/60 uppercase tracking-[0.2em] font-black mt-0.5 italic">Behavior & Fast-Context Node</p>
            </div>
          </div>
          
          {/* TOMBOL UPLOAD HYBRID */}
          <div className="flex flex-col items-end">
            <label className={`cursor-pointer p-3 rounded-xl transition-all border shadow-lg flex-shrink-0 relative ${isParsing ? 'bg-orange-500/20 border-orange-500 animate-pulse' : 'bg-slate-800 border-slate-700 hover:bg-blue-600 hover:border-blue-400'}`}>
              <svg className={`w-5 h-5 ${isParsing ? 'text-orange-400' : 'text-blue-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="hidden" disabled={isParsing} />
            </label>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic mt-2">
              {isParsing ? "Injecting..." : "Quick PDF"}
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE LOCAL */}
        {localError && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-400 text-[10px] font-black tracking-widest uppercase flex items-center justify-between backdrop-blur-md animate-in slide-in-from-top-2 duration-300">
            <span className="flex items-center gap-2">⚠️ {localError}</span>
            <button onClick={() => setLocalError(null)} className="text-red-400 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* AREA TEXTAREA */}
        <div className="space-y-5 relative z-10">
          <div className="flex justify-between items-end px-1">
            <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.3em] italic">System Instructions</p>
            <button 
              onClick={() => setShowClearModal(true)}
              className="text-[9px] text-red-500/70 hover:text-red-400 transition-all uppercase tracking-widest font-black flex items-center gap-1.5 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Format Memory
            </button>
          </div>

          <div className="relative group/text">
            {/* Glow Dinamis: Berubah Merah kalau Overlimit */}
            <div className={`absolute inset-0 rounded-[2rem] blur-xl transition-all duration-500 pointer-events-none ${isOverLimit ? 'bg-red-500/20 opacity-100' : 'bg-blue-500/5 group-hover/text:bg-blue-500/10 opacity-100'}`}></div>
            
            <textarea 
              className={`relative w-full h-[250px] bg-slate-950/80 rounded-[2rem] p-6 text-[11px] font-bold border focus:ring-4 outline-none transition-all leading-relaxed resize-none shadow-inner custom-scrollbar ${isOverLimit ? 'text-red-200 border-red-500/50 focus:border-red-500 focus:ring-red-500/10' : 'text-slate-300 border-slate-800 focus:border-blue-500/50 focus:ring-blue-500/10'}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="// Define personality, logic, and short context here..."
              spellCheck={false}
            />
          </div>

          {/* INDICATOR & COUNTER */}
          <div className="flex items-center justify-between px-2">
             <p className="text-[9px] text-slate-500 font-black italic tracking-tight opacity-70">
                *Max 8k chars. Use RAG for massive datasets.
             </p>
             <div className={`text-[10px] font-black tracking-[0.1em] px-3 py-1 rounded-full border ${isOverLimit ? 'text-red-400 border-red-500/30 bg-red-500/5 animate-pulse' : 'text-slate-500 border-slate-800 bg-slate-900/50'}`}>
                {prompt.length.toLocaleString()} <span className="opacity-40">/</span> {MAX_CHARS.toLocaleString()}
             </div>
          </div>

          <button 
            onClick={() => {
              handleUpdatePrompt();
              setFileName(null);
            }} 
            disabled={isSaving || isParsing || isOverLimit}
            className="w-full mt-2 bg-blue-600 text-white border border-blue-400/50 py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all active:scale-95 italic disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:shadow-none shadow-[0_10px_30px_rgba(37,99,235,0.3)]"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-3">
                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Syncing Node...
              </span>
            ) : isOverLimit ? (
              "❌ BUFFER OVERFLOW: USE RAG"
            ) : (
              "Deploy Intelligence"
            )}
          </button>
        </div>
      </div>

      {/* CUSTOM MODAL: Bersihkan Memori */}
      {showClearModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-sm p-10 transform transition-all animate-in zoom-in-95 duration-300 border border-slate-800">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            
            <h3 className="text-2xl font-black text-white text-center tracking-tighter mb-4 uppercase italic">Wipe Neural Path?</h3>
            <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed mb-10 uppercase tracking-widest italic">
              Ini akan menghapus seluruh instruksi kustom di memori utama chatbot ini secara permanen.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setPrompt("");
                  setFileName(null);
                  setShowClearModal(false);
                }}
                className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 italic border border-red-400/30"
              >
                CONFIRM WIPE
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 bg-slate-800 hover:bg-slate-700 hover:text-slate-300 transition-all active:scale-95 italic border border-slate-700/50"
              >
                ABORT MISSION
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}