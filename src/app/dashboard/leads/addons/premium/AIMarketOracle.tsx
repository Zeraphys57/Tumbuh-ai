"use client";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Lead {
  id: string;
  customer_name: string;
  customer_needs: string;
  full_chat?: string;
}

interface AIMarketOracleProps {
  clientId: string;
  leads: Lead[];
  avgTicketSize?: number; // Rata-rata transaksi, misal Rp 150.000
}

interface OracleResult {
  totalLostRevenue: number;
  lostLeadsCount: number;
  topReasons: { reason: string; percentage: number }[];
  aiRecommendations: string[];
}

export default function AIMarketOracle({ clientId, leads, avgTicketSize = 150000 }: AIMarketOracleProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(true);
  const [oracleData, setOracleData] = useState<OracleResult | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FETCH DATA TERSIMPAN SAAT KOMPONEN MUNCUL
  useEffect(() => {
    async function loadSavedOracleData() {
      if (!clientId) return;
      setIsFetchingDB(true);
      try {
        const { data } = await supabase
          .from("client_addons_data")
          .select("content")
          .eq("client_id", clientId)
          .eq("addon_type", "market_oracle")
          .maybeSingle();

        if (data && data.content) {
          const parsedData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          setOracleData(parsedData);
        }
      } catch (err) {
        console.error("Gagal menarik data Oracle:", err);
      } finally {
        setIsFetchingDB(false);
      }
    }
    loadSavedOracleData();
  }, [clientId, supabase]);

  // 2. FUNGSI SCAN KE BACKEND AI & SIMPAN KE DB
  const runOracleAnalysis = async () => {
    if (leads.length === 0) {
      alert("Belum ada data leads untuk diaudit, Bos!");
      return;
    }

    // Proteksi Kuota
    if (oracleData) {
      const confirmRegen = confirm("Audit ulang akan menghapus laporan lama dan memotong kuota premium Anda. Lanjutkan?");
      if (!confirmRegen) return;
    }

    setIsScanning(true);

    try {
      const response = await fetch('/api/addons-api/AIMarketOracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leads: leads, 
          avgTicketSize: avgTicketSize,
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

      const realOracleData: OracleResult = data.oracleData;

      // Update UI
      setOracleData(realOracleData);

      // Simpan ke Database (Auto-Save)
      await supabase.from("client_addons_data").upsert({
        client_id: clientId,
        addon_type: "market_oracle",
        content: realOracleData
      }, { onConflict: 'client_id,addon_type' });

      console.log("Sisa kuota anda:", data.remainingQuota);

    } catch (error) {
      console.error("Oracle Analysis failed", error);
      alert("Gagal menghubungi AI Oracle. Coba lagi nanti.");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. FUNGSI HAPUS DATA (RESET)
  const deleteOracleData = async () => {
    setOracleData(null); // Langsung hapus dari UI
    try {
      await supabase
        .from("client_addons_data")
        .delete()
        .eq("client_id", clientId)
        .eq("addon_type", "market_oracle");
    } catch (err) {
      console.error("Gagal menghapus data dari DB", err);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
  };

  if (isFetchingDB) {
    return <div className="h-64 bg-black/50 rounded-[2.5rem] border border-slate-800 animate-pulse mb-10"></div>;
  }

  return (
    <div className="relative overflow-hidden bg-black rounded-[2.5rem] border border-slate-800 shadow-2xl transition-all duration-700 hover:shadow-[0_0_80px_rgba(255,255,255,0.1)] mb-10 h-fit flex flex-col group">
      
      {/* Efek Cahaya Platinum/Holographic */}
      <div className="absolute top-0 left-1/2 w-[600px] h-[300px] bg-slate-400/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2 group-hover:bg-slate-300/20 transition-all duration-1000"></div>
      
      {/* Ornamen Garis Enterprise */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-400 to-transparent opacity-30"></div>

      <div className="relative z-10 p-8 md:p-10 flex justify-between items-start border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-gradient-to-r from-slate-200 to-slate-400 text-black text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Enterprise Exclusive
            </span>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">C-Level Analytics</span>
          </div>
          <h2 className="text-3xl font-black text-white italic tracking-tighter leading-none mb-2">
            Market <span className="text-slate-400">Oracle</span> & Revenue <span className="text-slate-400">Hunter</span>
          </h2>
          <p className="text-slate-500 text-xs font-medium max-w-lg">
            Sistem AI mengaudit ribuan chat gagal untuk menemukan celah bisnis, mengalkulasi uang yang hilang, dan memberikan saran R&D.
          </p>
        </div>

        <button
          onClick={runOracleAnalysis}
          disabled={isScanning || leads.length === 0}
          className={`flex-shrink-0 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3 border ${
            isScanning 
              ? 'bg-slate-900 text-slate-500 border-slate-700' 
              : 'bg-white text-black hover:bg-slate-200 border-transparent hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]'
          }`}
        >
          {isScanning ? (
            <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span> Accessing Neural Net...</>
          ) : oracleData ? (
            <>🔁 Re-Audit Data</>
          ) : (
            <>👁️ Reveal Blind Spots</>
          )}
        </button>
      </div>

      <div className="p-8 md:p-10 flex-1 flex flex-col relative z-10 bg-black/60">
        
        {/* TOMBOL DELETE (MUNCUL KALAU ADA DATA) */}
        {oracleData && !isScanning && (
          <button 
            onClick={deleteOracleData}
            className="absolute top-6 right-6 text-slate-600 hover:text-red-500 bg-black/50 hover:bg-red-500/10 p-2.5 rounded-xl transition-all z-20 opacity-50 hover:opacity-100 border border-slate-800"
            title="Hapus Laporan Ini"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}

        {isScanning ? (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-64">
              <div className="relative w-24 h-24 mb-6">
                 <div className="absolute inset-0 border-2 border-slate-700 rounded-full animate-ping opacity-20"></div>
                 <div className="absolute inset-2 border-2 border-slate-500 rounded-full animate-[spin_3s_linear_infinite]"></div>
                 <div className="absolute inset-4 border-2 border-white/80 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                 <svg className="absolute inset-0 w-8 h-8 m-auto text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.3em] italic animate-pulse text-white">Auditing Lost Conversations...</p>
           </div>
        ) : oracleData ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            
            <div className="bg-gradient-to-br from-slate-900 to-black border border-red-500/20 rounded-[2rem] p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
               <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                 Estimated Revenue Leakage (Omzet Bocor)
               </p>
               <h3 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter">
                 {formatRupiah(oracleData.totalLostRevenue)}
               </h3>
               <p className="text-xs text-slate-500 font-medium mt-3">
                 Tumbuh AI mendeteksi <strong className="text-white">{oracleData.lostLeadsCount} prospek</strong> kemungkinan gagal closing bulan ini akibat faktor di bawah.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">Top Reasons for Lost Sales</p>
                  <div className="space-y-3">
                    {oracleData.topReasons.map((item, idx) => (
                      <div key={idx} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
                         <div className="text-2xl font-black text-slate-600 italic w-8 text-center">{idx + 1}</div>
                         <div className="flex-1">
                            <div className="flex justify-between items-end mb-1">
                               <span className="text-sm font-bold text-slate-200">{item.reason}</span>
                               <span className="text-xs font-black text-white">{item.percentage}%</span>
                            </div>
                            <div className="w-full bg-black rounded-full h-1.5 overflow-hidden">
                               <div className="bg-gradient-to-r from-slate-600 to-white h-1.5 rounded-full" style={{ width: `${item.percentage}%` }}></div>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    AI Strategic Recommendations
                  </p>
                  <div className="space-y-3">
                    {oracleData.aiRecommendations.map((rec, idx) => (
                      <div key={idx} className="bg-gradient-to-r from-slate-900 to-transparent p-5 rounded-2xl border-l-4 border-slate-300 relative">
                         <p className="text-xs text-slate-300 leading-relaxed font-medium italic">"{rec}"</p>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

          </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-64 text-center">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <p className="text-sm font-black uppercase tracking-[0.2em] italic">System Idle. Ready to extract market intelligence.</p>
           </div>
        )}
      </div>
    </div>
  );
}