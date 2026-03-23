"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// --- IMPORT KOMPONEN UI INTI (TIDAK ADA YANG BERUBAH) ---
import StatsBoard from "./ui/StatsBoard";
import LeadsTable from "./ui/LeadsTable";
import AITrainer from "./ui/AITrainer";
import RefreshEngine from "./ui/RefreshEngine";
import WeeklyAnalyticsChart from "./ui/WeeklyAnalyticsChart";
import LiveChat from "./ui/LiveChat";
import EmergencyContact from "./ui/EmergencyContact";
import RAGTrainer from "./ui/RAGTrainer"; 

export default function DefaultDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clientName, setClientName] = useState("");
  
  // STATE UNTUK ADD-ON KNOWLEDGE DASAR
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [dailyInfo, setDailyInfo] = useState("");
  const [isSavingAddon, setIsSavingAddon] = useState(false);

  const [adminPhone, setAdminPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. FUNGSI FETCH DATA (LOGIKA UTUH 100%)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
         setLoading(false);
         return;
      }

      const id = session.user.user_metadata?.client_id;
      const name = session.user.user_metadata?.name || "Admin";
      
      if (!id) {
         setLoading(false);
         return;
      }

      setClientId(id);
      setClientName(name);

      const [leadsRes, clientRes, addonRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, client_id, customer_name, customer_phone, customer_needs, total_people, booking_date, booking_time, is_bot_active, platform, created_at, full_chat") 
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("system_prompt, features").eq("id", id).maybeSingle(),
        supabase.from("client_addons_data").select("content").eq("client_id", id).eq("addon_type", "daily_menu").maybeSingle()
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (clientRes.data) {
        setPrompt(clientRes.data.system_prompt || "");
        
        // Tarik features JSON dan masukkan nomor WA Admin ke State
        const featuresObj = clientRes.data.features || {};
        setClientFeatures(featuresObj);
        setAdminPhone(featuresObj.admin_whatsapp_number || ""); 
      }
      if (addonRes.data) setDailyInfo(addonRes.data.content || "");

    } catch (err) {
      console.error("Refresh Failed:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // 2. REAL-TIME SUBSCRIPTION (LOGIKA UTUH 100%)
  useEffect(() => {
    fetchData();
    if (!clientId) return;

    const channel = supabase
      .channel(`realtime-leads-${clientId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => [payload.new, ...currentLeads]);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, 
        (payload) => {
          setLeads((currentLeads) => currentLeads.map(lead => lead.id === payload.new.id ? payload.new : lead));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase, clientId]);

  // 3. FUNGSI UPDATE DATA (LOGIKA UTUH 100%)
  const handleUpdateDailyInfo = async () => {
    if (!clientId) return;
    setIsSavingAddon(true);
    const { error } = await supabase.from("client_addons_data").upsert({ 
      client_id: clientId, addon_type: "daily_menu", content: dailyInfo 
    }, { onConflict: 'client_id,addon_type' });
    setIsSavingAddon(false);
    if (!error) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
  };

  const handleUpdatePrompt = async () => {
    if (!clientId) return;
    setIsSaving(true);
    await supabase.from("clients").update({ system_prompt: prompt }).eq("id", clientId);
    setIsSaving(false);
    setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  };

  const handleUpdateAdminPhone = async () => {
    if (!clientId) return;
    setIsSavingPhone(true);
    
    // Gabungkan nomor WA baru ke dalam objek features
    const updatedFeatures = { 
      ...clientFeatures, 
      admin_whatsapp_number: adminPhone 
    };

    const { error } = await supabase.from("clients").update({ features: updatedFeatures }).eq("id", clientId);
    
    setIsSavingPhone(false);
    if (!error) { 
      setClientFeatures(updatedFeatures);
      setShowToast(true); 
      setTimeout(() => setShowToast(false), 3000); 
    } else {
      console.error("Gagal menyimpan nomor WA", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // -----------------------------------------------------------------------------------
  // UI RENDER: UPGRADED TO GOD-MODE (DARK, GLASSMORPHISM, LUXURY)
  // -----------------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
        <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin z-10 shadow-[0_0_30px_rgba(59,130,246,0.5)]"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse z-10">Initializing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans p-4 md:p-8 selection:bg-blue-500/30 relative overflow-hidden pb-20">
      
      {/* Background Effects (Sama persis dengan Super Dashboard) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Toast Notification (Upgraded to Neon Dark) */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-8 py-4 rounded-full shadow-[0_0_30px_rgba(34,197,94,0.2)] border border-green-500/30 uppercase text-[10px] font-black italic tracking-widest text-center flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            System Synchronized!
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto relative z-10">
        
        {/* HEADER SECTION */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                Workspace: <span className="text-blue-500">{clientName}</span>
              </h1>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Tumbuh AI • Standard Operations</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleLogout} className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 px-6 py-2.5 rounded-full font-black transition-all text-[10px] uppercase tracking-widest active:scale-95">
              Logout
            </button>
            <RefreshEngine onRefresh={fetchData} loading={loading} />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* KOLOM KIRI: OPERATIONS (8/12) */}
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            
            {/* STATS BOARD WRAPPER */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-1 backdrop-blur-xl">
              <StatsBoard totalLeads={leads.length} themeColor="blue" />
            </div>

            {/* CHART WRAPPER */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] pointer-events-none"></div>
               <WeeklyAnalyticsChart leads={leads} />
            </div>

            {/* LEADS TABLE WRAPPER */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-1 backdrop-blur-xl">
              <LeadsTable leads={leads} title="Database Pelanggan Terkini" buttonColor="bg-blue-600" />
            </div>

            {/* LIVE CHAT TERMINAL (UPGRADED) */}
            <div className="bg-slate-950 rounded-[3rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-800 relative">
               <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>
               <div className="px-8 py-6 flex items-center justify-between border-b border-slate-800 relative z-10 bg-slate-900/50 backdrop-blur-md">
                 <div>
                    <h2 className="text-white text-lg font-black italic tracking-widest uppercase flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      Communication Terminal
                    </h2>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5">Live Human Takeover Module</p>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                    <span className="text-green-400 text-[9px] font-black uppercase tracking-widest">Active</span>
                 </div>
               </div>
               <div className="bg-slate-900/80 rounded-b-[3rem] overflow-hidden relative z-10">
                 <LiveChat />
               </div>
            </div>

          </div>

          {/* KOLOM KANAN: KNOWLEDGE & SETTINGS (4/12) */}
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            
            {/* FITUR KNOWLEDGE NODE (UPGRADED TO GLOWING GLASS) */}
            {clientFeatures?.has_addon && (
              <div className="bg-gradient-to-br from-blue-900/20 to-slate-900 border border-blue-500/30 p-8 rounded-[2.5rem] shadow-[0_0_30px_rgba(59,130,246,0.1)] text-white relative overflow-hidden group">
                 <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] group-hover:bg-blue-500/30 transition-all duration-500"></div>
                 
                 <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/50 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 className="font-black text-xl italic uppercase tracking-tighter text-blue-100">
                      {clientFeatures?.addon_label || "Update Harian"}
                    </h3>
                 </div>
                 <div className="space-y-4 relative z-10">
                    <textarea 
                      className="w-full h-[150px] bg-slate-950/50 rounded-[1.5rem] p-5 text-xs font-medium border border-slate-700 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-slate-300 resize-none placeholder-slate-600 custom-scrollbar"
                      value={dailyInfo}
                      onChange={(e) => setDailyInfo(e.target.value)}
                      placeholder={clientFeatures?.addon_placeholder || "Ketik informasi tambahan untuk AI di sini..."}
                    />
                    <button onClick={handleUpdateDailyInfo} disabled={isSavingAddon} className="w-full bg-blue-600 text-white py-4 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 border border-blue-400">
                      {isSavingAddon ? "Menyimpan..." : "Simpan Info"}
                    </button>
                 </div>
              </div>
            )}

            {/* AI TRAINER INTI (MANUAL) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-1 backdrop-blur-xl">
              <AITrainer prompt={prompt} setPrompt={setPrompt} handleUpdatePrompt={handleUpdatePrompt} isSaving={isSaving} setShowToast={setShowToast} />
            </div>

            {/* RAG TRAINER (SUNTIK OTAK PDF) */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-1 backdrop-blur-xl">
              <RAGTrainer clientId={clientId} />
            </div>

            {/* PENGATURAN NOTIFIKASI DARURAT */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-1 backdrop-blur-xl">
              <EmergencyContact adminPhone={adminPhone} setAdminPhone={setAdminPhone} handleUpdateAdminPhone={handleUpdateAdminPhone} isSavingPhone={isSavingPhone} />
            </div>

            {/* FOOTER BRANDING STANDARD (UPGRADED) */}
            <div className="bg-slate-900/20 border border-slate-800/50 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center mt-8 backdrop-blur-sm">
               <div className="text-xl font-black tracking-tighter mb-1 text-slate-500">TUMBUH<span className="text-blue-600/50">.AI</span></div>
               <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Client Core Engine V1.0</div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}