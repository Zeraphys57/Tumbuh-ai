"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function UsageDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [stats, setStats] = useState<any[]>([]);
  const [clientName, setClientName] = useState("Loading...");
  const LIMIT_RPD = 1500; // Limit Tier 1 Gemini

  useEffect(() => {
    async function fetchUsage() {
      // 1. Dapatkan user metadata untuk ambil client_id
      const { data: { user } } = await supabase.auth.getUser();
      const clientId = user?.user_metadata?.client_id;
      const name = user?.user_metadata?.name || "Klien";
      
      setClientName(name);

      if (clientId) {
        const today = new Date().toISOString().split('T')[0];
        
        // 2. Filter query berdasarkan client_id agar data tidak bercampur
        const { data } = await supabase
          .from("usage_logs")
          .select("total_tokens, clients(name)")
          .eq("client_id", clientId) // Kunci keamanan: Hanya tarik data sendiri
          .gte("created_at", today);
        
        setStats(data || []);
      }
    }
    fetchUsage();
  }, [supabase]);

  const totalRequestsToday = stats.length;
  const totalTokensToday = stats.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">AI Usage <span className="text-blue-600">Metrics</span></h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Real-time Token Consumption</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* KOTAK REQUEST */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-all"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Daily Requests</p>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mt-4">
              {totalRequestsToday} <span className="text-xl text-slate-300 font-bold">/ {LIMIT_RPD}</span>
            </h2>
            <div className="w-full bg-slate-100 h-2.5 mt-6 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                style={{ width: `${Math.min((totalRequestsToday / LIMIT_RPD) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* KOTAK TOKENS */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-all"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <p className="text-xs text-indigo-300 font-black uppercase tracking-widest">Tokens Consumed</p>
            </div>
            <h2 className="text-4xl font-black text-white mt-4 tracking-tight">{totalTokensToday.toLocaleString()}</h2>
            <p className="text-[10px] text-slate-400 mt-6 uppercase font-bold tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Tier 1 Professional Plan
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-widest">Detail Pemakaian Node</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Nama Bisnis</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Total Interaksi</th>
                <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Total Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {totalRequestsToday > 0 ? (
                <tr className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 font-black text-slate-700 uppercase italic tracking-tight">{clientName}</td>
                  <td className="px-8 py-6 text-center font-bold text-blue-600 bg-blue-50/30 group-hover:bg-blue-50 transition-colors">{totalRequestsToday}</td>
                  <td className="px-8 py-6 text-right font-mono font-bold text-slate-500">{totalTokensToday.toLocaleString()}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={3} className="p-16 text-center">
                     <div className="flex flex-col items-center justify-center text-slate-400">
                       <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                       <p className="font-bold uppercase text-[10px] tracking-widest italic">Belum ada pemakaian server hari ini</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}