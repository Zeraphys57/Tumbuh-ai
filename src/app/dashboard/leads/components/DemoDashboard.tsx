"use client";
import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// --- IMPORT KOMPONEN UI ---
import StatsBoard from "./ui/StatsBoard";
import LeadsTable from "./ui/LeadsTable";
import AITrainer from "./ui/AITrainer";
import RefreshEngine from "./ui/RefreshEngine";
import WeeklyAnalyticsChart from "./ui/WeeklyAnalyticsChart";
import LiveChat from "./ui/LiveChat";
import EmergencyContact from "./ui/EmergencyContact"; 
import RAGTrainer from "./ui/RAGTrainer";

// --- IMPORT KOMPONEN ADD-ON FREEMIUM (MILIK TUMBUH.AI) ---
import AITrainingCopilot from "../addons/AITrainingCopilot"; // Freemium 1
import AISocialProofMiner from "../addons/AISocialProofMiner"; // Freemium 2
import AIPromptOptimizer from "../addons/AIPromptOptimizer"; // THE NEW MAGIC ✨

// --- IMPORT KOMPONEN ADD-ON PREMIUM (MILIK TUMBUH.AI) ---
import AIAnalyst from "../addons/premium/AIAnalyst";
import AIGhostRecovery from "../addons/premium/AIGhostRecovery";
import AIUpsellEngine from "../addons/premium/AIUpsellEngine";
import AILeadScorer from "../addons/premium/AILeadScorer";
import AIMarketOracle from "../addons/premium/AIMarketOracle";       

// THE APEX TRINITY 👑
import AIBlueOceanNavigator from "../addons/premium/AIBlueOceanNavigator"; 
import AIBlackCardArchitect from "../addons/premium/AIBlackCardArchitect";
import AISyndicateEngine from "../addons/premium/AISyndicateEngine";

