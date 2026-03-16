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

interface AILeadScorerProps {
  clientId: string;
  leads: Lead[];
}

interface ScoredLead extends Lead {
  closing_score: number;
  ai_reasoning: string;
  urgency_level: "High" | "Medium" | "Low";
}

export default function AILeadScorer({ clientId, leads }: AILeadScorerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [hotLeads, setHotLeads] = useState<ScoredLead[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN
  useEffect(() => {
    async function loadSavedScores() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "lead_scorer")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setHotLeads(parsedData.leads || []);
          setLastScan(parsedData.lastScan || "Loaded from DB");
        }
      } catch (err) {
        console.error("Gagal menarik data Lead Scorer:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedScores();
  }, [clientId, supabase]);

  // 2. FUNGSI DEEP SCAN AI ASLI
  const runDeepScan = async () => {
    if (leads.length === 0) {
      alert("Belum ada data leads untuk di-scan, Bos!");
      return;
    }

    // Peringatan Kuota
    if (hotLeads.length > 0) {
      const confirmRegen = confirm("Deep scan ulang akan menghapus data prospek lama dan memotong kuota premium Anda. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AILeadScorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: leads,
          clientId: clientId // <--- WAJIB DIKIRIM KE BACKEND
        }),
      });

      const data = await response.json();

      // Tangkap Error Kuota Habis
      if (response.status === 403) {
        alert(data.error);
        setIsScanning(false);
        return;
      }

      if (!response.ok) throw new Error(data.error || "Gagal mengambil data dari AI Server");

      const realScoredLeads: ScoredLead[] = data.scoredLeads;
      const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Update UI
      setHotLeads(realScoredLeads);
      setLastScan(currentTime);

      // Simpan ke Database (Auto-Save)
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "lead_scorer",
        content: { leads: realScoredLeads, lastScan: currentTime }
      }, { onConflict: 'client_id,addon_type' });

      console.log("Sisa kuota anda:", data.remainingQuota);

    } catch (error) {
      console.error("Scan failed", error);
      alert("Gagal menghubungi AI Radar. Coba lagi nanti.");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. FUNGSI HAPUS (RESET)
  const deleteScorerData = async () => {
    setHotLeads([]);
    setLastScan(null);
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "lead_scorer");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-slate-900 rounded-[2.5rem] border border-fuchsia-900/50 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] border border-fuchsia-500/20 shadow-2xl transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(217,70,239,0.2)] mb-10 h-fit flex flex-col group">
      
      {/* Efek Cahaya Premium Radar (Fuchsia / Merah Muda Panas) */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      
      {/* Efek Garis Scan saat Loading */}
      {isScanning && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent animate-[scan_2s_ease-in-out_infinite] z-50"></div>
      )}

      <div className="relative z-10 p-8 flex justify-between items-start border-b border-fuchsia-500/10 bg-slate-900/50">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_rgba(225,29,72,0.4)]">
              Premium Tool
            </span>
            <span className="text-fuchsia-300/70 text-[10px] font-bold uppercase tracking-widest italic">Predictive AI</span>
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-tight leading-none mb-1 pr-10">
            Hot Lead <span className="text-fuchsia-400">Radar</span>
          </h2>
          <p className="text-slate-400 text-[11px] font-medium mt-1">
            Scan {leads?.length || 0} data untuk mencari pelanggan siap bayar.
          </p>
        </div>

        {/* --- FIX: GABUNGKAN TOMBOL DELETE & ACTION DI SINI --- */}
        <div className="flex items-center gap-3">
          {hotLeads.length > 0 && !isScanning && (
            <button 
              onClick={deleteScorerData}
              className="p-3.5 rounded-2xl bg-slate-800 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all shadow-sm"
              title="Reset Radar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}

          <button
            onClick={runDeepScan}
            disabled={isScanning || !leads || leads.length === 0}
            className={`flex-shrink-0 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 border ${
              isScanning 
                ? 'bg-slate-800 text-fuchsia-500 border-fuchsia-500/30 cursor-not-allowed' 
                : 'bg-white text-slate-900 hover:bg-fuchsia-50 border-white hover:shadow-fuchsia-500/20 hover:shadow-lg'
            }`}
          >
            {isScanning ? (
              <><span className="w-3 h-3 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin"></span> Scanning...</>
            ) : hotLeads.length > 0 ? (
              <>🔁 Re-Scan Leads</>
            ) : (
              <>🎯 Deep Scan Now</>
            )}
          </button>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col relative z-10 bg-slate-950/40">
        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-fuchsia-500/50 h-40">
              <div className="w-16 h-16 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-black uppercase tracking-[0.2em] italic animate-pulse">Analyzing Chat Sentiments...</p>
           </div>
        ) : hotLeads.length > 0 ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
              <span>Top Prospects Found</span>
              <span>Last Scan: {lastScan}</span>
            </p>
            {hotLeads.map((lead, idx) => (
              <div key={idx} className="bg-slate-900/80 border border-fuchsia-500/10 rounded-[1.5rem] p-5 flex items-start gap-4 hover:border-fuchsia-500/30 transition-colors group">
                {/* Score Circle */}
                <div className="relative w-14 h-14 flex items-center justify-center bg-slate-950 rounded-full border-2 border-slate-800 shadow-inner flex-shrink-0">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="26" cy="26" r="24" className="stroke-slate-800" strokeWidth="4" fill="none" />
                    <circle cx="26" cy="26" r="24" className="stroke-fuchsia-500 transition-all duration-1000 ease-out" strokeWidth="4" fill="none" strokeDasharray="150" strokeDashoffset={150 - (150 * lead.closing_score) / 100} />
                  </svg>
                  <span className="text-white font-black text-sm relative z-10 italic">{lead.closing_score}%</span>
                </div>
                
                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                     <h4 className="text-white font-black uppercase tracking-tighter truncate pr-2">{lead.customer_name}</h4>
                     <span className="bg-fuchsia-500/20 text-fuchsia-400 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border border-fuchsia-500/20 whitespace-nowrap">
                       {lead.urgency_level} Priority
                     </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mb-2">{lead.customer_phone}</p>
                  <p className="text-[11px] text-fuchsia-100/70 leading-relaxed font-medium italic border-l-2 border-fuchsia-500/30 pl-3">
                    "{lead.ai_reasoning}"
                  </p>
                </div>
                
                {/* Tombol Follow Up */}
                <a 
                  href={`https://wa.me/${lead.customer_phone}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white hover:bg-fuchsia-500 hover:text-white transition-all shadow-md group-hover:scale-110 flex-shrink-0"
                  title="Chat Now"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </a>
              </div>
            ))}
          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-40 text-center">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold italic">Awaiting Scan Command.<br/>Klik tombol di atas untuk mencari prospek panas.</p>
           </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 1; }
          50% { opacity: 0.5; }
          100% { transform: translateY(500px); opacity: 0; }
        }
      `}} />
    </div>
  );
}