"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Komponen UI
import LeadsTable from "../components/ui/LeadsTable";
import WeeklyAnalyticsChart from "../components/ui/WeeklyAnalyticsChart";
import AITrainer from "../components/ui/AITrainer";
import LiveChat from "./ui/LiveChat";

// Import Addon
import PromoBannerAddon from "../addons/PromoBannerAddon";
import PriceListAddon from "../addons/PriceListAddon";
import ServiceScheduleAddon from "../addons/ServiceScheduleAddon";

// Import Addon Premium
import MonthlyInsightAddon from "../addons/MonthlyInsightAddon";
import AIAnalyst from "../addons/premium/AIAnalyst";
import AIGhostRecovery from "../addons/premium/AIGhostRecovery";
import AIUpsellEngine from "../addons/premium/AIUpsellEngine";
import AILeadScorer from "../addons/premium/AILeadScorer";
import AIMarketOracle from "../addons/premium/AIMarketOracle"; 
// THE APEX TRINITY 👑
import AIBlueOceanNavigator from "../addons/premium/AIBlueOceanNavigator"; 
import AIBlackCardArchitect from "../addons/premium/AIBlackCardArchitect";
import AISyndicateEngine from "../addons/premium/AISyndicateEngine";

export default function TailorDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const id = user?.user_metadata?.client_id;
      if (!id) return;

      setClientId(id);
      setClientName(user?.user_metadata?.name || "Tailor Admin");

      const [leadsRes, clientRes] = await Promise.all([
        supabase.from("leads").select("*").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("clients").select("system_prompt, features").eq("id", id).maybeSingle(),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) {
        setPrompt(clientRes.data.system_prompt || "");
        setClientFeatures(clientRes.data.features || {});
      }

    } catch (err) {
      console.error("Refresh Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
    if (!clientId) return;

    const channel = supabase
      .channel(`realtime-tailor-${clientId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, clientId, supabase]);

  const handleUpdatePrompt = async () => {
    if (!clientId) return;
    setIsSaving(true);
    await supabase.from("clients").update({ system_prompt: prompt }).eq("id", clientId);
    setIsSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- FUNGSI LOGOUT (TADI HILANG DI KODE KAMU) ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // const interactionData = [
  //   { day: 'Sen', chats: leads.filter(l => new Date(l.created_at).getDay() === 1).length || 0 },
  //   { day: 'Sel', chats: leads.filter(l => new Date(l.created_at).getDay() === 2).length || 0 },
  //   { day: 'Rab', chats: leads.filter(l => new Date(l.created_at).getDay() === 3).length || 0 },
  //   { day: 'Kam', chats: leads.filter(l => new Date(l.created_at).getDay() === 4).length || 0 },
  //   { day: 'Jum', chats: leads.filter(l => new Date(l.created_at).getDay() === 5).length || 0 },
  //   { day: 'Sab', chats: leads.filter(l => new Date(l.created_at).getDay() === 6).length || 0 },
  //   { day: 'Min', chats: leads.filter(l => new Date(l.created_at).getDay() === 0).length || 0 },
  // ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900 relative">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl border border-blue-500/50 uppercase text-[10px] font-black italic tracking-widest text-center">
            Tailor Intelligence Synced!
          </div>
        </div>
      )}

      {/* HEADER: KEMBALI SEPERTI DEFAULT DASHBOARD */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Node: <span className="text-blue-600 italic">{clientName}</span></h1>
          <p className="text-slate-400 font-bold mt-1 italic text-[10px] uppercase tracking-[0.3em]">Custom Fitting AI Control</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="bg-white border-2 border-slate-100 text-red-500 px-6 py-3 rounded-2xl font-black hover:bg-red-50 transition-all text-[10px] uppercase italic">Logout</button>
          <button onClick={() => fetchData()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all text-[10px] uppercase italic tracking-widest">
            {loading ? "Syncing..." : "Refresh Engine"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* STATS SECTION: KEMBALI SEPERTI DEFAULT DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Capture Leads</p>
              <h2 className="text-5xl font-black italic tracking-tighter text-slate-900">{leads.length}</h2>
              <span className="inline-block px-3 py-1 mt-4 bg-green-50 text-green-600 text-[9px] font-black rounded-full uppercase italic">Potential Sales</span>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Engagement</p>
              <h2 className="text-5xl font-black text-blue-600 italic tracking-tighter">16</h2>
              <p className="text-[9px] font-black text-slate-300 uppercase mt-4 italic">Interaksi AI Terdeteksi</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white text-center">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Waktu Terhemat</p>
              <h2 className="text-5xl font-black text-orange-500 italic tracking-tighter">~1j</h2>
              <p className="text-[9px] font-black text-slate-300 uppercase mt-4 italic">Automasi CS 24/7</p>
            </div>
          </div>

          {/* AREA ADDON: HANYA MUNCUL JIKA DIAKTIFKAN DI ADMIN */}
          {clientFeatures?.has_addon && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PromoBannerAddon clientId={clientId} addonType="tailor_promo" label="Promo Jahit Lebaran" />
                <PriceListAddon clientId={clientId} label="Daftar Harga & Layanan" />
              </div>
              {/* Tambahan Schedule di bawahnya agar rapi */}
              <ServiceScheduleAddon clientId={clientId} label="Jadwal Operasional Tailor" />
            </div>
          )}

          {/* CHART SECTION*/}
          <WeeklyAnalyticsChart leads={leads} />

          {/* PREMIUM ADDON: AI MONTHLY SUMMARY */}
            {clientFeatures?.has_addon && ( // Kamu bisa ganti validasi ini dengan 'has_premium' kalau nanti ada
              <MonthlyInsightAddon 
                clientId={clientId} 
                selectedMonth={selectedMonth} 
                leads={leads.filter(l => l.created_at.startsWith(selectedMonth))} // Hanya kirim leads bulan tersebut
              />
            )}

            {/* TABEL LEADS (Sekarang kita lempar state bulan-nya ke tabel) */}
            <LeadsTable 
              leads={leads} 
              title="Order & Fitting Queue" 
              selectedMonth={selectedMonth} 
              setSelectedMonth={setSelectedMonth} 
            />
            {/* COMMUNICATION TERMINAL */}
            <div className="mt-12">
                <div className="mb-4">
                  <h2 className="text-2xl font-black italic tracking-tight uppercase text-slate-900">Communication Terminal</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live AI & Human Takeover Module</p>
                </div>
                <LiveChat />
            </div>

            <div className="space-y-10">
                <AIAnalyst clientId={clientId} leads={leads}/>
                <AIGhostRecovery clientId={clientId} leads={leads} />
                <AIUpsellEngine clientId={clientId} leads={leads} />
                <AILeadScorer clientId={clientId} leads={leads} />
                <AIMarketOracle clientId={clientId} leads={leads} avgTicketSize={250000} />
                
                {/* APEX TIER (Modular, tinggal hapus/pindah kalau klien nggak langganan) */}
                <AIBlueOceanNavigator clientId={clientId} leads={leads} />
                <AIBlackCardArchitect clientId={clientId} leads={leads} /> 
                <AISyndicateEngine clientId={clientId} leads={leads} />
            </div>
          </div>
                

        {/* AI Trainer*/}
        <div className="lg:col-span-4 space-y-8">
          
          <AITrainer 
            prompt={prompt} 
            setPrompt={setPrompt} 
            handleUpdatePrompt={handleUpdatePrompt} 
            isSaving={isSaving} 
            setShowToast={setShowToast} 
          />
          
        </div>
      </div>
    </div>
  );
}