export default function DemoDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [clientName, setClientName] = useState("");
  
  // STATE UNTUK ADD-ON & KNOWLEDGE
  const [clientFeatures, setClientFeatures] = useState<any>({});
  const [dailyInfo, setDailyInfo] = useState("");
  const [isSavingAddon, setIsSavingAddon] = useState(false); 

  // ========================================================
  // STATE UNTUK KONTAK DARURAT (WA ADMIN)
  // ========================================================
  const [adminPhone, setAdminPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
         setLoading(false);
         return;
      }

      const userMeta = session.user.user_metadata;
      const id = userMeta?.client_id;
      const name = userMeta?.name || "Admin";
      
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
        
        // Tarik features JSON dan masukkan nomor WA Admin (jika sudah ada) ke State
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
          // [FIX]: Pakai teknik SAFE MERGE ({ ...lead, ...payload.new })
          // Biar kolom yang nggak dikirim sama Supabase nggak ikut ilang!
          setLeads((currentLeads) => currentLeads.map(lead => lead.id === payload.new.id ? { ...lead, ...payload.new } : lead));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, supabase, clientId]);

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

  // ========================================================
  // FUNGSI UPDATE NOMOR WA ADMIN
  // ========================================================
  const handleUpdateAdminPhone = async () => {
    if (!clientId) return;
    setIsSavingPhone(true);
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
           <div className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
           <div className="absolute inset-2 border-4 border-fuchsia-500/20 border-t-fuchsia-500 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Initializing Tumbuh AI System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 font-sans text-slate-900">
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl border border-blue-500/50 uppercase text-[10px] font-black italic tracking-widest text-center flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Intelligence Synced!
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Node: <span className="text-blue-600 italic">{clientName}</span></h1>
          <p className="text-slate-400 font-bold mt-1 italic text-[10px] uppercase tracking-[0.3em]">Tumbuh AI • Autonomous Agent Controller</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="bg-white border-2 border-slate-100 text-red-500 px-6 py-3 rounded-2xl font-black hover:bg-red-50 transition-all text-[10px] uppercase italic shadow-sm">Logout Interface</button>
          <RefreshEngine onRefresh={fetchData} loading={loading} />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* KOLOM KIRI: OPERATIONS (8/12) */}
        <div className="lg:col-span-8 space-y-10">
          <StatsBoard totalLeads={leads.length} themeColor="blue" />

          {/* FIX 1: CHART BERDIRI SENDIRI FULL WIDTH */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <WeeklyAnalyticsChart leads={leads} />
          </div>

          {/* FIX 2: COPILOT DI BAWAH CHART */}
          <AITrainingCopilot clientId={clientId} leads={leads} />

          <LeadsTable leads={leads} title="Database Leads Terkini" buttonColor="bg-green-500" />

          {/* FIX 3: TERMINAL CHAT GAYA HACKER (LEBIH ELEGAN UNTUK DEMO) */}
          <div className="mt-12 bg-slate-900 rounded-[3rem] p-2 shadow-2xl overflow-hidden border border-slate-800">
             <div className="px-8 py-5 flex items-center justify-between border-b border-white/10">
                <div>
                   <h2 className="text-white text-lg font-black italic tracking-widest uppercase">Communication Terminal</h2>
                   <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mt-1">Live Neural Network Interaction</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                   <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Live</span>
                </div>
             </div>
             <div className="bg-white rounded-[2.5rem] overflow-hidden">
                <LiveChat />
             </div>
          </div>

          <hr className="border-slate-200 my-16 border-2 border-dashed" />

          {/* REVENUE & INNOVATION SECTION */}
          <div className="mb-8 mt-16">
              <h2 className="text-3xl font-black italic tracking-tight uppercase text-slate-900">Elite Operations</h2>
              <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">C-Level Artificial Intelligence Suite</p>
          </div>

          <div className="space-y-10">
             <AIAnalyst clientId={clientId} leads={leads}/>
             <AIGhostRecovery clientId={clientId} leads={leads} />
             <AIUpsellEngine clientId={clientId} leads={leads} />
             <AILeadScorer clientId={clientId} leads={leads} />
             <AIMarketOracle clientId={clientId} leads={leads} avgTicketSize={250000} />
             
             <AIBlueOceanNavigator clientId={clientId} leads={leads} />
             <AIBlackCardArchitect clientId={clientId} leads={leads} /> 
             <AISyndicateEngine clientId={clientId} leads={leads} />
          </div>
        </div>

        {/* KOLOM KANAN: BRAIN & ADD-ONS (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {clientFeatures?.has_addon && (
            <div className="bg-blue-600 p-10 rounded-[3rem] shadow-2xl text-white h-fit border-4 border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
               <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </div>
                  <h3 className="font-black text-xl italic uppercase tracking-tighter text-white">
                    {clientFeatures?.addon_label || "Knowledge Node"}
                  </h3>
               </div>
               <div className="space-y-6 relative z-10">
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-4 italic">Live Context Updates</p>
                  <textarea 
                    className="w-full h-[180px] bg-white/10 rounded-[2rem] p-6 text-xs font-bold border border-white/10 focus:ring-4 focus:ring-white/20 outline-none transition-all text-white leading-relaxed resize-none italic placeholder-white/40"
                    value={dailyInfo}
                    onChange={(e) => setDailyInfo(e.target.value)}
                    placeholder={clientFeatures?.addon_placeholder || "Ketik info menu hari ini..."}
                  />
                  <button onClick={handleUpdateDailyInfo} disabled={isSavingAddon} className="w-full bg-white text-blue-600 py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-50 transition-all shadow-xl active:scale-95 italic">
                    {isSavingAddon ? "Syncing..." : "Sync Intelligence Now"}
                  </button>
               </div>
            </div>
          )}

          <AIPromptOptimizer currentPrompt={prompt} setPrompt={setPrompt} />

          <AITrainer 
            prompt={prompt} 
            setPrompt={setPrompt} 
            handleUpdatePrompt={handleUpdatePrompt} 
            isSaving={isSaving} 
            setShowToast={setShowToast} 
          />

          <RAGTrainer clientId={clientId} />

          {/* ========================================================
              KOMPONEN KONTAK DARURAT (WA ADMIN) DI SINI
          ======================================================== */}
          <EmergencyContact 
             adminPhone={adminPhone}
             setAdminPhone={setAdminPhone}
             handleUpdateAdminPhone={handleUpdateAdminPhone}
             isSavingPhone={isSavingPhone}
          />

          <AISocialProofMiner clientId={clientId} leads={leads} />

          <div className="bg-white border border-slate-200 p-10 rounded-[3rem] flex flex-col items-center justify-center text-center opacity-70 mt-12 shadow-sm">
             <div className="text-2xl font-black italic tracking-tighter mb-2">TUMBUH<span className="text-blue-600">.AI</span></div>
             <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Demo Environment v2.5</div>
          </div>
          
        </div>
      </div>
    </div>
  );
}