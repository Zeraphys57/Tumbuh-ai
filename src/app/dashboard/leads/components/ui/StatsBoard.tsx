"use client";

interface StatsBoardProps {
  totalLeads: number;
  totalInteractions?: number; // Diambil dari total baris di usage_logs
  avgLatencyMs?: number;      // Diambil dari rata-rata latency_ms di usage_logs
  totalTokens?: number;       // Diambil dari sum total_tokens di usage_logs
  themeColor?: "blue" | "green" | "purple" | "orange";
}

export default function StatsBoard({ 
  totalLeads = 0, 
  totalInteractions = 0, 
  avgLatencyMs = 0,
  totalTokens = 0,
  themeColor = "blue"
}: StatsBoardProps) {

  // Kalkulasi Otomatis (Estimasi 1 interaksi AI menghemat 3 menit waktu CS Manusia)
  const minutesSaved = totalInteractions * 3;
  const timeSavedDisplay = minutesSaved > 60 
    ? `${(minutesSaved / 60).toFixed(1)} Jam` 
    : `${minutesSaved} Menit`;

  // Format Latency (mengubah ms jadi detik jika perlu)
  const latencyDisplay = avgLatencyMs > 0 
    ? `${(avgLatencyMs / 1000).toFixed(2)}s` 
    : "0s";

  const colorMap: Record<string, string> = {
    blue: "text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.4)]",
    green: "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]",
    purple: "text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]",
    orange: "text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.4)]"
  };

  const dynamicTextColor = colorMap[themeColor] || colorMap["blue"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      
      {/* CARD 1: BUSINESS ROI (LEADS) */}
      <div className="bg-[#0a0f1a] border border-white/10 p-6 rounded-[2rem] hover:bg-[#0d1322] hover:border-white/20 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10 mb-6">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Leads Acquired</p>
           <span className="bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-green-500/20 flex items-center gap-1">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
             Konversi
           </span>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-md">{totalLeads}</h2>
          <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
            Potensi Sales Baru
          </p>
        </div>
      </div>
      
      {/* CARD 2: AI WORKLOAD (INTERACTIONS & TIME SAVED) */}
      <div className="bg-[#0a0f1a] border border-white/10 p-6 rounded-[2rem] hover:bg-[#0d1322] hover:border-white/20 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10 mb-6">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">AI Workload</p>
           <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-blue-500/20">
             {totalInteractions} Task Run
           </span>
        </div>
        
        <div className="relative z-10">
          <h2 className={`text-5xl font-black italic tracking-tighter ${dynamicTextColor}`}>
            {timeSavedDisplay}
          </h2>
          <p className="text-[10px] font-bold text-slate-500 mt-2">
            Total waktu CS manusia yang dihemat
          </p>
        </div>
      </div>
      
      {/* CARD 3: SYSTEM PERFORMANCE (LATENCY & TOKENS) */}
      <div className="bg-[#0a0f1a] border border-white/10 p-6 rounded-[2rem] hover:bg-[#0d1322] hover:border-white/20 transition-all duration-500 relative overflow-hidden group shadow-lg flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10 mb-6">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Engine Health</p>
           <span className="bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-purple-500/20">
             {(totalTokens / 1000).toFixed(1)}K Tokens
           </span>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl font-black text-purple-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]">
              {latencyDisplay}
            </h2>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Avg</span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Kecepatan Respon Agentic
          </p>
        </div>
      </div>

    </div>
  );
}