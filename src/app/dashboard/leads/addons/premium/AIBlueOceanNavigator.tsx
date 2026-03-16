"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AIBlueOceanProps {
  clientId: string;
  leads: Lead[];
}

interface BlueOceanIdea {
  product_name: string;
  demand_count: number;
  suggested_price: number;
  est_new_revenue: number;
  launch_strategy: string;
  marketing_copy: string;
}

export default function AIBlueOceanNavigator({ clientId, leads }: AIBlueOceanProps) {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [ideas, setIdeas] = useState<BlueOceanIdea[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null);
  
  // STATE UNTUK CUSTOM MODAL
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
        // Ambil data ide yang tersimpan
        const { data: savedData } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "blue_ocean_ideas")
          .maybeSingle();

        if (savedData && savedData.content) {
          const parsedIdeas = typeof savedData.content === 'string' ? JSON.parse(savedData.content) : savedData.content;
          setIdeas(parsedIdeas);
        }

        // Ambil sisa kuota
        const { data: clientData } = await supabase
          .from("clients")
          .select("premium_quota_left")
          .eq("id", clientId)
          .maybeSingle();
          
        if (clientData) {
          setQuotaLeft(clientData.premium_quota_left);
        }
      } catch (err) {
        console.error("Gagal menarik data:", err);
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
    
    if (ideas.length > 0) {
      setShowModal(true); // Buka Custom Modal Mewah!
    } else {
      executeAlchemistEngine(); // Langsung jalan kalau belum ada data
    }
  };

  // FUNGSI EKSEKUSI ASLI (Dipanggil dari dalam Modal)
  const executeAlchemistEngine = async () => {
    setShowModal(false); // Tutup modal
    setIsSynthesizing(true);

    try {
      const response = await fetch('/api/addons-api/AIBlueOceanNavigator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leads, clientId: clientId }),
      });

      const data = await response.json();

      if (response.status === 403) {
        alert(data.error); // Alert jika kuota benar-benar 0
        setIsSynthesizing(false);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Gagal mengambil data AI");

      setIdeas(data.ideas);
      if (data.remainingQuota !== undefined) setQuotaLeft(data.remainingQuota);
      
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "blue_ocean_ideas",
        content: data.ideas
      }, { onConflict: 'client_id,addon_type' });

    } catch (err: any) {
      console.error("Engine failed", err);
      alert("Waduh, koneksi ke Otak AI terputus.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const deleteAllIdeas = async () => {
    setIdeas([]);
    try {
      await supabase.from("client_addons_data").delete().eq("client_id", clientId).eq("addon_type", "blue_ocean_ideas");
    } catch (err) { console.error(err); }
  };

  const copyBlueprint = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-black/50 rounded-[2.5rem] border border-slate-800 animate-pulse mb-10"></div>;
  }

  return (
    <>
      {/* --- CUSTOM CONFIRMATION MODAL (SUPER PREMIUM UI) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#050510] border border-indigo-500/40 rounded-[2rem] p-8 max-w-md w-full shadow-[0_0_80px_rgba(99,102,241,0.25)] transform transition-all animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
            {/* Modal Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-fuchsia-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-indigo-950/50 rounded-2xl flex items-center justify-center border border-indigo-500/30 mb-6 mx-auto shadow-inner">
                <svg className="w-8 h-8 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight italic">Audit Ulang Data?</h3>
              <p className="text-sm text-indigo-200/70 text-center mb-8 leading-relaxed font-medium">
                Menciptakan strategi baru akan <strong className="text-white">menghapus blueprint lama</strong> dan memotong <strong className="text-amber-400">1 Kuota Premium</strong> Anda.
                {quotaLeft !== null && <span className="block mt-2 text-xs text-indigo-400">Sisa kuota saat ini: {quotaLeft}x</span>}
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-900/50 hover:bg-slate-800 hover:text-white border border-slate-800 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={executeAlchemistEngine} 
                  className="flex-1 py-3.5 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:shadow-[0_0_30px_rgba(217,70,239,0.4)] transition-all active:scale-95 border border-fuchsia-400/20"
                >
                  Gunakan Kuota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- KOMPONEN UTAMA --- */}
      <div className="relative overflow-hidden bg-[#050510] rounded-[2.5rem] border border-indigo-900/50 shadow-2xl transition-all duration-1000 hover:shadow-[0_0_100px_rgba(139,92,246,0.2)] mb-10 h-full flex flex-col group">
        
        {/* Efek Nebula Cosmos */}
        <div className="absolute top-0 left-1/2 w-[800px] h-[500px] bg-violet-900/20 rounded-[100%] blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2 group-hover:bg-fuchsia-900/20 transition-all duration-3000 ease-in-out"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row justify-between items-start border-b border-indigo-500/10 bg-black/40 backdrop-blur-2xl">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-[0_0_20px_rgba(251,191,36,0.4)] flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                CLASSIFIED • APEX TIER
              </span>
              <span className="text-indigo-400/80 text-[10px] font-bold uppercase tracking-widest italic">Product Innovation AI</span>
            </div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2 drop-shadow-lg">
              Blue Ocean <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Navigator</span>
            </h2>
            <p className="text-indigo-200/60 text-xs font-medium max-w-xl leading-relaxed">
              Menemukan "Harta Karun" dari permintaan pelanggan yang sebelumnya Anda tolak. AI akan merancang produk baru untuk Anda berdasarkan data penolakan tersebut.
            </p>
            
            {/* TAMPILAN SISA KUOTA DI HEADER */}
            {quotaLeft !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <p className="text-[10px] font-mono text-amber-500/80">Sisa Kuota Premium: <strong className="text-amber-400">{quotaLeft}</strong></p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {ideas.length > 0 && !isSynthesizing && (
                <button 
                  onClick={deleteAllIdeas}
                  className="p-4 rounded-2xl bg-black/50 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-indigo-900/50 hover:border-red-500/30 transition-all shadow-md backdrop-blur-md"
                  title="Hapus Semua Ide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}

              {/* TOMBOL UTAMA YANG MEMICU MODAL */}
              <button
                onClick={handleRunClick}
                disabled={isSynthesizing || leads.length === 0}
                className={`flex-shrink-0 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 border ${
                  isSynthesizing 
                    ? 'bg-slate-900/80 text-indigo-500/50 border-indigo-900/50 cursor-not-allowed shadow-inner' 
                    : 'bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 text-white hover:scale-[1.02] active:scale-95 border-transparent shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:shadow-[0_0_60px_rgba(217,70,239,0.6)]'
                }`}
              >
                {isSynthesizing ? (
                  <><span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></span> Synthesizing...</>
                ) : ideas.length > 0 ? (
                  <>🔁 Re-Scan Market</>
                ) : (
                  <>🌌 Discover Blue Ocean</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 flex-1 flex flex-col relative z-10 bg-black/20">
          {isSynthesizing ? (
             <div className="flex-1 flex flex-col items-center justify-center text-indigo-400/80 h-72">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                   <div className="absolute inset-0 border-[1px] border-indigo-500/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
                   <div className="absolute inset-2 border-[1px] border-fuchsia-500/40 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                   <div className="absolute inset-4 border-[2px] border-dashed border-amber-400/50 rounded-full animate-[spin_5s_linear_infinite]"></div>
                   <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.4em] italic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 animate-pulse">
                  Extracting Unmet Demands...
                </p>
             </div>
          ) : ideas.length > 0 ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              
              <p className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"></span>
                Saved Business Blueprints
              </p>

              {ideas.map((idea, idx) => (
                <div key={idx} className="bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-[2rem] p-6 md:p-8 hover:border-fuchsia-500/40 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>

                  <div className="flex flex-col md:flex-row gap-8 relative z-10">
                     <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-indigo-500/20 pb-6 md:pb-0 md:pr-8">
                        <span className="inline-block bg-indigo-950/50 text-indigo-300 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-indigo-500/30 mb-4">
                          Blueprint #{idx + 1}
                        </span>
                        <h3 className="text-xl font-black text-white leading-tight mb-6 pr-6">
                          {idea.product_name}
                        </h3>
                        <div className="space-y-4">
                           <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">Unmet Demand (Ditolak)</p>
                              <p className="text-lg font-black text-white">{idea.demand_count} <span className="text-xs text-slate-500 font-normal">Pelanggan/Bulan</span></p>
                           </div>
                           <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1">Suggested Pricing</p>
                              <p className="text-lg font-black text-amber-400">{formatRupiah(idea.suggested_price)}</p>
                           </div>
                           <div className="pt-4 border-t border-indigo-500/20">
                              <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-black mb-1 flex items-center gap-1.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                Est. New Revenue
                              </p>
                              <p className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                {formatRupiah(idea.est_new_revenue)}
                              </p>
                           </div>
                        </div>
                     </div>

                     <div className="md:w-2/3 flex flex-col">
                        <div className="mb-6">
                           <p className="text-[10px] text-fuchsia-400 uppercase tracking-widest font-black mb-2 flex items-center gap-2">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                             AI Launch Strategy
                           </p>
                           <p className="text-sm text-slate-300 leading-relaxed font-medium">
                             {idea.launch_strategy}
                           </p>
                        </div>
                        <div className="flex-1 bg-black/40 rounded-2xl p-5 border border-white/5 relative group/copy">
                           <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-3 border-b border-white/5 pb-2">
                             Draft Broadcast / Post IG
                           </p>
                           <p className="text-xs text-white/90 italic leading-relaxed">
                             "{idea.marketing_copy}"
                           </p>
                           <button 
                              onClick={() => copyBlueprint(idx, idea.marketing_copy)}
                              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-md transition-all opacity-0 group-hover/copy:opacity-100"
                              title="Copy Copywriting"
                            >
                              {copiedIndex === idx ? (
                                 <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              )}
                           </button>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-indigo-300/30 h-64 text-center">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                <p className="text-sm font-black uppercase tracking-[0.3em] italic">Awaiting Raw Data to Transmute.</p>
             </div>
          )}
        </div>
      </div>
    </>
  );
}