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
  
  // STATE UNTUK CUSTOM MODAL (Pengganti confirm() bawaan browser)
  const [showClearModal, setShowClearModal] = useState(false);

  // REFS UNTUK PERBAIKAN BUG
  const isPdfJsLoading = useRef(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // BATAS MAKSIMAL KARAKTER SYSTEM PROMPT (Agar tidak boros token & tidak lemot)
  const MAX_CHARS = 8000;
  const isOverLimit = prompt.length > MAX_CHARS;

  // Cleanup Timeout mencegah Memory Leak (Bug Fix #4)
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

    // Bug Fix #3: Validasi ukuran file (Max 2MB untuk System Prompt)
    const MAX_SIZE = 2 * 1024 * 1024; 
    if (file.size > MAX_SIZE) {
      setLocalError("File terlalu besar (Maks 2MB). Gunakan fitur Neural Injector (RAG) di bawah untuk file besar.");
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
        // Bug Fix #1: Mencegah Race Condition saat load script PDF.js
        if (!(window as any).pdfjsLib && !isPdfJsLoading.current) {
          isPdfJsLoading.current = true;
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
          isPdfJsLoading.current = false;
        }

        // Tunggu sebentar memastikan object global tersedia
        if (!(window as any).pdfjsLib) throw new Error("Gagal memuat PDF parser");

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
        
        // Bug Fix #2: Mencegah PDF Hasil Scan (Gambar) diam-diam gagal
        if (!fullText.trim() || fullText.length < 10) {
          throw new Error("PDF tidak berisi teks yang bisa dibaca (mungkin hasil scan gambar).");
        }
        
        setPrompt((prev) => `${prev}\n\n[Data ${file.name}]:\n${fullText}`);
        setIsParsing(false);
        triggerToast();
      } catch (error: any) {
        setIsParsing(false);
        setLocalError(error.message || "Gagal membaca PDF.");
      }
    } else {
      setIsParsing(false);
      setLocalError("Format tidak didukung! Harap masukkan file .txt atau .pdf");
    }
  };

  return (
    <>
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white h-fit border border-white/10 sticky top-8 z-0">
        
        {/* HEADER AI TRAINER */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] flex-shrink-0 border border-blue-400/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-xl italic uppercase tracking-tighter">AI Trainer</h3>
              <p className="text-[9px] text-blue-300/60 uppercase tracking-widest font-bold mt-0.5">Behavior & Fast-Context Node</p>
            </div>
          </div>
          
          {/* TOMBOL UPLOAD HYBRID */}
          <div className="flex flex-col items-end">
            <label className={`cursor-pointer p-3 rounded-xl transition-all border group shadow-lg flex-shrink-0 relative ${isParsing ? 'bg-orange-500 border-orange-400 animate-pulse' : 'bg-white/5 hover:bg-blue-600 border-white/10'}`}>
              <svg className={`w-5 h-5 ${isParsing ? 'text-white' : 'text-blue-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="hidden" disabled={isParsing} />
            </label>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic mt-2">
              {isParsing ? "Membaca..." : "Suntik PDF Cepat"}
            </p>
          </div>
        </div>

        {/* ERROR MESSAGE LOCAL */}
        {localError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-[10px] font-bold tracking-widest uppercase flex items-center justify-between">
            <span>{localError}</span>
            <button onClick={() => setLocalError(null)} className="text-red-400 hover:text-red-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* AREA TEXTAREA */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] italic">System Instructions</p>
            <button 
              onClick={() => setShowClearModal(true)} // Memicu Custom Modal (Bug Fix #5)
              className="text-[9px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-70 hover:opacity-100"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear
            </button>
          </div>

          <div className="relative group">
            <div className={`absolute inset-0 rounded-[2rem] blur-md transition-all pointer-events-none ${isOverLimit ? 'bg-red-500/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'}`}></div>
            <textarea 
              className={`relative w-full h-[250px] bg-black/40 rounded-[2rem] p-6 text-[11px] font-mono border focus:ring-4 outline-none transition-all leading-relaxed resize-none shadow-inner scrollbar-hide ${isOverLimit ? 'text-red-100 border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'text-blue-50 border-white/5 focus:border-blue-500/40 focus:ring-blue-500/10'}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="// Ketik kepribadian AI atau paste info singkat di sini..."
              spellCheck={false}
            />
          </div>

          {/* INDICATOR & CHARACTER COUNTER (Bug Fix #6) */}
          <div className="flex items-center justify-between px-2">
             <p className="text-[9px] text-slate-500 font-medium italic leading-relaxed">
               *Khusus sifat AI & konteks pendek. Dokumen besar wajib via RAG.
             </p>
             <div className={`text-[10px] font-black tracking-widest flex items-center gap-2 ${isOverLimit ? 'text-red-400' : 'text-slate-400'}`}>
                {prompt.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                {isOverLimit && <span className="animate-pulse">⚠️ OVERLOAD</span>}
             </div>
          </div>

          <button 
            onClick={() => {
              handleUpdatePrompt();
              setFileName(null);
            }} 
            disabled={isSaving || isParsing || isOverLimit} // Tombol mati jika Over Limit!
            className="w-full mt-2 bg-blue-600 border border-blue-500 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 hover:border-white hover:-translate-y-1 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] italic disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:transform-none disabled:shadow-none"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                 <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Syncing Trainer...
              </span>
            ) : isOverLimit ? (
              "❌ KAPASITAS PENUH: GUNAKAN RAG"
            ) : (
              "Deploy Trainer"
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          CUSTOM UI MODAL UNTUK CLEAR PROMPT (PENGGANTI CONFIRM)
      ======================================================== */}
      {showClearModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 transform transition-all animate-in zoom-in-95 duration-200 border border-slate-700">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-red-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            
            <h3 className="text-2xl font-black text-white text-center tracking-tight mb-3">Format Ulang AI?</h3>
            <p className="text-[11px] font-bold text-slate-400 text-center leading-relaxed mb-8 uppercase tracking-widest">
              Tindakan ini akan menghapus seluruh instruksi dan sifat AI di kotak atas secara permanen.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setPrompt("");
                  setFileName(null);
                  setShowClearModal(false);
                }}
                className="w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Ya, Bersihkan Memori
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                className="w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}