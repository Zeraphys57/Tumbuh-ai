"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_needs: string;
  created_at?: string;
  full_chat?: string;
}

interface AIGhostRecoveryProps {
  clientId: string;
  leads: Lead[];
}

interface GhostedLead extends Lead {
  days_ghosting: number;
  ai_follow_up_msg: string;
}

export default function AIGhostRecovery({ clientId, leads }: AIGhostRecoveryProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [ghostLeads, setGhostLeads] = useState<GhostedLead[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN DARI DATABASE
  useEffect(() => {
    async function loadSavedGhostData() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "ghost_recovery")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setGhostLeads(parsedData);
        }
      } catch (err) {
        console.error("Gagal menarik data Ghost Recovery:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedGhostData();
  }, [clientId, supabase]);

  // 2. FUNGSI SCAN KE BACKEND AI & SIMPAN KE DB
  const runGhostScan = async () => {
    if (leads.length === 0) {
      alert("Belum ada data pelanggan untuk diselidiki, Bos!");
      return;
    }

    // UX: Konfirmasi sebelum membuang data lama
    if (ghostLeads.length > 0) {
      const confirmRegen = confirm("Scan ulang akan menghapus daftar target follow-up sebelumnya. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AIGhostRecovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }), // Tidak perlu clientId karena pakai Flash (tanpa kuota)
      });

      if (!response.ok) throw new Error("Gagal mengambil data dari AI Server");

      const data = await response.json();
      const realGhostLeads: GhostedLead[] = data.ghostLeads;

      // Update UI
      setGhostLeads(realGhostLeads);

      // Simpan persisten ke Supabase (Auto-Save)
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "ghost_recovery",
        content: realGhostLeads
      }, { onConflict: 'client_id,addon_type' });

    } catch (error) {
      console.error("Ghost Scan failed", error);
      alert("AI sedang sibuk mencari jejak. Coba lagi nanti.");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. FUNGSI HAPUS DATA (RESET)
  const deleteGhostData = async () => {
    setGhostLeads([]);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "ghost_recovery");
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
    return <div className="h-64 bg-slate-900 rounded-[2.5rem] border border-cyan-900/50 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] mb-10 h-fit flex flex-col group">
      
      {/* Efek Cahaya Premium Frost (Cyan/Teal) */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-teal-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

      <div className="relative z-10 p-8 flex justify-between items-start border-b border-cyan-500/10 bg-slate-950/40 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              Premium Tool
            </span>
            <span className="text-cyan-300/70 text-[10px] font-bold uppercase tracking-widest italic">Retention AI</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-none mb-1">
            Ghost <span className="text-cyan-400">Recovery</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium mt-1">
            Deteksi pelanggan yang hilang & buat pesan *Follow-up* otomatis.
          </p>
        </div>

        {/* --- FIX: GABUNGKAN TOMBOL DELETE & ACTION DI SINI --- */}
        <div className="flex items-center gap-3">
          {ghostLeads.length > 0 && !isScanning && (
            <button 
              onClick={deleteGhostData}
              className="p-3.5 rounded-[1.2rem] bg-slate-800 text-cyan-500/50 hover:text-red-400 hover:bg-red-500/10 border border-cyan-500/20 hover:border-red-500/30 transition-all shadow-sm"
              title="Reset Penyelamatan"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runGhostScan}
            disabled={isScanning || leads.length === 0}
            className={`flex-shrink-0 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 border ${
              isScanning 
                ? 'bg-slate-800 text-cyan-500 border-cyan-500/30 cursor-not-allowed' 
                : 'bg-white text-slate-900 hover:bg-cyan-50 border-white hover:shadow-cyan-500/20 hover:shadow-lg'
            }`}
          >
            {isScanning ? (
              <><span className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></span> Scanning Logs...</>
            ) : ghostLeads.length > 0 ? (
              <>🔁 Re-Scan Ghosts</>
            ) : (
              <>🧊 Find Ghost Leads</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-slate-900/40">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-cyan-500/50 h-40">
              <svg className="w-12 h-12 mb-4 animate-pulse text-cyan-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse">Drafting Follow-ups...</p>
           </div>
        ) : ghostLeads.length > 0 ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
              Top Priority Recoveries
            </p>
            {ghostLeads.map((lead, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-cyan-500/20 rounded-[1.5rem] p-5 hover:border-cyan-400/50 transition-colors group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-500 font-black text-xs uppercase shadow-inner">
                        {lead.customer_name[0] || '?'}
                     </div>
                     <div>
                        <h4 className="text-white font-black uppercase tracking-tighter truncate leading-none mb-1">
                          {lead.customer_name}
                        </h4>
                        <span className="text-cyan-500/70 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Ghosting: {lead.days_ghosting} Hari
                        </span>
                     </div>
                  </div>
                  
                  <div className="flex gap-2">
                     <button 
                       onClick={() => copyToClipboard(lead.id, lead.ai_follow_up_msg)}
                       className="p-2.5 bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-all"
                       title="Copy Text"
                     >
                       {copiedId === lead.id ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                       ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                       )}
                     </button>
                     <a 
                       href={`https://wa.me/${lead.customer_phone}?text=${encodeURIComponent(lead.ai_follow_up_msg)}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="p-2.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-lg transition-all border border-cyan-500/30"
                       title="Send WA"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                     </a>
                  </div>
                </div>

                {/* Pesan Generate dari AI */}
                <div className="bg-slate-900 rounded-xl p-4 border border-white/5 relative">
                   <div className="absolute top-0 left-4 -translate-y-1/2 bg-slate-900 px-2 text-[8px] font-black text-cyan-500 uppercase tracking-widest italic flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      AI Draft
                   </div>
                   <p className="text-xs text-slate-300 italic leading-relaxed font-medium">
                     "{lead.ai_follow_up_msg}"
                   </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-500 h-40 text-center">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-xs font-bold italic">Semua prospek aman!<br/>Tidak ada pelanggan yang "Ghosting" saat ini.</p>
           </div>
        )}
      </div>
    </div>
  );
}