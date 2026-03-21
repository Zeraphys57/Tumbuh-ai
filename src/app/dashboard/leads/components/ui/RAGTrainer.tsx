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

  // Fungsi showToast yang Epic
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
        showToast("File terlalu besar! Maksimal 10MB.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        return;
      }

      const isPDF = selectedFile.type === "application/pdf";
      const isMD = selectedFile.name.toLowerCase().endsWith(".md") || selectedFile.type === "text/markdown";

      if (!isPDF && !isMD) {
        showToast("Hanya file PDF atau Markdown (.md) yang diperbolehkan.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFile(null);
        return;
      }

      setFile(selectedFile);
      showToast(`${selectedFile.name} siap disuntikkan!`, "info");
    }
  };

  const handleUpload = async () => {
    // [FIX CLAUDE]: Validasi clientId & file
    if (!file || !clientId) {
      showToast("Data tidak lengkap. Gagal mengunggah.", "error");
      return;
    }

    setLoading(true);
    showToast("⏳ Sedang membedah dan mempelajari data...", "info");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const res = await fetch("/api/upload-knowledge", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mengunggah.");

      showToast(`✅ Berhasil mempelajari "${file.name}"`, "success");
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
    
    // [FIX CLAUDE]: Optimistic UI - Hapus langsung dari list
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
      
      showToast(`🗑️ Memori ${docToDelete} telah dihapus.`, "success");
    } catch (error) {
      console.error("Delete error:", error);
      // Rollback jika gagal
      setSavedDocs(previousDocs);
      showToast("❌ Gagal menghapus memori.", "error");
    } finally {
      setIsDeleting(false);
      setDocToDelete(null); 
      fetchDocuments(); // Sinkronisasi akhir dengan DB
    }
  };

  return (
    <>
      {/* FLOATING TOAST UI */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-[fadeIn_0.3s_ease-out]">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest border backdrop-blur-md transition-all ${
            toast.type === 'error' ? 'bg-red-600/95 text-white border-red-500 shadow-red-500/20' : 
            toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400 shadow-emerald-500/20' : 
            'bg-blue-600/95 text-white border-blue-500 shadow-blue-500/20'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : '⏳'}</span>
            {toast.message}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 w-full relative overflow-hidden">
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
            🧠 Neural Injector (RAG)
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
            Suntikkan SOP, Menu, atau FAQ bisnis (PDF/MD) ke otak AI.
          </p>
        </div>

        {/* DROPZONE */}
        <div className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${file ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}`}>
          <input type="file" accept=".pdf,.md" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          
          {!file ? (
            <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Klik untuk pilih PDF atau Markdown</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-black text-slate-800">{file.name}</p>
              <button onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value = ""; }} className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-3 hover:text-red-600">Batal Ganti File</button>
            </div>
          )}
        </div>

        <div className="mt-3 px-2 text-center">
          <p className="text-[9px] text-slate-500 font-medium italic leading-relaxed">
            *Khusus dokumen tebal & panjang (SOP, Katalog Produk, Maks 10MB). <br/>
            Format yang didukung: <span className="text-blue-500 font-bold">PDF & Markdown (.md)</span>
          </p>
        </div>

        <button onClick={handleUpload} disabled={!file || loading} className={`mt-4 w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex justify-center items-center gap-2 ${!file || loading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-blue-600 shadow-xl active:scale-95"}`}>
          {loading ? "Mengekstrak Neural Data..." : "Suntikkan Ke Memori 🚀"}
        </button>

        {/* LIST DOKUMEN */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Neural Memory Database</h3>
          
          {isLoadingDocs ? (
             <div className="text-[10px] font-bold text-slate-400 italic">Memuat data...</div>
          ) : savedDocs.length === 0 ? (
             <div className="text-[10px] font-bold text-slate-400 italic">Belum ada dokumen yang dipelajari AI.</div>
          ) : (
             <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
               {savedDocs.map((docName, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-2xl group hover:border-blue-200 transition-colors">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-xs font-bold text-slate-700 truncate">{docName}</p>
                     </div>
                     <button 
                       onClick={() => setDocToDelete(docName)}
                       className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shrink-0 opacity-50 group-hover:opacity-100"
                       title="Hapus Dokumen"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                  </div>
               ))}
             </div>
          )}
        </div>
      </div>

      {/* MODAL DELETE */}
      {docToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 transform transition-all animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-red-100/50">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800 text-center tracking-tight mb-3">Hapus Memori?</h3>
            <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed mb-8 uppercase tracking-widest">
              Tindakan ini akan menghapus dokumen <br/><span className="text-blue-600 italic break-all">"{docToDelete}"</span> secara permanen.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} disabled={isDeleting} className="w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-95 flex justify-center items-center gap-2">
                {isDeleting ? "Menghapus Data..." : "Ya, Hapus Permanen!"}
              </button>
              <button onClick={() => setDocToDelete(null)} disabled={isDeleting} className="w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}