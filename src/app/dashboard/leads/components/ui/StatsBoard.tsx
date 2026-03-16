"use client";

interface StatsBoardProps {
  totalLeads: number;
  totalEngagement?: number;
  timeSaved?: string;
  themeColor?: "blue" | "green" | "purple" | "orange"; // Diperketat tipe datanya
}

export default function StatsBoard({ 
  totalLeads, 
  totalEngagement = 16, 
  timeSaved = "~1j",
  themeColor = "blue"
}: StatsBoardProps) {

  // FIX: Mapping warna agar Tailwind (PurgeCSS) tidak kebingungan
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600"
  };

  const dynamicTextColor = colorMap[themeColor] || colorMap["blue"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] transition-all duration-300">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Capture Leads</p>
        <h2 className="text-5xl font-black italic tracking-tighter text-slate-900">{totalLeads}</h2>
        <span className="inline-block px-3 py-1 mt-4 bg-green-50 text-green-600 text-[9px] font-black rounded-full uppercase italic">Potential Sales</span>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] transition-all duration-300">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Engagement</p>
        {/* FIX DI SINI: Memanggil class utuh dari mapping */}
        <h2 className={`text-5xl font-black italic tracking-tighter ${dynamicTextColor}`}>{totalEngagement}</h2>
        <p className="text-[9px] font-black text-slate-300 uppercase mt-4 italic">Interaksi AI Terdeteksi</p>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] transition-all duration-300">
        <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Waktu Terhemat</p>
        <h2 className="text-5xl font-black text-orange-500 italic tracking-tighter">{timeSaved}</h2>
        <p className="text-[9px] font-black text-slate-300 uppercase mt-4 italic">Automasi CS 24/7</p>
      </div>
    </div>
  );
}