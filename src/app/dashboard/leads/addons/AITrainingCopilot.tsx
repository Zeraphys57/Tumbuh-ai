"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AITrainingCopilotProps {
  clientId: string;
  leads: Lead[];
}

interface FAQSuggestion {
  question: string;
  suggested_answer: string;
  occurrence: number;
}

export default function AITrainingCopilot({ clientId, leads }: AITrainingCopilotProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [faqs, setFaqs] = useState<FAQSuggestion[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN DARI DATABASE
  useEffect(() => {
    async function loadSavedFaqs() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "training_copilot")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setFaqs(parsedData);
        }
      } catch (err) {
        console.error("Gagal menarik data Copilot:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedFaqs();
  }, [clientId, supabase]);

  // 2. FUNGSI AUDIT KE BACKEND AI & SIMPAN KE DB
  const runKnowledgeScan = async () => {
    if (leads.length === 0) {
      alert("Belum ada data percakapan untuk di-audit!");
      return;
    }

    if (faqs.length > 0) {
      const confirmRegen = confirm("Audit ulang akan menghapus draft FAQ sebelumnya. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AITrainingCopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }), // Tidak perlu clientId karena pakai Flash
      });

      if (!response.ok) throw new Error("Gagal mengambil data AI Server");

      const data = await response.json();
      const realFaqs: FAQSuggestion[] = data.faqs;

      // Update UI & Auto-Save
      setFaqs(realFaqs);
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "training_copilot",
        content: realFaqs
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Knowledge Scan failed", error);
      alert("Gagal memindai chat. AI sedang sibuk!");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. FUNGSI HAPUS DATA (RESET)
  const deleteCopilotData = async () => {
    setFaqs([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "training_copilot");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  const copyToBrain = (idx: number, q: string, a: string) => {
    // Saat di-copy, kita tetap meng-copy versi aslinya (raw) agar bersih saat di-paste ke kotak AI
    const textToCopy = `Q: ${q}\nA: ${a}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- FUNGSI BARU: Mengubah Markdown jadi HTML yang Rapi ---
  const formatMarkdown = (text: string) => {
    if (!text) return { __html: "" };
    
    // 1. Ubah literal \n menjadi baris baru (enter) sesungguhnya
    let formattedText = text.replace(/\\n/g, '\n');
    
    // 2. Ganti **Teks** menjadi cetak tebal dengan warna Sky Blue (warna tema)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-700 font-black not-italic">$1</strong>');
    
    // 3. Ubah setiap enter (\n) menjadi tag <br/> agar turun baris di layar
    formattedText = formattedText.replace(/\n/g, '<br/>');

    return { __html: formattedText };
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-slate-50 rounded-[2.5rem] border border-slate-200 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-xl transition-all duration-500 hover:shadow-[0_20px_50px_-15px_rgba(14,165,233,0.15)] mb-10 h-fit flex flex-col group">
      
      {/* Ornamen Bersih (Clean UI) */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-bl-full pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-110"></div>

      <div className="relative z-10 p-8 flex justify-between items-start border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span>
              Standard Core
            </span>
            <span className="text-sky-500 text-[10px] font-bold uppercase tracking-widest italic">Self-Learning AI</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 italic tracking-tight leading-none mb-1 pr-10">
            Training <span className="text-sky-500">Copilot</span>
          </h2>
          <p className="text-slate-500 text-[11px] font-medium mt-1">
            Deteksi pertanyaan yang belum bisa dijawab AI, lalu tambahkan ke database.
          </p>
        </div>

        <div className="flex items-center gap-3">
           {faqs.length > 0 && !isScanning && (
             <button 
               onClick={deleteCopilotData}
               className="p-3.5 rounded-[1.2rem] bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all shadow-sm"
               title="Reset Hasil Scan"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
           )}

           <button
             onClick={runKnowledgeScan}
             disabled={isScanning || leads.length === 0}
             className={`flex-shrink-0 px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 border ${
               isScanning 
                 ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                 : 'bg-sky-500 text-white hover:bg-sky-600 border-transparent hover:shadow-sky-500/30 hover:shadow-lg'
             }`}
           >
             {isScanning ? (
               <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Evaluating...</>
             ) : faqs.length > 0 ? (
               <>🔁 Re-Audit Brain</>
             ) : (
               <>🧠 Audit AI Brain</>
             )}
           </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-slate-50/50">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40">
              <svg className="w-10 h-10 mb-4 text-sky-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse text-sky-500">Mencari Celah Informasi...</p>
           </div>
        ) : faqs.length > 0 ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Blind Spots Ditemukan
            </p>
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm hover:border-sky-300 transition-all group/card">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div>
                    <span className="inline-block bg-red-50 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-red-100 mb-2">
                      Sering Ditanyakan ({faq.occurrence}x)
                    </span>
                    <h4 className="text-slate-800 font-black text-sm leading-tight italic">
                      "{faq.question}"
                    </h4>
                  </div>
                  <button 
                    onClick={() => copyToBrain(idx, faq.question, faq.suggested_answer)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                       copiedIndex === idx 
                         ? 'bg-green-50 text-green-600 border-green-200 shadow-none' 
                         : 'bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-500 hover:text-white hover:shadow-md'
                    }`}
                  >
                    {copiedIndex === idx ? "✓ Copied" : "Copy to AI"}
                  </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative">
                   <div className="absolute top-0 left-4 -translate-y-1/2 bg-slate-50 px-2 text-[8px] font-black text-sky-500 uppercase tracking-widest italic flex items-center gap-1 border border-slate-100 rounded-md">
                      ✨ Suggested Answer
                   </div>
                   
                   {/* RENDER MENGGUNAKAN formatMarkdown */}
                   <p 
                     className="text-xs text-slate-600 italic leading-relaxed font-medium"
                     dangerouslySetInnerHTML={formatMarkdown(faq.suggested_answer)}
                   />
                   
                </div>
              </div>
            ))}
            
            <p className="text-[9px] text-center text-slate-400 font-bold mt-4">
              *Klik tombol "Copy to AI", lalu paste-kan ke dalam kotak AI Trainer di sebelah kanan.
            </p>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40 text-center">
              <svg className="w-12 h-12 mb-3 opacity-30 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold italic text-slate-500">Bot kamu sudah sangat pintar!<br/>Tidak ditemukan celah pertanyaan saat ini.</p>
           </div>
        )}
      </div>
    </div>
  );
}