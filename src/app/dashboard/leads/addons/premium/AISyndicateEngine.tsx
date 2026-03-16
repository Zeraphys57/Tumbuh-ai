"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_needs: string;
  full_chat?: string;
}

interface AISyndicateProps {
  clientId: string;
  leads: Lead[];
}

interface SyndicateBlueprint {
  partner_target: string;
  synergy_logic: string;
  monetization_model: string;
  b2b_pitch_script: string;
}

export default function AISyndicateEngine({ clientId, leads }: AISyndicateProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [syndicates, setSyndicates] = useState<SyndicateBlueprint[]>([]);
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
          .eq("addon_type", "syndicate_engine")
          .maybeSingle();

        if (savedData && savedData.content) {
          const parsedData = typeof savedData.content === 'string' ? JSON.parse(savedData.content) : savedData.content;
          setSyndicates(parsedData);
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
        console.error("Gagal menarik data Syndicate:", err);
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
    
    if (syndicates.length > 0) {
      setShowModal(true); // Buka Custom Modal Mewah!
    } else {
      executeSyndicateEngine(); // Langsung jalan kalau belum ada data
    }
  };

  // FUNGSI EKSEKUSI ASLI (Dipanggil dari dalam Modal)
  const executeSyndicateEngine = async () => {
    setShowModal(false); // Tutup modal
    setIsBuilding(true);

    try {
      const response = await fetch('/api/addons-api/AISyndicateEngine', {
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
        setIsBuilding(false);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Gagal mengambil data AI");

      const newSyndicates: SyndicateBlueprint[] = data.syndicates;

      // Update UI & Kuota
      setSyndicates(newSyndicates);
      if (data.remainingQuota !== undefined) setQuotaLeft(data.remainingQuota);

      // Auto-Save ke DB
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "syndicate_engine",
        content: newSyndicates
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Syndicate Engine failed", error);
      alert("Sistem Apex sibuk. Coba lagi bos!");
    } finally {
      setIsBuilding(false);
    }
  };

  // FIX: Mengubah delete individual menjadi delete all agar seragam dengan addon lain
  const deleteAllSyndicates = async () => {
    setSyndicates([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "syndicate_engine");
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
    return <div className="h-64 bg-black rounded-[2.5rem] border border-emerald-900/30 animate-pulse mb-10"></div>;
  }

  return (
    <>
      {/* --- CUSTOM CONFIRMATION MODAL (TOXIC GREEN UI) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#020a06] border border-emerald-500/40 rounded-[2rem] p-8 max-w-md w-full shadow-[0_0_80px_rgba(16,185,129,0.25)] transform transition-all animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Modal Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-green-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-950/50 rounded-2xl flex items-center justify-center border border-emerald-500/30 mb-6 mx-auto shadow-inner">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight italic">Bangun Ulang Aliansi?</h3>
              <p className="text-sm text-emerald-200/70 text-center mb-8 leading-relaxed font-medium">
                Memindai jaringan baru akan <strong className="text-white">menghapus draf aliansi lama</strong> dan memotong <strong className="text-emerald-400">1 Kuota Premium</strong> Anda.
                {quotaLeft !== null && <span className="block mt-2 text-xs text-emerald-500">Sisa kuota saat ini: {quotaLeft}x</span>}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={executeSyndicateEngine} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-black bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-[0_0_30px_rgba(52,211,153,0.4)] transition-all active:scale-95 border border-green-400/20"
                >
                  Gunakan Kuota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- KOMPONEN UTAMA --- */}
      <div className="relative overflow-hidden bg-[#020a06] rounded-[2.5rem] border border-emerald-600/30 shadow-2xl transition-all duration-1000 hover:shadow-[0_0_100px_rgba(16,185,129,0.15)] mb-10 h-fit flex flex-col group">
        
        {/* Efek Toxic Green / Monopoly */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-start border-b border-emerald-500/20 bg-black/60 backdrop-blur-xl">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-gradient-to-r from-emerald-700 via-green-400 to-emerald-600 text-black text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                CLASSIFIED • APEX TIER
              </span>
              <span className="text-emerald-500/70 text-[10px] font-bold uppercase tracking-widest italic">B2B Ecosystem Engine</span>
            </div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2 drop-shadow-lg">
              Syndicate <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-600">Architect</span>
            </h2>
            <p className="text-emerald-100/50 text-xs font-medium max-w-xl leading-relaxed">
              AI memindai kebutuhan tersembunyi pelanggan dan merancang Draf Aliansi B2B. Monopoli pasar lokal Anda dengan membangun jaringan partner yang saling membagi komisi & pelanggan.
            </p>

            {/* TAMPILAN SISA KUOTA DI HEADER */}
            {quotaLeft !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] font-mono text-emerald-500/80">Sisa Kuota Premium: <strong className="text-emerald-400">{quotaLeft}</strong></p>
              </div>
            )}
          </div>

          {/* --- FIX: GABUNGKAN TOMBOL DELETE & ACTION DI SINI --- */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {syndicates.length > 0 && !isBuilding && (
                <button 
                  onClick={deleteAllSyndicates}
                  className="p-4 rounded-2xl bg-black/50 text-emerald-700 hover:text-red-500 hover:bg-red-500/10 border border-emerald-900/50 hover:border-red-500/30 transition-all shadow-md backdrop-blur-md"
                  title="Hapus Semua Draf Aliansi"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}

              {/* TOMBOL UTAMA YANG MEMICU MODAL */}
              <button
                onClick={handleRunClick}
                disabled={isBuilding || (!leads || leads.length === 0)}
                className={`flex-shrink-0 px-8 py-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 border ${
                  isBuilding 
                    ? 'bg-black text-emerald-500/50 border-emerald-900/50 cursor-not-allowed shadow-inner' 
                    : 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-800 text-white hover:scale-[1.02] active:scale-95 border-transparent shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(52,211,153,0.5)]'
                }`}
              >
                {isBuilding ? (
                  <><span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></span> Forging Alliances...</>
                ) : syndicates.length > 0 ? (
                  <>🔁 Re-Scan Market</>
                ) : (
                  <>🤝 Build Syndicate</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 flex-1 flex flex-col relative z-10 bg-black/40">
          {isBuilding ? (
             <div className="flex-1 flex flex-col items-center justify-center text-emerald-500/80 h-72">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                   <div className="absolute inset-0 border-[1px] border-emerald-500/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
                   <div className="absolute inset-4 border-[2px] border-dashed border-green-600/50 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                   <svg className="w-10 h-10 text-emerald-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600 animate-pulse">
                  Mapping B2B Networks...
                </p>
             </div>
          ) : syndicates.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              
              {syndicates.map((syn, idx) => (
                <div key={idx} className="bg-gradient-to-b from-[#0a1610] to-black border border-emerald-700/30 rounded-[2rem] p-8 hover:border-emerald-500/60 transition-all group relative overflow-hidden flex flex-col">
                  
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>

                  <div className="relative z-10 flex-1 flex flex-col">
                      <span className="self-start bg-black text-emerald-500 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-emerald-500/40 mb-4 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                        Target Partner #{idx + 1}
                      </span>
                      
                      <h3 className="text-2xl font-black text-white leading-tight mb-2 pr-6">
                        {syn.partner_target}
                      </h3>
                      
                      <div className="mb-6">
                         <p className="text-sm font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                           {syn.monetization_model}
                         </p>
                      </div>

                      <div className="mb-6 space-y-3">
                         <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-900/50 pb-2">Synergy Logic</p>
                         <p className="text-xs text-slate-300 mb-3 leading-relaxed">{syn.synergy_logic}</p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-emerald-900/40">
                         <div className="flex justify-between items-center mb-2">
                           <p className="text-[9px] text-emerald-500/70 uppercase tracking-widest font-black">
                             B2B Email / WA Pitch Script
                           </p>
                           <button 
                              onClick={() => copyScript(idx, syn.b2b_pitch_script)}
                              className="text-[9px] bg-emerald-900/30 hover:bg-emerald-600 text-emerald-400 hover:text-black px-2 py-1 rounded transition-colors font-bold uppercase tracking-widest flex items-center gap-1"
                            >
                              {copiedIndex === idx ? "Copied" : "Copy"}
                           </button>
                         </div>
                         <p className="text-[11px] text-slate-300 italic leading-relaxed bg-black/50 p-3 rounded-lg border border-white/5">
                           "{syn.b2b_pitch_script}"
                         </p>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-emerald-600/30 h-64 text-center">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <p className="text-sm font-black uppercase tracking-[0.3em] italic">Awaiting Raw Data to Transmute.</p>
             </div>
          )}
        </div>
      </div>
    </>
  );
}