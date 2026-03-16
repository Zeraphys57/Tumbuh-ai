"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_needs: string;
  full_chat?: string;
}

interface AIUpsellEngineProps {
  clientId: string;
  leads: Lead[];
}

interface UpsellOpportunity extends Lead {
  suggested_product: string;
  ai_pitch_msg: string;
  potential_value: "High" | "Medium";
}

export default function AIUpsellEngine({ clientId, leads }: AIUpsellEngineProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [upsellLeads, setUpsellLeads] = useState<UpsellOpportunity[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN DARI DATABASE
  useEffect(() => {
    async function loadSavedUpsells() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "upsell_engine")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setUpsellLeads(parsedData);
        }
      } catch (err) {
        console.error("Gagal menarik data Upsell:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedUpsells();
  }, [clientId, supabase]);

  // 2. FUNGSI SCAN KE BACKEND AI & SIMPAN KE DB
  const runUpsellAnalysis = async () => {
    if (leads.length === 0) {
      alert("Belum ada data pelanggan untuk dianalisa, Bos!");
      return;
    }

    // Konfirmasi regenerasi data agar UX lebih aman
    if (upsellLeads.length > 0) {
      const confirmRegen = confirm("Scan ulang akan menghapus daftar peluang Upsell lama. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/addons-api/AIUpsellEngine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }), // Tidak perlu kirim clientId karena tidak ada pemotongan kuota
      });

      if (!response.ok) throw new Error("Gagal mengambil data dari AI Server");

      const data = await response.json();
      const realUpsellLeads: UpsellOpportunity[] = data.upsellLeads;

      // Update UI
      setUpsellLeads(realUpsellLeads);

      // Simpan persisten ke Supabase (Auto-Save)
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "upsell_engine",
        content: realUpsellLeads
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Upsell Scan failed", error);
      alert("AI sedang sibuk meracik tawaran. Coba lagi sebentar.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. FUNGSI HAPUS DATA (RESET)
  const deleteUpsellData = async () => {
    setUpsellLeads([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "upsell_engine");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  const copyToClipboard = (leadId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-slate-900 rounded-[2.5rem] border border-amber-900/50 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] border border-amber-500/20 shadow-2xl transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(245,158,11,0.2)] mb-10 h-fit flex flex-col group">
      
      {/* Efek Cahaya Premium Emas (Amber/Gold) */}
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>

      <div className="relative z-10 p-8 flex justify-between items-start border-b border-amber-500/10 bg-slate-900/60 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-gradient-to-r from-amber-500 to-orange-400 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Premium Tool
            </span>
            <span className="text-amber-300/80 text-[10px] font-bold uppercase tracking-widest italic">Revenue AI</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-none mb-1 pr-10">
            Smart <span className="text-amber-400">Upsell Engine</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium mt-1">
            Analisis celah untuk menawarkan produk tambahan ke pelanggan aktif.
          </p>
        </div>

        {/* --- FIX: GABUNGKAN TOMBOL DELETE DAN ACTION --- */}
        <div className="flex items-center gap-3">
          {upsellLeads.length > 0 && !isGenerating && (
            <button 
              onClick={deleteUpsellData}
              className="p-3.5 rounded-[1.2rem] bg-slate-800 text-amber-500/50 hover:text-red-400 hover:bg-red-500/10 border border-amber-500/20 hover:border-red-500/30 transition-all shadow-sm"
              title="Hapus Peluang Ini"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runUpsellAnalysis}
            disabled={isGenerating || leads.length === 0}
            className={`flex-shrink-0 px-6 py-4 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 border ${
              isGenerating 
                ? 'bg-slate-800 text-amber-500 border-amber-500/30 cursor-not-allowed' 
                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 hover:from-amber-300 hover:to-orange-400 border-none hover:shadow-amber-500/30 hover:shadow-lg'
            }`}
          >
            {isGenerating ? (
              <><span className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></span> Generating...</>
            ) : upsellLeads.length > 0 ? (
              <>🔁 Re-Scan Opps</>
            ) : (
              <>🛒 Find Upsell Opps</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-slate-900/30">
        {isGenerating ? (
           <div className="flex-1 flex flex-col items-center justify-center text-amber-500/50 h-40">
              <svg className="w-12 h-12 mb-4 animate-bounce text-amber-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse text-amber-500/70">Crafting Irresistible Offers...</p>
           </div>
        ) : upsellLeads.length > 0 ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Top Revenue Opportunities
            </p>
            {upsellLeads.map((lead, idx) => (
              <div key={idx} className="bg-slate-950/60 border border-amber-500/20 rounded-[1.5rem] p-5 hover:border-amber-400/50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                     <h4 className="text-white font-black uppercase tracking-tighter truncate leading-none mb-1.5 flex items-center gap-2">
                       {lead.customer_name}
                       <span className="bg-amber-500/10 text-amber-400 text-[8px] px-2 py-0.5 rounded-full border border-amber-500/20">
                         {lead.potential_value} Value
                       </span>
                     </h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                       Base Order: <span className="text-slate-200">{lead.customer_needs || 'General'}</span>
                     </p>
                  </div>
                  
                  <div className="flex gap-2">
                     <button 
                       onClick={() => copyToClipboard(lead.id, lead.ai_pitch_msg)}
                       className="p-2.5 bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-all"
                       title="Copy Text"
                     >
                       {copiedId === lead.id ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                       ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                       )}
                     </button>
                     <a 
                       href={`https://wa.me/${lead.customer_phone}?text=${encodeURIComponent(lead.ai_pitch_msg)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="p-2.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-900 rounded-lg transition-all border border-amber-500/30"
                       title="Send WA Offer"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     </a>
                  </div>
                </div>

                {/* AI Suggestion Box */}
                <div className="bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl p-4 border-l-2 border-amber-500 relative">
                   <div className="flex items-center gap-2 mb-2">
                     <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest italic">AI Suggestion: {lead.suggested_product}</span>
                   </div>
                   <p className="text-xs text-amber-100/80 italic leading-relaxed font-medium">
                     "{lead.ai_pitch_msg}"
                   </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-40 text-center">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold italic">Belum ada peluang Upsell.<br/>AI butuh lebih banyak data pesanan.</p>
           </div>
        )}
      </div>
    </div>
  );
}