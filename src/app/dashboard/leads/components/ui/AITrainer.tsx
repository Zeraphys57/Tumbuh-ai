"use client";
import React, { useState } from "react";

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPrompt((prev) => `${prev}\n\n[Data ${file.name}]:\n${ev.target?.result}`);
        setIsParsing(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      };
      reader.readAsText(file);
    } 
    else if (file.type === "application/pdf") {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
        }
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
        
        setPrompt((prev) => `${prev}\n\n[Data ${file.name}]:\n${fullText}`);
        setIsParsing(false);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        setIsParsing(false);
        alert("Gagal membaca PDF. Pastikan file berbasis teks (bukan hasil scan gambar).");
      }
    } else {
      setIsParsing(false);
      alert("Format tidak didukung! Harap masukkan file .txt atau .pdf");
    }
  };

  // Fungsi tambahan untuk mengosongkan prompt dengan aman
  const handleClearPrompt = () => {
    if (confirm("Kosongkan seluruh instruksi AI? (Aksi ini tidak bisa di-undo)")) {
      setPrompt("");
      setFileName(null);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-white h-fit border border-white/10 sticky top-8 z-0">
      
      {/* HEADER AI TRAINER */}
      <div className="flex items-start justify-between mb-8 gap-4">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] flex-shrink-0 border border-blue-400/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M4 15V9a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-xl italic uppercase tracking-tighter">AI Trainer</h3>
            <p className="text-[9px] text-blue-300/60 uppercase tracking-widest font-bold mt-0.5">Prompt Engineering Node</p>
          </div>
        </div>
        
        {/* AREA TOMBOL UPLOAD */}
        <div className="flex flex-col items-end">
          <label className={`cursor-pointer p-3 rounded-xl transition-all border group shadow-lg flex-shrink-0 relative ${isParsing ? 'bg-orange-500 border-orange-400 animate-pulse' : 'bg-white/5 hover:bg-blue-600 border-white/10'}`}>
            <svg className={`w-5 h-5 ${isParsing ? 'text-white' : 'text-blue-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input type="file" accept=".txt,.pdf" onChange={handleFileUpload} className="hidden" disabled={isParsing} />
          </label>
          
          <div className="mt-2 text-right">
            {isParsing ? (
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest animate-pulse italic">
                Parsing Data...
              </p>
            ) : fileName ? (
              <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest italic max-w-[100px] truncate" title={fileName}>
                {fileName}
              </p>
            ) : (
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest italic mt-1">
                Inject PDF/TXT
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AREA TEXTAREA */}
      <div className="space-y-4">
        
        <div className="flex justify-between items-end">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] italic">System Instructions</p>
          <button 
            onClick={handleClearPrompt}
            className="text-[9px] text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-70 hover:opacity-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear
          </button>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/10 rounded-[2rem] blur-md group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
          <textarea 
            className="relative w-full h-[320px] bg-black/40 rounded-[2rem] p-6 text-[11px] font-mono text-blue-50 border border-white/5 focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all leading-relaxed resize-none shadow-inner scrollbar-hide"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="// Ketik instruksi untuk AI di sini...&#10;// Contoh: Kamu adalah CS Tumbuh Tailor. Selalu jawab dengan ramah."
            spellCheck={false}
          />
        </div>

        <p className="text-[9px] text-slate-500 font-medium italic leading-relaxed text-center px-4">
          *File PDF/TXT yang di-upload akan otomatis diubah menjadi teks dan digabungkan ke kotak ini.
        </p>

        <button 
          onClick={() => {
            handleUpdatePrompt();
            setFileName(null);
          }} 
          disabled={isSaving || isParsing} 
          className="w-full mt-2 bg-blue-600 border border-blue-500 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:text-blue-600 hover:border-white hover:-translate-y-1 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] italic disabled:bg-slate-800 disabled:border-slate-700 disabled:text-slate-500 disabled:transform-none disabled:shadow-none"
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
               <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Syncing Brain...
            </span>
          ) : (
            "Deploy Intelligence"
          )}
        </button>
      </div>
    </div>
  );
}