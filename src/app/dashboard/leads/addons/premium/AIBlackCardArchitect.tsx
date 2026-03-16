"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AIBlackCardProps {
  clientId: string;
  leads: Lead[];
}

interface VIPProgram {
  tier_name: string;
  target_audience: string;
  pricing_model: string;
  core_perks: string[];
  pitch_script: string;
}

export default function AIBlackCardArchitect({ clientId, leads }: AIBlackCardProps) {
  const [isArchitecting, setIsArchitecting] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [programs, setPrograms] = useState<VIPProgram[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // STATE UNTUK CUSTOM MODAL & KUOTA
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadDataAndQuota() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        // Ambil data yang tersimpan
        const { data: savedData } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "black_card")
          .maybeSingle();

        if (savedData && savedData.content) {
          const parsedData = typeof savedData.content === 'string' ? JSON.parse(savedData.content) : savedData.content;
          setPrograms(parsedData);
        }

        // Ambil sisa kuota Premium klien
        const { data: clientData } = await supabase
          .from("clients")
          .select("premium_quota_left")
          .eq("id", clientId)
          .maybeSingle();
          
        if (clientData) {
          setQuotaLeft(clientData.premium_quota_left);
        }
      } catch (err) {
        console.error("Gagal menarik data Black Card:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadDataAndQuota();
  }, [clientId, supabase]);

  // FUNGSI TRIGGER (Membuka Modal atau Langsung Jalan)
  const handleRunClick = () => {
    if (leads.length === 0) {
      alert("Belum ada data leads untuk dianalisa, Bos!");
      return;
    }
    
    if (programs.length > 0) {
      setShowModal(true); // Buka Custom Modal Mewah!
    } else {
      executeArchitectEngine(); // Langsung jalan kalau belum ada data
    }
  };

  // FUNGSI EKSEKUSI ASLI (Dipanggil dari dalam Modal)
  const executeArchitectEngine = async () => {
    setShowModal(false); // Tutup modal
    setIsArchitecting(true);

    try {
      const response = await fetch('/api/addons-api/AIBlackCard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: leads,
          clientId: clientId 
        }),
      });

      const data = await response.json();

      // Tangkap Error Kuota Habis
      if (response.status === 403) {
        alert(data.error);
        setIsArchitecting(false);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Gagal mengambil data dari AI Server");

      const newPrograms: VIPProgram[] = data.vipPrograms;

      // Update UI & Kuota
      setPrograms(newPrograms);
      if (data.remainingQuota !== undefined) setQuotaLeft(data.remainingQuota);

      // Auto-Save ke DB
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "black_card",
        content: newPrograms
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Architect Engine failed", error);
      alert("Waduh, koneksi ke Otak AI terputus. Coba lagi ya Bos!");
    } finally {
      setIsArchitecting(false);
    }
  };

  const deleteAllPrograms = async () => {
    setPrograms([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "black_card");
    } catch (err) {
      console.error("Gagal menghapus", err);
    }
  };

  const copyScript = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-black rounded-[2.5rem] border border-amber-900/30 animate-pulse mb-10"></div>;
  }

  return (
    <>
      {/* --- CUSTOM CONFIRMATION MODAL (IMPERIAL GOLD UI) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0c] border border-amber-500/40 rounded-[2rem] p-8 max-w-md w-full shadow-[0_0_80px_rgba(217,119,6,0.25)] transform transition-all animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Modal Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-yellow-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-amber-950/50 rounded-2xl flex items-center justify-center border border-amber-500/30 mb-6 mx-auto shadow-inner">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight italic">Rancang Ulang VIP?</h3>
              <p className="text-sm text-amber-200/70 text-center mb-8 leading-relaxed font-medium">
                Mendesain program baru akan <strong className="text-white">menghapus blueprint lama</strong> dan memotong <strong className="text-amber-400">1 Kuota Premium</strong> Anda.
                {quotaLeft !== null && <span className="block mt-2 text-xs text-amber-500">Sisa kuota saat ini: {quotaLeft}x</span>}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={executeArchitectEngine} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-black bg-gradient-to-r from-amber-500 to-yellow-600 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all active:scale-95 border border-yellow-400/20"
                >
                  Gunakan Kuota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- KOMPONEN UTAMA --- */}
      <div className="relative overflow-hidden bg-[#0a0a0c] rounded-[2.5rem] border border-amber-600/30 shadow-2xl transition-all duration-1000 hover:shadow-[0_0_100px_rgba(217,119,6,0.15)] mb-10 h-fit flex flex-col group">
        
        {/* Efek Obsidian & Imperial Gold */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-start border-b border-amber-500/20 bg-black/60 backdrop-blur-xl">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-gradient-to-r from-yellow-700 via-amber-400 to-yellow-600 text-black text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                CLASSIFIED • APEX TIER
              </span>
              <span className="text-amber-500/70 text-[10px] font-bold uppercase tracking-widest italic">Recurring Wealth Engine</span>
            </div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2 drop-shadow-lg">
              Black Card <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600">Architect</span>
            </h2>
            <p className="text-amber-100/50 text-xs font-medium max-w-xl leading-relaxed">
              Menganalisis {leads?.length || 0} data percakapan untuk merancang program <strong>Berlangganan (High-Ticket/Retainer)</strong> eksklusif. Mengubah pembeli eceran menjadi sumber *passive income* bulanan perusahaan Anda.
            </p>

            {/* TAMPILAN SISA KUOTA DI HEADER */}
            {quotaLeft !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
                <p className="text-[10px] font-mono text-yellow-500/80">Sisa Kuota Premium: <strong className="text-yellow-400">{quotaLeft}</strong></p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {programs.length > 0 && !isArchitecting && (
                <button 
                  onClick={deleteAllPrograms}
                  className="p-4 rounded-2xl bg-black/50 text-amber-700 hover:text-red-500 hover:bg-red-500/10 border border-amber-900/50 hover:border-red-500/30 transition-all shadow-md backdrop-blur-md"
                  title="Hapus Semua Blueprint"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}

              {/* TOMBOL UTAMA YANG MEMICU MODAL */}
              <button
                onClick={handleRunClick}
                disabled={isArchitecting || (!leads || leads.length === 0)}
                className={`flex-shrink-0 px-8 py-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 border ${
                  isArchitecting 
                    ? 'bg-black text-amber-500/50 border-amber-900/50 cursor-not-allowed shadow-inner' 
                    : 'bg-gradient-to-br from-amber-500 via-yellow-600 to-yellow-800 text-white hover:scale-[1.02] active:scale-95 border-transparent shadow-[0_0_30px_rgba(217,119,6,0.3)] hover:shadow-[0_0_50px_rgba(251,191,36,0.5)]'
                }`}
              >
                {isArchitecting ? (
                  <><span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></span> Structuring...</>
                ) : programs.length > 0 ? (
                  <>🔁 Re-Architect Models</>
                ) : (
                  <>👑 Design VIP Retainer</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 flex-1 flex flex-col relative z-10 bg-black/40">
          {isArchitecting ? (
             <div className="flex-1 flex flex-col items-center justify-center text-amber-500/80 h-72">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                   <div className="absolute inset-0 border-[1px] border-amber-500/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
                   <div className="absolute inset-4 border-[2px] border-dashed border-yellow-600/50 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                   <svg className="w-10 h-10 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 animate-pulse">
                  Crafting High-Ticket Offers...
                </p>
             </div>
          ) : programs.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              
              {programs.map((prog, idx) => (
                <div key={idx} className="bg-gradient-to-b from-[#141416] to-black border border-amber-700/30 rounded-[2rem] p-8 hover:border-amber-500/60 transition-all group relative overflow-hidden flex flex-col">
                  
                  {/* Glow VIP dalam card */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors"></div>

                  <div className="relative z-10 flex-1 flex flex-col">
                      <span className="self-start bg-black text-amber-500 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-amber-500/40 mb-4 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        Blueprint {idx + 1}
                      </span>
                      
                      <h3 className="text-2xl font-black text-white leading-tight mb-2 pr-6">
                        {prog.tier_name}
                      </h3>
                      
                      <div className="mb-6">
                         <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                           {prog.pricing_model}
                         </p>
                      </div>

                      <div className="mb-6 space-y-3">
                         <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest border-b border-amber-900/50 pb-2">Target Market & Perks</p>
                         <p className="text-xs text-slate-400 mb-3">{prog.target_audience}</p>
                         <ul className="space-y-2">
                           {prog.core_perks.map((perk, pIdx) => (
                             <li key={pIdx} className="flex items-start gap-2 text-xs text-amber-100/80 font-medium">
                               <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                               {perk}
                             </li>
                           ))}
                         </ul>
                      </div>

                      <div className="mt-auto pt-4 border-t border-amber-900/40">
                         <div className="flex justify-between items-center mb-2">
                           <p className="text-[9px] text-amber-500/70 uppercase tracking-widest font-black">
                             Private Pitch Script
                           </p>
                           <button 
                              onClick={() => copyScript(idx, prog.pitch_script)}
                              className="text-[9px] bg-amber-900/30 hover:bg-amber-600 text-amber-400 hover:text-black px-2 py-1 rounded transition-colors font-bold uppercase tracking-widest flex items-center gap-1"
                            >
                              {copiedIndex === idx ? "Copied" : "Copy"}
                           </button>
                         </div>
                         <p className="text-[11px] text-slate-300 italic leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5">
                           "{prog.pitch_script}"
                         </p>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-amber-600/30 h-64 text-center">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <p className="text-sm font-black uppercase tracking-[0.3em] italic">Awaiting Raw Data to Transmute.</p>
             </div>
          )}
        </div>
      </div>
    </>
  );
}