"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Activity, Cpu, Database, Globe, Server, 
  Zap, Clock, AlertTriangle, CheckCircle2, 
  TrendingUp, DollarSign, TerminalSquare, Bug, 
  PieChart, Smartphone, Monitor
} from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SuperAdminDashboard() {
  const [isMounted, setIsMounted] = useState(false);

  const [isTableMaximized, setIsTableMaximized] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // STATE DATA ASLI
  const [kpi, setKpi] = useState({ totalCalls: 0, totalTokens: 0, avgLatency: 0, errors: 0, totalCostIDR: 0 });
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  
  // STATE 4 FITUR DEWA BARU
  const [chartData, setChartData] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState({ flash: 0, lite: 0, pro: 0, total: 0 });
  const [platformStats, setPlatformStats] = useState({ wa: 0, ig: 0, web: 0, total: 0 });
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  // STATE KESEHATAN SERVER
  const [serverHealth, setServerHealth] = useState({
    supabase: { ping: 0, status: "Checking..." },
    gemini: { ping: 0, status: "Checking..." }
  });

  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState("");
  const [isNuking, setIsNuking] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const GEMINI_PRICING: Record<string, { input: number, output: number }> = {
    "gemini-2.5-flash-lite": { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    "gemini-2.5-flash": { input: 0.075 / 1000000, output: 0.30 / 1000000 },
    "gemini-2.5-pro": { input: 1.25 / 1000000, output: 5.00 / 1000000 },
  };

  useEffect(() => {
    setIsMounted(true);
    fetchRealData();
  }, [selectedMonth]);

  const fetchRealData = async () => {
    try {
      const pingStart = performance.now();
      
      // LOGIKA KALENDER
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();

      // 1. TARIK SEMUA DATA (Tanpa Limit agar KPI Keuangan Akurat)
      const { data: allLogs, error } = await supabase
        .from('usage_logs')
        .select(`*, clients (name, is_active)`)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order('created_at', { ascending: false });

      const { data: allChatLogs } = await supabase
        .from('chat_logs')
        .select('platform')
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const pingEnd = performance.now();
      const actualDbPing = Math.round(pingEnd - pingStart);

      if (error) throw error;

      if (allLogs) {
        // --- HITUNGAN KPI (MENGGUNAKAN SELURUH DATA) ---
        const totalCalls = allLogs.length;
        let totalTokens = 0, totalCostUSD = 0, totalLatency = 0, errorCount = 0;
        let flash = 0, lite = 0, pro = 0;
        
        const dailyDataMap = new Map();
        const errorsList: any[] = [];

        allLogs.forEach(log => {
          totalTokens += (log.total_tokens || 0);
          totalLatency += (log.latency_ms || 0);
          
          const modelName = log.model_used || "gemini-2.5-flash";
          const rates = GEMINI_PRICING[modelName] || GEMINI_PRICING["gemini-2.5-flash"];
          totalCostUSD += ((log.tokens_input || 0) * rates.input) + ((log.tokens_output || 0) * rates.output);

          if (modelName.includes('lite')) lite++;
          else if (modelName.includes('pro')) pro++;
          else flash++;

          if (log.status === 'error') {
            errorCount++;
            if (errorsList.length < 5) {
              errorsList.push({
                time: new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                client: log.clients?.name || 'Unknown',
                model: modelName,
                latency: log.latency_ms
              });
            }
          }

          // Data untuk Grafik
          const date = new Date(log.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
          if (!dailyDataMap.has(date)) dailyDataMap.set(date, { date, calls: 0, tokens: 0 });
          dailyDataMap.get(date).calls++;
          dailyDataMap.get(date).tokens += (log.total_tokens || 0);
        });

        // OLAH DATA OMNICHANNEL (MENGGUNAKAN SELURUH DATA)
        let wa = 0, ig = 0, web = 0;
        if (allChatLogs) {
          allChatLogs.forEach(c => {
            const p = c.platform ? String(c.platform).toLowerCase() : "";
            if (p.includes('wa')) wa++;
            else if (p.includes('ig') || p.includes('insta')) ig++;
            else if (p.includes('web')) web++;
            else wa++; // Default ke WA untuk data lama
          });
        }

        const costIDR = (totalCostUSD * 1.11) * 15500;
        const avgLatencyS = totalCalls > 0 ? (totalLatency / totalCalls / 1000) : 0;

        // SET KPI & STATS (TOTAL REAL)
        setKpi({ totalCalls, totalTokens, avgLatency: avgLatencyS, errors: errorCount, totalCostIDR: costIDR });
        setModelStats({ flash, lite, pro, total: totalCalls });
        setPlatformStats({ wa, ig, web, total: (wa + ig + web) || 1 });
        setRecentErrors(errorsList);
        setChartData(Array.from(dailyDataMap.values()).reverse());

        // --- SET TABLE LOGS (KITA LIMIT 100 BARIS SAJA BIAR ENTENG) ---
        const logsForTable = allLogs.slice(0, 100); 
        const clientMap = new Map();
        logsForTable.forEach(log => {
          if (!clientMap.has(log.client_id)) {
            clientMap.set(log.client_id, {
              name: log.clients?.name || 'Unknown Node',
              tokens: log.total_tokens || 0,
              lastActivity: new Date(log.created_at),
              isLive: (new Date().getTime() - new Date(log.created_at).getTime()) < 300000
            });
          }
        });
        setClientLogs(Array.from(clientMap.values()));

        setServerHealth({
          supabase: { ping: actualDbPing, status: actualDbPing < 500 ? "Optimal" : "Degraded" },
          gemini: { ping: Math.round(avgLatencyS * 1000), status: errorCount > (totalCalls * 0.1) ? "High Errors" : "Optimal" }
        });
      }
    } catch (err) {
      console.error("Gagal menarik data Telemetry:", err);
      setServerHealth(prev => ({ ...prev, supabase: { ping: 0, status: "Offline" } }));
    }
  };

  const executeEmergencyStop = async () => {
    if (nukeConfirmText !== "NUKE KILL") return;
    setIsNuking(true);
    try {
      const { error } = await supabase.from('clients').update({ is_active: false }).eq('is_active', true);
      if (error) throw error;
      alert("🚨 SYSTEM HALTED: Seluruh operasional AI telah dihentikan secara paksa!");
      setIsNukeModalOpen(false);
      setNukeConfirmText("");
      fetchRealData(); 
    } catch (err: any) {
      alert("Gagal mematikan sistem: " + err.message);
    } finally {
      setIsNuking(false);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500 animate-pulse font-bold tracking-widest">INITIALIZING TUMBUH AI CORE...</div>;

  const errorRate = kpi.totalCalls > 0 ? ((kpi.errors / kpi.totalCalls) * 100).toFixed(2) : "0.00";
  const formattedCostIDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(kpi.totalCostIDR || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 selection:bg-blue-500/30 relative overflow-hidden pb-20">
      
      {/* NUCLEAR MODAL: EMERGENCY STOP ALL */}
      {isNukeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-950 w-full max-w-md rounded-[2rem] shadow-[0_0_80px_rgba(220,38,38,0.5)] border-2 border-red-600 overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <div className="bg-red-950/50 p-8 md:p-10 text-white text-center border-b border-red-900/50">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-pulse">
                <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-red-500">GLOBAL KILL SWITCH</h2>
              <p className="text-red-400 text-[10px] md:text-xs mt-3 font-bold uppercase tracking-widest opacity-80">Mematikan seluruh operasional AI Klien!</p>
            </div>
            <div className="p-6 md:p-10">
              <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Ketik kalimat ini untuk konfirmasi:</p>
              <div className="bg-slate-900 p-4 rounded-xl md:rounded-2xl border border-dashed border-red-500/50 mb-6 text-center select-none">
                <span className="text-red-500 font-black text-base md:text-lg italic tracking-tight">NUKE KILL</span>
              </div>
              <input 
                type="text" placeholder="Ketik di sini..." value={nukeConfirmText} onChange={(e) => setNukeConfirmText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 font-black text-center text-white outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all mb-6 placeholder:text-slate-600 uppercase"
              />
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => { setIsNukeModalOpen(false); setNukeConfirmText(""); }} className="w-full sm:flex-1 bg-slate-800 text-slate-400 border border-slate-700 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 hover:text-white transition-all active:scale-95">Batal</button>
                <button onClick={executeEmergencyStop} disabled={nukeConfirmText !== "NUKE KILL" || isNuking} className="w-full sm:flex-[1.5] bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-500 disabled:border-slate-800">
                  {isNuking ? "MEMATIKAN..." : "☢️ KILL"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TerminalSquare className="text-blue-500 w-8 h-8" />
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                Tumbuh <span className="text-blue-500">AI</span> <span className="text-slate-600 font-light">| TELEMETRY</span>
              </h1>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Global Performance & Node Monitoring</p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3 md:gap-4">
            <Link href="/dashboard/admin" className="text-[10px] font-black bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-4 py-2 md:py-2.5 rounded-full uppercase tracking-widest transition-all border border-slate-800 flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Business Ops
            </Link>

            {/* [NEW 🟢]: KALENDER TIME MACHINE */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-full border border-slate-800 shadow-inner">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Range:</span>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="text-[10px] font-black text-blue-400 outline-none cursor-pointer bg-transparent dark:[color-scheme:dark]" 
              />
            </div>

            <button onClick={fetchRealData} className="text-[10px] font-black bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 md:py-2.5 rounded-full uppercase tracking-widest transition-all border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              Refresh Data
            </button>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2 md:py-2.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Connected</span>
            </div>

          </div>
        </header>

        {/* TOP LEVEL KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard icon={<Zap />} title="Total API Calls" value={kpi.totalCalls.toLocaleString()} subValue="All time" color="text-yellow-400" bg="bg-yellow-400/10" />
          <KpiCard icon={<DollarSign/>} title="Real API Spend" value={formattedCostIDR} subValue={`${kpi.totalTokens.toLocaleString()} Tokens`} color="text-green-400" bg="bg-green-400/10" />          
          <KpiCard icon={<Clock />} title="Avg. AI Latency" value={`${kpi.avgLatency.toFixed(2)}s`} subValue="Response speed" color="text-blue-400" bg="bg-blue-400/10" />
          <KpiCard icon={<AlertTriangle />} title="Error Rate" value={`${errorRate}%`} subValue={`${kpi.errors} failed prompts`} color={kpi.errors > 0 ? "text-red-400" : "text-slate-400"} bg={kpi.errors > 0 ? "bg-red-400/10" : "bg-slate-800/50"} />
        </div>

        {/* ========================================================================= */}
        {/* ROW 1: TIME-SERIES CHART & DISTRIBUTION RADARS (FITUR BARU 1, 2, & 4) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* FITUR 4: TRAFFIC CHART */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> API Traffic (Tokens Over Time)
            </h2>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTokens)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FITUR 1 & 2: MODEL & PLATFORM RADAR */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
            
            {/* AI Model Distribution */}
            <div className="mb-6">
              <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-400" /> Model Distribution
              </h2>
              <div className="space-y-4">
                <ProgressBar label="Gemini 2.5 Flash" value={modelStats.flash} total={modelStats.total} color="bg-indigo-500" />
                <ProgressBar label="Gemini 2.5 Flash Lite" value={modelStats.lite} total={modelStats.total} color="bg-blue-500" />
                <ProgressBar label="Gemini 2.5 Pro (Heavy)" value={modelStats.pro} total={modelStats.total} color="bg-purple-500" />
              </div>
            </div>

            <div className="h-px w-full bg-slate-800 my-4"></div>

            {/* Omnichannel Traffic Radar */}
            <div>
              <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> Omnichannel Radar
              </h2>
              <div className="flex justify-between items-end gap-2">
                <PlatformBar icon={<Smartphone className="w-4 h-4"/>} name="WhatsApp" value={platformStats.wa} total={platformStats.total} color="bg-emerald-500" />
                <PlatformBar icon={<Monitor className="w-4 h-4"/>} name="Instagram" value={platformStats.ig} total={platformStats.total} color="bg-pink-500" />
                <PlatformBar icon={<Globe className="w-4 h-4"/>} name="Web Chat" value={platformStats.web} total={platformStats.total} color="bg-blue-500" />
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 2: LIVE LOGS & ERROR TRAP (FITUR BARU 3) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* 1. LIVE NODE ACTIVITY (KITA KASIH SPACE LEBIH LEBAR) */}
          <div className="lg:col-span-1">
             <div className={`transition-all duration-500 ease-in-out ${
                isTableMaximized 
                ? "fixed inset-4 md:inset-10 z-[100] bg-slate-900 border-2 border-blue-500/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-4 md:p-8 rounded-[2rem]" 
                : "bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl h-full"
              }`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Live Node Activity
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={fetchRealData} className="text-[10px] bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest hover:bg-blue-600/40">Sync</button>
                    <button onClick={() => setIsTableMaximized(!isTableMaximized)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700">
                      {isTableMaximized ? <span className="text-xs">✕</span> : <Activity className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className={`overflow-auto custom-scrollbar ${isTableMaximized ? "h-[calc(100%-80px)]" : "max-h-[300px]"}`}>
                   <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                        <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
                          <th className="pb-4 font-black">Node</th>
                          <th className="pb-4 font-black">Status</th>
                          <th className="pb-4 font-black">Tokens</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {clientLogs.map((client, idx) => (
                          <ClientRow key={idx} client={client.name} status={client.isLive ? "Active" : "Idle"} tokens={client.tokens.toLocaleString()} time={client.lastActivity.toLocaleTimeString()} isLive={client.isLive} />
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
             {isTableMaximized && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90]" onClick={() => setIsTableMaximized(false)}></div>}
          </div>

          {/* 2. LIVE ERROR TRAP (TENGAH) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl h-full">
            <h2 className="text-[12px] font-black text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Bug className="w-4 h-4" /> Live Error Trap
            </h2>
            <div className="space-y-3">
              {recentErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-[10px] font-bold uppercase text-green-400">Zero Bugs</span>
                </div>
              ) : (
                recentErrors.map((err, idx) => (
                  <div key={idx} className="bg-red-950/20 border border-red-900/50 rounded-xl p-3">
                    <p className="text-xs font-bold text-white">{err.client}</p>
                    <p className="text-[9px] text-red-400">{err.time} • {err.model}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. TOP SPENDING NODES (KANAN - MENGISI KEKOSONGAN) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl h-full">
            <h2 className="text-[12px] font-black text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Top Spending Nodes
            </h2>
            <div className="space-y-4">
              {clientLogs.sort((a, b) => b.tokens - a.tokens).slice(0, 5).map((client, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-600">#{idx + 1}</span>
                    <p className="text-xs font-bold text-slate-300 truncate max-w-[80px]">{client.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-black text-amber-500">
                      Rp {Math.round((client.tokens / 1000) * 0.002 * 15500 * 1.11).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[8px] text-slate-500 font-bold">{client.tokens.toLocaleString()} TKN</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ROW 3: INFRASTRUCTURE, COGNITIVE ENGINE & OVERRIDES */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-900/20 to-slate-900 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px]"></div>
            
            <div className="flex-1">
              <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Server className="w-4 h-4" /> Server Health
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <HealthMetric name="Gemini AI Core" status={serverHealth.gemini.status} ping={`${serverHealth.gemini.ping}ms`} />
                <HealthMetric name="Supabase Database" status={serverHealth.supabase.status} ping={`${serverHealth.supabase.ping}ms`} />
              </div>
            </div>

            <div className="w-px bg-slate-800 hidden md:block"></div>

            <div className="flex-1">
              <h2 className="text-[12px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Cognitive Engine
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">
                    <span>Avg. Context Window</span>
                    <span className="text-blue-400">{kpi.totalCalls > 0 ? Math.round(kpi.totalTokens / kpi.totalCalls) : 0} Tkn/Call</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${Math.min(((kpi.totalTokens / (kpi.totalCalls || 1)) / 8000) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">
                    <span>DB Retrieval Speed</span>
                    <span className={serverHealth.supabase.ping < 500 ? "text-green-400" : "text-yellow-400"}>{serverHealth.supabase.ping}ms</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`${serverHealth.supabase.ping < 500 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'} h-full rounded-full transition-all duration-1000`} style={{ width: `${Math.max(100 - (serverHealth.supabase.ping / 10), 10)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Globe className="w-4 h-4" /> CEO Overrides
            </h2>
            <div className="space-y-3">
              <Link href="/register" className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-slate-500 transition-all group block">
                <span className="block text-xs font-bold text-white uppercase tracking-widest mb-1 group-hover:text-blue-400">Deploy New Node</span>
                <span className="block text-[10px] text-slate-500">Register new client & generate access keys</span>
              </Link>
              <button onClick={() => setIsNukeModalOpen(true)} className="w-full text-left px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-red-900/30 hover:border-red-500/50 transition-all group">
                <span className="block text-xs font-bold text-white uppercase tracking-widest mb-1 group-hover:text-red-400">Emergency Stop All</span>
                <span className="block text-[10px] text-slate-500">Halt all AI generations temporarily</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MICRO-COMPONENTS
// ============================================================================

function ProgressBar({ label, value, total, color }: any) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-white">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

function PlatformBar({ icon, name, value, total, color }: any) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center flex-1">
      <div className={`w-8 h-8 rounded-full ${color}/20 text-white flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="w-full bg-slate-800 h-24 rounded-t-md relative overflow-hidden group">
        <div className={`absolute bottom-0 w-full ${color} transition-all duration-1000 group-hover:opacity-80`} style={{ height: `${percentage}%` }}></div>
      </div>
      <p className="text-[10px] font-bold text-slate-400 mt-2 text-center w-full">{name}</p>
      <p className="text-xs font-black text-white">{percentage}%</p>
    </div>
  );
}

function KpiCard({ icon, title, value, subValue, color, bg }: any) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm hover:bg-slate-800/50 transition-colors relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 ${bg} rounded-full blur-2xl group-hover:blur-3xl transition-all`}></div>
      <div className={`w-10 h-10 rounded-2xl ${bg} ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-white mb-2 tracking-tighter">{value}</p>
      <div className="flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-green-400" />
        <span className="text-[10px] font-bold text-slate-500">{subValue}</span>
      </div>
    </div>
  );
}

function HealthMetric({ name, status, ping }: any) {
  return (
    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
      <div className="flex justify-between items-start mb-3">
        <Database className="w-4 h-4 text-slate-400" />
        <span className={`text-[10px] font-black px-2 py-1 rounded-md ${status === "Optimal" ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"}`}>{ping}</span>
      </div>
      <p className="text-xs font-bold text-white mb-1">{name}</p>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className={`w-3 h-3 ${status === "Optimal" ? "text-green-500" : "text-yellow-500"}`} />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{status}</span>
      </div>
    </div>
  );
}

function ClientRow({ client, status, tokens, time, isLive = false }: any) {
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
      <td className="py-4 pr-2">
        <p className="font-bold text-slate-300 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">{client}</p>
      </td>
      <td className="py-4">
        <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 md:py-1 rounded-md flex w-fit items-center gap-1 md:gap-2 ${isLive ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
          {isLive && <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
          {status}
        </span>
      </td>
      <td className="py-4 text-[10px] md:text-xs font-mono text-slate-400 text-right md:text-left">{tokens}</td>
      <td className="py-4 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right hidden md:table-cell">{time}</td>
    </tr>
  );
}