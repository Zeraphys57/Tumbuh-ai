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
    const textToCopy = `Q: ${q}\nA: ${a}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // --- FUNGSI BARU: Mengubah Markdown jadi HTML yang Rapi (DARK MODE READY) ---
  const formatMarkdown = (text: string) => {
    if (!text) return { __html: "" };
    
    let formattedText = text.replace(/\\n/g, '\n');
    
    // [FIX 🟢]: Warna bold disesuaikan ke Sky Blue Glowing untuk dark mode
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-sky-400 font-black not-italic drop-shadow-[0_0_5px_rgba(56,189,248,0.4)]">$1</strong>');
    
    formattedText = formattedText.replace(/\n/g, '<br/>');

    return { __html: formattedText };
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-white/5 rounded-[2.5rem] border border-white/10 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-[#0a0f1a] rounded-[2.5rem] border border-white/10 shadow-[0_0_40px_-15px_rgba(14,165,233,0.3)] transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(14,165,233,0.5)] mb-10 h-fit flex flex-col group z-10">
      
      {/* GLOWING ORB BACKGROUND */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-600/20 rounded-full blur-[80px] pointer-events-none -z-0 transition-transform duration-700 group-hover:scale-125 group-hover:bg-sky-500/30"></div>

      <div className="relative z-10 p-8 flex justify-between items-start border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-sky-500/10 text-sky-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.2)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(56,189,248,0.8)]"></span>
              Standard Core
            </span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Self-Learning AI</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-none mb-1 pr-10 drop-shadow-md">
            Training <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">Copilot</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium mt-1">
            Deteksi pertanyaan yang belum bisa dijawab AI, lalu tambahkan ke database.
          </p>
        </div>

        <div className="flex items-center gap-3">
           {faqs.length > 0 && !isScanning && (
             <button 
               onClick={deleteCopilotData}
               className="p-3.5 rounded-[1.2rem] bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all shadow-sm"
               title="Reset Hasil Scan"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
           )}

           <button
             onClick={runKnowledgeScan}
             disabled={isScanning || leads.length === 0}
             className={`flex-shrink-0 px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center gap-2 border ${
               isScanning || leads.length === 0
                 ? 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed' 
                 : 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-white/10 shadow-[0_0_20px_rgba(14,165,233,0.4)] hover:shadow-[0_0_30px_rgba(14,165,233,0.6)] hover:from-sky-500 hover:to-blue-500'
             }`}
           >
             {isScanning ? (
               <><span className="w-3.5 h-3.5 border-2 border-white/20 border-t-sky-400 rounded-full animate-spin"></span> Evaluating...</>
             ) : faqs.length > 0 ? (
               <>🔁 Re-Audit Brain</>
             ) : (
               <>🧠 Audit AI Brain</>
             )}
           </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-[#060913]/50">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-40">
              <svg className="w-10 h-10 mb-4 text-sky-500 animate-spin drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse text-sky-400">Mencari Celah Informasi...</p>
           </div>
        ) : faqs.length > 0 ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-sky-500/70 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-400 rounded-full shadow-[0_0_5px_rgba(251,146,60,0.8)]"></span>
              Blind Spots Ditemukan
            </p>
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 shadow-inner hover:border-sky-400/30 transition-all duration-300 group/card relative overflow-hidden">
                {/* Accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-blue-500 opacity-50 group-hover/card:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <span className="inline-block bg-red-500/10 text-red-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-red-500/20 mb-2">
                      Sering Ditanyakan ({faq.occurrence}x)
                    </span>
                    <h4 className="text-white font-black text-sm leading-tight italic drop-shadow-sm">
                      "{faq.question}"
                    </h4>
                  </div>
                  <button 
                    onClick={() => copyToBrain(idx, faq.question, faq.suggested_answer)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border ${
                       copiedIndex === idx 
                         ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-none' 
                         : 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500 hover:text-white hover:border-sky-400 hover:shadow-[0_0_15px_rgba(14,165,233,0.5)]'
                    }`}
                  >
                    {copiedIndex === idx ? "✓ Copied" : "Copy to AI"}
                  </button>
                </div>

                <div className="bg-black/20 rounded-xl p-4 border border-white/5 relative">
                   <div className="absolute top-0 left-4 -translate-y-1/2 bg-[#0d1322] px-2 text-[8px] font-black text-sky-400 uppercase tracking-widest italic flex items-center gap-1 border border-white/10 rounded-md">
                      ✨ Suggested Answer
                   </div>
                   
                   <p 
                     className="text-xs text-slate-300 italic leading-relaxed font-medium mt-1"
                     dangerouslySetInnerHTML={formatMarkdown(faq.suggested_answer)}
                   />
                </div>
              </div>
            ))}
            
            <p className="text-[10px] text-center text-slate-500 font-bold mt-4">
              *Klik tombol "Copy to AI", lalu paste-kan ke dalam kotak AI Trainer di sebelah kanan.
            </p>
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-40 text-center group-hover:text-slate-400 transition-colors duration-500">
              <svg className="w-12 h-12 mb-3 opacity-20 text-sky-400 group-hover:opacity-40 transition-opacity duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold italic text-slate-500 leading-relaxed drop-shadow-md">
                Bot kamu sudah sangat pintar!<br/>Tidak ditemukan celah pertanyaan saat ini.
              </p>
           </div>
        )}
      </div>
    </div>
  );
}