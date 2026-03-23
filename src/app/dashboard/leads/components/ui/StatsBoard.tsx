"use client";

interface StatsBoardProps {
  totalLeads: number;
  totalEngagement?: number;
  timeSaved?: string;
  themeColor?: "blue" | "green" | "purple" | "orange";
}

export default function StatsBoard({ 
  totalLeads, 
  totalEngagement = 16, 
  timeSaved = "~1j",
  themeColor = "blue"
}: StatsBoardProps) {

  // FIX: Mapping warna disesuaikan untuk Dark Mode (Warna neon terang + efek cahaya/glow)
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.4)]",
    green: "text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]",
    purple: "text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]",
    orange: "text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.4)]"
  };

  const dynamicTextColor = colorMap[themeColor] || colorMap["blue"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      
      {/* CARD 1: CAPTURE LEADS */}
      <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[2rem] text-center hover:bg-slate-900/80 hover:border-slate-700 transition-all duration-500 relative overflow-hidden group shadow-lg">
        {/* Efek Cahaya saat di-Hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">Capture Leads</p>
        <h2 className="text-5xl font-black italic tracking-tighter text-white relative z-10">{totalLeads}</h2>
        
        <div className="relative z-10 mt-4">
          <span className="inline-block px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            Potential Sales
          </span>
        </div>
      </div>
      
      {/* CARD 2: ENGAGEMENT */}
      <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[2rem] text-center hover:bg-slate-900/80 hover:border-slate-700 transition-all duration-500 relative overflow-hidden group shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 relative z-10">Engagement</p>
        <h2 className={`text-5xl font-black italic tracking-tighter relative z-10 ${dynamicTextColor}`}>{totalEngagement}</h2>
        <p className="text-[9px] font-black text-slate-600 uppercase mt-4 tracking-widest relative z-10">Interaksi AI Terdeteksi</p>
      </div>
      
      {/* CARD 3: WAKTU TERHEMAT */}
      <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[2rem] text-center hover:bg-slate-900/80 hover:border-slate-700 transition-all duration-500 relative overflow-hidden group shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-duration-500 pointer-events-none"></div>
        
        <p className="text-[10px] font-black text-orange-500/80 uppercase tracking-[0.2em] mb-2 relative z-10">Waktu Terhemat</p>
        <h2 className="text-5xl font-black text-orange-400 italic tracking-tighter relative z-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">{timeSaved}</h2>
        <p className="text-[9px] font-black text-slate-600 uppercase mt-4 tracking-widest relative z-10">Automasi CS 24/7</p>
      </div>

    </div>
  );
}