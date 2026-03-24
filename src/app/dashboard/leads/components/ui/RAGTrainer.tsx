"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface RAGTrainerProps {
  clientId: string; 
}

export default function RAGTrainer({ clientId }: RAGTrainerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [savedDocs, setSavedDocs] = useState<string[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State untuk Modern Toast & Ref Timer
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  // Fungsi showToast yang Epic (Dark Mode)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchDocuments = useCallback(async () => {
    if (!clientId) return;
    setIsLoadingDocs(true);
    
    const { data, error } = await supabase
      .from("client_knowledge")
      .select("document_name")
      .eq("client_id", clientId);

    if (data && !error) {
      const uniqueDocs = Array.from(new Set(data.map(d => d.document_name)));
      setSavedDocs(uniqueDocs);
    }
    setIsLoadingDocs(false);
  }, [clientId, supabase]);

  useEffect(() => {
    fetchDocuments();
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const MAX_SIZE = 10 * 1024 * 1024; 
      if (selectedFile.size > MAX_SIZE) {
        showToast("Data Overload! Maksimal 10MB per Injeksi.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        return;
      }

      const isPDF = selectedFile.type === "application/pdf";
      const isMD = selectedFile.name.toLowerCase().endsWith(".md") || selectedFile.type === "text/markdown";

      if (!isPDF && !isMD) {
        showToast("Format Ditolak! Gunakan PDF atau Markdown (.md).", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        return;
      }

      setFile(selectedFile);
      showToast(`Data "${selectedFile.name}" siap disuntikkan!`, "info");
    }
  };

  const handleUpload = async () => {
    if (!file || !clientId) {
      showToast("Node Klien tidak valid. Gagal memproses.", "error");
      return;
    }

    setLoading(true);
    showToast("⏳ Mengekstrak Neural Data...", "info");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const res = await fetch("/api/upload-knowledge", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mengunggah.");

      showToast(`✅ Database berhasil menyerap "${file.name}"`, "success");
      setFile(null); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      fetchDocuments();
    } catch (err: any) {
      console.error("Upload error:", err.message);
      showToast("❌ Gagal menyuntikkan data. Coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete || !clientId) return;
    
    // Optimistic UI - Hapus langsung dari list
    const previousDocs = [...savedDocs];
    setSavedDocs(prev => prev.filter(d => d !== docToDelete));
    
    setIsDeleting(true);

    try {
      const res = await fetch("/api/delete-knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, documentName: docToDelete })
      });
      
      if (!res.ok) throw new Error("Gagal menghapus");
      
      showToast(`🗑️ Sektor memori ${docToDelete} telah dibersihkan.`, "success");
    } catch (error) {
      console.error("Delete error:", error);
      setSavedDocs(previousDocs); // Rollback
      showToast("❌ Gagal menghapus sektor memori.", "error");
    } finally {
      setIsDeleting(false);
      setDocToDelete(null); 
      fetchDocuments(); // Sinkronisasi akhir
    }
  };

  return (
    <>
      {/* FLOATING TOAST UI - DARK MODE NEON */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-[fadeIn_0.3s_ease-out]">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border backdrop-blur-md transition-all ${
            toast.type === 'error' ? 'bg-red-900/90 text-red-100 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 
            toast.type === 'success' ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 
            'bg-blue-900/90 text-blue-100 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : '⏳'}</span>
            <span className="truncate max-w-[250px] md:max-w-none">{toast.message}</span>
          </div>
        </div>
      )}

      {/* WRAPPER UTAMA - GLASSMORPHISM */}
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800/60 p-8 w-full relative overflow-hidden group">
        
        {/* Glow Background */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none transition-all duration-700 group-hover:bg-indigo-600/20"></div>

        <div className="mb-8 relative z-10">
          <h2 className="text-xl font-black text-white flex items-center gap-3 italic uppercase tracking-tighter drop-shadow-md">
            <span className="text-2xl drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">🧠</span> Neural Injector (RAG)
          </h2>
          <p className="text-[10px] font-black text-indigo-400/80 mt-1.5 uppercase tracking-[0.2em] italic">
            Suntikkan SOP, Menu, atau FAQ bisnis (PDF/MD) ke Memori Utama AI.
          </p>
        </div>

        {/* DROPZONE - CYBERPUNK STYLE */}
        <div className={`relative z-10 border-2 border-dashed rounded-[2rem] p-8 text-center transition-all duration-300 ${file ? "border-indigo-500 bg-indigo-900/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]" : "border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800/50"}`}>
          <input type="file" accept=".pdf,.md" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          
          {!file ? (
            <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <svg className="w-10 h-10 text-slate-600 mb-3 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Klik untuk pilih PDF / Markdown</p>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
              <svg className="w-12 h-12 text-indigo-400 mb-3 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-black text-white">{file.name}</p>
              <button onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="text-[9px] text-red-400 font-black uppercase tracking-widest mt-4 hover:text-red-300 transition-colors bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20 active:scale-95">Batal & Ganti Target</button>
            </div>
          )}
        </div>

        <div className="mt-4 px-2 text-center relative z-10">
          <p className="text-[9px] text-slate-500 font-bold italic leading-relaxed uppercase tracking-wider">
            *Khusus dokumen tebal & panjang (Maks 10MB). <br/>
            Format Enkripsi: <span className="text-indigo-400 font-black">PDF & Markdown (.md)</span>
          </p>
        </div>

        {/* UPLOAD BUTTON */}
        <button 
          onClick={handleUpload} 
          disabled={!file || loading} 
          className={`mt-6 w-full py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-3 relative z-10 border italic ${
            !file || loading 
            ? "bg-slate-800/50 text-slate-600 border-slate-700 cursor-not-allowed" 
            : "bg-indigo-600 text-white border-indigo-400/50 hover:bg-indigo-500 shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-95"
          }`}
        >
          {loading ? (
             <span className="flex items-center gap-3">
               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Mengekstrak Data...
             </span>
          ) : (
             "Suntikkan Ke Memori 🚀"
          )}
        </button>

        {/* LIST DOKUMEN - DATABASE NODE */}
        <div className="mt-10 pt-8 border-t border-slate-800/60 relative z-10">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            Neural Memory Database
          </h3>
          
          {isLoadingDocs ? (
             <div className="text-[10px] font-bold text-slate-500 italic animate-pulse">Scanning server nodes...</div>
          ) : savedDocs.length === 0 ? (
             <div className="text-[10px] font-bold text-slate-600 italic border border-slate-800/50 border-dashed rounded-2xl p-6 text-center bg-slate-900/30">Belum ada memori terenkripsi.</div>
          ) : (
             <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
               {savedDocs.map((docName, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl group hover:border-indigo-500/40 transition-colors backdrop-blur-sm">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-shadow">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-xs font-bold text-slate-300 truncate group-hover:text-white transition-colors">{docName}</p>
                     </div>
                     <button 
                       onClick={() => setDocToDelete(docName)}
                       className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-500 flex items-center justify-center hover:text-red-400 hover:border-red-500/50 hover:bg-red-900/30 transition-all shrink-0 opacity-40 group-hover:opacity-100 shadow-sm active:scale-95"
                       title="Hapus Sektor Memori"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
               ))}
             </div>
          )}
        </div>
      </div>

      {/* MODAL DELETE - CYBERPUNK WIPE WARNING */}
      {docToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-sm p-10 transform transition-all animate-in zoom-in-95 duration-300 border border-slate-800">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            
            <h3 className="text-2xl font-black text-white text-center tracking-tighter mb-4 uppercase italic">Hapus Memori?</h3>
            <p className="text-[11px] font-bold text-slate-400 text-center leading-relaxed mb-10 uppercase tracking-widest italic">
              Tindakan ini akan memusnahkan dokumen <br/><span className="text-red-400 drop-shadow-sm font-black break-all">"{docToDelete}"</span> dari server AI.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting} 
                className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 flex justify-center items-center gap-2 italic border border-red-400/30"
              >
                {isDeleting ? "Wiping Data..." : "CONFIRM WIPE"}
              </button>
              <button 
                onClick={() => setDocToDelete(null)} 
                disabled={isDeleting} 
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